"use server";

import { createClient } from "@/lib/supabase/server";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";
import { mesProximaActualizacion } from "@/lib/cobranzas/alertas-actualizacion";

export type PagoAtrasadoListItem = {
  id: string;
  mes_periodo: string;
  monto_esperado: number;
  inquilino_nombre: string;
};

export type ExecutiveDashboardData = {
  // Widget 1 — Próximos vencimientos
  vencimientosEsteMes: number;
  vencimientosProximoMes: number;
  vencimientosSubsiguiente: number;
  // Widget 2 — Actualizaciones de precio (mes actual + 2 siguientes)
  actualizacionesEsteMes: number;
  actualizacionesProximoMes: number;
  actualizacionesSubsiguiente: number;
  // Widget 3 — Cobros pendientes
  cobrosPendientes: number;
  morosidadPct: number;
  totalContratosActivos: number;
  // Widget 4 — Propiedades + ocupación (unificado)
  totalPropiedades: number;
  ocupacionPct: number;
  alquiladasCount: number;
  // Lista de pagos atrasados (panel de atención)
  ultimosAtrasados: PagoAtrasadoListItem[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Rango del mes con offset 0=actual, 1=próximo, 2=subsiguiente. */
function mesRango(offset: number): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** YYYY-MM del mes con offset 0 = actual, 1 = próximo, etc. */
function mesYYYYMM(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Acción ────────────────────────────────────────────────────────────────────

export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  const rol = perfil?.rol as string | undefined;
  if (rol !== "admin" && rol !== "cliente") return null;

  const mes = mesPeriodoActual();
  const m0 = mesRango(0);
  const m1 = mesRango(1);
  const m2 = mesRango(2);

  const [
    { count: totalPropCount },
    { count: alquiladasCount },
    // Vencimientos por mes
    { count: vencM0 },
    { count: vencM1 },
    { count: vencM2 },
    // Contratos activos completos (para cobros pendientes)
    { data: contratosActivos },
    // Pagos del mes actual
    { data: pagosMesRows },
    // Lista de pagos atrasados para la tabla
    { data: listaPagos },
  ] = await Promise.all([
    supabase
      .from("propiedades")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("propiedades")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("estado", "Alquilada"),
    // Contratos activos cuyo vencimiento cae en el mes actual
    supabase
      .from("contratos_cobranza")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("fecha_vencimiento", m0.start)
      .lte("fecha_vencimiento", m0.end),
    supabase
      .from("contratos_cobranza")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("fecha_vencimiento", m1.start)
      .lte("fecha_vencimiento", m1.end),
    supabase
      .from("contratos_cobranza")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("fecha_vencimiento", m2.start)
      .lte("fecha_vencimiento", m2.end),
    supabase
      .from("contratos_cobranza")
      .select("id, dia_limite_pago, fecha_inicio, meses_actualizacion, ultima_actualizacion")
      .eq("is_active", true),
    supabase
      .from("pagos")
      .select("contrato_id, estado")
      .eq("mes_periodo", mes),
    supabase
      .from("pagos")
      .select(
        `id, mes_periodo, monto_esperado, updated_at,
         contratos_cobranza (
           is_active,
           inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo )
         )`,
      )
      .eq("estado", "Atrasado")
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  // ── Widget 2: Cobros pendientes ───────────────────────────────────────────
  // Contratos activos cuyo pago del mes actual NO está marcado como "Pagado"
  const totalActivos = contratosActivos?.length ?? 0;
  const diaActual = new Date().getDate();

  const pagadosEsteMes = new Set<string>();
  for (const r of pagosMesRows ?? []) {
    const row = r as { contrato_id: string; estado: string };
    if (row.estado === "Pagado") pagadosEsteMes.add(row.contrato_id);
  }

  // Consideramos "pendiente" a todo contrato activo que:
  //   a) no tiene pago registrado este mes, o
  //   b) tiene pago pero no está en estado "Pagado"
  let cobrosPendientes = 0;
  for (const c of contratosActivos ?? []) {
    const row = c as { id: string; dia_limite_pago: number };
    if (!pagadosEsteMes.has(row.id)) {
      // Solo contar como pendiente si ya pasó el día límite o si directamente no está pagado
      if (diaActual >= Number(row.dia_limite_pago) || pagosMesRows?.some(
        (p) => (p as { contrato_id: string }).contrato_id === row.id,
      )) {
        cobrosPendientes += 1;
      }
    }
  }
  const morosidadPct =
    totalActivos > 0 ? Math.round((cobrosPendientes / totalActivos) * 100) : 0;

  // ── Actualizaciones de precio (próximo mes de ajuste = este, +1, +2) ───────
  const actK0 = mesYYYYMM(0);
  const actK1 = mesYYYYMM(1);
  const actK2 = mesYYYYMM(2);
  let actualizacionesEsteMes = 0;
  let actualizacionesProximoMes = 0;
  let actualizacionesSubsiguiente = 0;
  for (const c of contratosActivos ?? []) {
    const row = c as {
      fecha_inicio: string;
      meses_actualizacion: number;
      ultima_actualizacion: string | null;
    };
    const prox = mesProximaActualizacion(
      row.fecha_inicio,
      Number(row.meses_actualizacion),
      row.ultima_actualizacion,
    );
    if (prox === actK0) actualizacionesEsteMes += 1;
    else if (prox === actK1) actualizacionesProximoMes += 1;
    else if (prox === actK2) actualizacionesSubsiguiente += 1;
  }

  // ── Propiedades y ocupación ───────────────────────────────────────────────
  const total = totalPropCount ?? 0;
  const alq = alquiladasCount ?? 0;
  const ocupacionPct = total > 0 ? Math.round((alq / total) * 100) : 0;

  // ── Lista de atrasados ────────────────────────────────────────────────────
  const ultimosAtrasadosRaw = (listaPagos ?? []).filter((raw) => {
    const p = raw as { contratos_cobranza: { is_active?: boolean } | null };
    const cc = unwrapFk(p.contratos_cobranza);
    return cc?.is_active !== false;
  });

  const ultimosAtrasados: PagoAtrasadoListItem[] = ultimosAtrasadosRaw.slice(0, 5).map((raw) => {
    const p = raw as {
      id: string;
      mes_periodo: string;
      monto_esperado: number;
      contratos_cobranza: {
        is_active?: boolean;
        inquilino?: { nombre_completo?: string } | { nombre_completo?: string }[] | null;
      } | null;
    };
    const cc = unwrapFk(p.contratos_cobranza);
    const inq = unwrapFk(cc?.inquilino ?? null);
    return {
      id: p.id,
      mes_periodo: p.mes_periodo,
      monto_esperado: Number(p.monto_esperado),
      inquilino_nombre: inq?.nombre_completo?.trim() || "—",
    };
  });

  return {
    vencimientosEsteMes: vencM0 ?? 0,
    vencimientosProximoMes: vencM1 ?? 0,
    vencimientosSubsiguiente: vencM2 ?? 0,
    actualizacionesEsteMes,
    actualizacionesProximoMes,
    actualizacionesSubsiguiente,
    cobrosPendientes,
    morosidadPct,
    totalContratosActivos: totalActivos,
    totalPropiedades: total,
    ocupacionPct,
    alquiladasCount: alq,
    ultimosAtrasados,
  };
}
