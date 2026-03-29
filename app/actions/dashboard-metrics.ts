"use server";

import { isStaffRol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";

export type PagoAtrasadoListItem = {
  id: string;
  mes_periodo: string;
  monto_esperado: number;
  inquilino_nombre: string;
};

export type ExecutiveDashboardData = {
  cobrosAtrasados: number;
  ocupacionPct: number;
  vencimientos30: number;
  totalPropiedades: number;
  ultimosAtrasados: PagoAtrasadoListItem[];
};

function hoyISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumarDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) {
    return null;
  }
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Métricas del panel ejecutivo (solo lectura). Pensado para admin/agente.
 */
export async function getExecutiveDashboardData(): Promise<ExecutiveDashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  const rol = perfil?.rol as string | undefined;
  if (!isStaffRol(rol)) {
    return null;
  }

  const mes = mesPeriodoActual();
  const diaCalendario = new Date().getDate();

  const [
    { count: totalPropCount, error: errTotal },
    { count: alquiladasCount, error: errAlq },
    { count: vencCount, error: errVenc },
    { data: contratosActivos, error: errContratos },
    { data: pagosAtrasadosRows, error: errPagosAtrasados },
    { data: pagosMesRows, error: errPagosMes },
    { data: listaPagos, error: errLista },
  ] = await Promise.all([
    supabase.from("propiedades").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("propiedades")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("estado", "Alquilada"),
    supabase
      .from("contratos_cobranza")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("fecha_vencimiento", hoyISO())
      .lte("fecha_vencimiento", sumarDiasISO(30)),
    supabase.from("contratos_cobranza").select("id, dia_limite_pago").eq("is_active", true),
    supabase
      .from("pagos")
      .select("contrato_id, contratos_cobranza ( is_active )")
      .eq("estado", "Atrasado"),
    supabase.from("pagos").select("contrato_id, estado").eq("mes_periodo", mes),
    supabase
      .from("pagos")
      .select(
        `
        id,
        mes_periodo,
        monto_esperado,
        updated_at,
        contratos_cobranza (
          is_active,
          inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo )
        )
      `,
      )
      .eq("estado", "Atrasado")
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  if (
    errTotal ||
    errAlq ||
    errVenc ||
    errContratos ||
    errPagosAtrasados ||
    errPagosMes ||
    errLista
  ) {
    return {
      cobrosAtrasados: 0,
      ocupacionPct: 0,
      vencimientos30: 0,
      totalPropiedades: 0,
      ultimosAtrasados: [],
    };
  }

  const morosos = new Set<string>();
  for (const r of pagosAtrasadosRows ?? []) {
    const row = r as {
      contrato_id: string;
      contratos_cobranza: { is_active: boolean } | { is_active: boolean }[] | null;
    };
    const c = unwrapFk(row.contratos_cobranza);
    if (c && c.is_active === false) {
      continue;
    }
    morosos.add(row.contrato_id);
  }

  const estadoPorContrato = new Map<string, string>();
  for (const r of pagosMesRows ?? []) {
    const row = r as { contrato_id: string; estado: string };
    estadoPorContrato.set(row.contrato_id, row.estado);
  }

  for (const c of contratosActivos ?? []) {
    const row = c as { id: string; dia_limite_pago: number };
    const st = estadoPorContrato.get(row.id);
    if (st === "Pagado") {
      continue;
    }
    if (st === "Atrasado") {
      morosos.add(row.id);
      continue;
    }
    if (diaCalendario > Number(row.dia_limite_pago)) {
      morosos.add(row.id);
    }
  }

  const total = totalPropCount ?? 0;
  const alq = alquiladasCount ?? 0;
  const ocupacionPct = total > 0 ? Math.round((alq / total) * 100) : 0;

  const ultimosAtrasadosRaw = (listaPagos ?? []).filter((raw) => {
    const p = raw as {
      contratos_cobranza: { is_active?: boolean } | { is_active?: boolean }[] | null;
    };
    const c = unwrapFk(p.contratos_cobranza);
    return c?.is_active !== false;
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
    cobrosAtrasados: morosos.size,
    ocupacionPct,
    vencimientos30: vencCount ?? 0,
    totalPropiedades: total,
    ultimosAtrasados,
  };
}
