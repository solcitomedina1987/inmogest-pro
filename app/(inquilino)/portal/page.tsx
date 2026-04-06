import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ensurePagosMensualesExistentes } from "@/lib/cobranzas/sync-pagos-mensuales";
import { proximaFechaActualizacionAlquiler } from "@/lib/cobranzas/estado-contrato";
import { calculateRentalIncrease } from "@/lib/indices/calculator";
import type { ContratoWidgetData } from "@/components/portal/contrato-widgets";
import type { TipoIndice } from "@/lib/indices/types";
import { PortalView } from "@/components/portal/portal-view";
import { PortalHeader } from "@/components/portal/portal-header";

export const metadata: Metadata = { title: "Mi Contrato" };

function diffDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / msPerDay);
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function ErrorPage({ title, body }: { title: string; body: string }) {
  return (
    <>
      <PortalHeader />
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{body}</p>
      </div>
    </>
  );
}

export default async function PortalPage() {
  /* ── 1. Verificar sesión (client normal con RLS) ── */
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/portal");
  }

  /* ── 2. Usar service role para datos (bypasa RLS de forma segura) ── */
  const db = createServiceRoleClient();

  /* ── 3. Buscar cliente vinculado por email ── */
  const { data: clienteRaw, error: cliErr } = await db
    .from("clientes")
    .select("id, nombre_completo, email, telefono")
    .ilike("email", user.email!)   // case-insensitive por si difieren mayúsculas
    .maybeSingle();

  if (cliErr || !clienteRaw) {
    return (
      <ErrorPage
        title="Cuenta no encontrada"
        body={`No encontramos un cliente asociado a ${user.email}. Contactá a la consultora para que vinculen tu correo.`}
      />
    );
  }

  /* ── 4. Contrato activo ── */
  const { data: contratoRow, error: conErr } = await db
    .from("contratos_cobranza")
    .select(
      `id, propiedad_id, cliente_id, locador_id, fecha_inicio, fecha_vencimiento,
       monto_mensual, dia_limite_pago, meses_actualizacion, indice_actualizacion,
       ultima_actualizacion, is_active,
       propiedad:propiedades ( nombre, direccion ),
       inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo ),
       locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )`,
    )
    .eq("cliente_id", clienteRaw.id)
    .eq("is_active", true)
    .order("fecha_inicio", { ascending: false })
    .maybeSingle();

  if (conErr || !contratoRow) {
    return (
      <ErrorPage
        title="Sin contrato activo"
        body="No encontramos un contrato activo para tu cuenta. Consultá a la administración si creés que esto es un error."
      />
    );
  }

  const r = contratoRow as Record<string, unknown>;
  const contrato: ContratoCobranzaRow = {
    id: r.id as string,
    propiedad_id: r.propiedad_id as string,
    cliente_id: r.cliente_id as string,
    locador_id: r.locador_id as string,
    fecha_inicio: r.fecha_inicio as string,
    fecha_vencimiento: r.fecha_vencimiento as string,
    monto_mensual: Number(r.monto_mensual),
    dia_limite_pago: Number(r.dia_limite_pago),
    meses_actualizacion: Number(r.meses_actualizacion),
    indice_actualizacion: (r.indice_actualizacion as "IPC" | "ICL") ?? "ICL",
    ultima_actualizacion: (r.ultima_actualizacion as string) ?? null,
    is_active: Boolean(r.is_active),
    propiedad: unwrapFk(r.propiedad as { nombre: string } | { nombre: string }[] | null),
    inquilino: unwrapFk(r.inquilino as { nombre_completo: string } | null),
    locador: unwrapFk(r.locador as { nombre_completo: string } | null),
  };

  /* ── 5. Sincronizar cuotas mensuales (service role para poder insertar) ── */
  await ensurePagosMensualesExistentes(db, contrato.id);

  /* ── 6. Cargar pagos ── */
  const { data: pagosRaw } = await db
    .from("pagos")
    .select("*")
    .eq("contrato_id", contrato.id)
    .order("mes_periodo", { ascending: true });

  const pagos = (pagosRaw ?? []) as PagoRow[];

  /* ── 7. Calcular widgets ── */
  const hoy = new Date();

  const mesesPagados = pagos.filter((p) => p.estado === "Pagado").length;
  const totalMeses = pagos.length;
  const progresoPct = totalMeses > 0 ? Math.round((mesesPagados / totalMeses) * 100) : 0;

  let diasActualizacion: number | null = null;
  if (contrato.meses_actualizacion > 0) {
    const proxima = proximaFechaActualizacionAlquiler(
      contrato.fecha_inicio,
      contrato.fecha_vencimiento,
      contrato.meses_actualizacion,
      contrato.ultima_actualizacion,
      hoy,
    );
    diasActualizacion = proxima ? diffDays(hoy, proxima) : null;
  }

  const fechaVenc = parseLocalDate(contrato.fecha_vencimiento);
  const diasVencimiento = diffDays(hoy, fechaVenc);

  // Widget 2: monto estimado (desde caché historico_indices)
  let montoEstimado: number | null = null;
  let esEstimado = false;
  const contratoParaCalculo = {
    id: contrato.id,
    fecha_inicio: contrato.fecha_inicio,
    fecha_vencimiento: contrato.fecha_vencimiento,
    monto_mensual: contrato.monto_mensual,
    meses_actualizacion: contrato.meses_actualizacion,
    indice_actualizacion: contrato.indice_actualizacion as TipoIndice,
    ultima_actualizacion: contrato.ultima_actualizacion ?? null,
  };
  try {
    const calcResult = await calculateRentalIncrease(db, contratoParaCalculo);
    if (calcResult.ok) {
      montoEstimado = calcResult.monto_sugerido;
      esEstimado = calcResult.es_estimado;
    }
  } catch {
    // Si no hay índices cargados simplemente no mostramos el estimado
  }

  const widgets: ContratoWidgetData = {
    mesesPagados,
    totalMeses,
    progresoPct,
    diasActualizacion,
    montoActual: contrato.monto_mensual,
    montoEstimado,
    esEstimado,
    indice: contrato.indice_actualizacion ?? "ICL",
    diasVencimiento,
  };

  return (
    <>
      <PortalHeader nombreInquilino={clienteRaw.nombre_completo} />
      <PortalView contrato={contrato} pagos={pagos} widgets={widgets} />
    </>
  );
}
