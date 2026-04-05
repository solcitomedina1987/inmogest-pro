import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ensurePagosMensualesExistentes } from "@/lib/cobranzas/sync-pagos-mensuales";
import { proximaFechaActualizacionAlquiler } from "@/lib/cobranzas/estado-contrato";
import type { ContratoWidgetData } from "@/components/portal/contrato-widgets";
import { PortalView } from "@/components/portal/portal-view";

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

export default async function PortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/portal");
  }

  /* ── Buscar el cliente vinculado a este usuario por email ── */
  const { data: clienteRaw } = await supabase
    .from("clientes")
    .select("id, nombre_completo, email, telefono")
    .eq("email", user.email!)
    .maybeSingle();

  if (!clienteRaw) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h2 className="text-xl font-semibold">Cuenta no encontrada</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          No encontramos un cliente asociado a tu cuenta ({user.email}).
          Contactá a la consultora para que vinculen tu dirección de correo.
        </p>
      </div>
    );
  }

  /* ── Contrato activo ── */
  const { data: contratoRow } = await supabase
    .from("contratos_cobranza")
    .select(
      `id, propiedad_id, cliente_id, locador_id, fecha_inicio, fecha_vencimiento,
       monto_mensual, dia_limite_pago, meses_actualizacion, indice_actualizacion,
       ultima_actualizacion, is_active,
       propiedad:propiedades ( nombre ),
       inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo ),
       locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )`,
    )
    .eq("cliente_id", clienteRaw.id)
    .eq("is_active", true)
    .order("fecha_inicio", { ascending: false })
    .maybeSingle();

  if (!contratoRow) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h2 className="text-xl font-semibold">Sin contrato activo</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          No encontramos un contrato activo para tu cuenta.
          Consultá a la administración si creés que esto es un error.
        </p>
      </div>
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

  /* ── Sincronizar cuotas mensuales ── */
  await ensurePagosMensualesExistentes(supabase, contrato.id);

  /* ── Cargar pagos ── */
  const { data: pagosRaw } = await supabase
    .from("pagos")
    .select("*")
    .eq("contrato_id", contrato.id)
    .order("mes_periodo", { ascending: true });

  const pagos = (pagosRaw ?? []) as PagoRow[];

  /* ── Calcular widgets ── */
  const hoy = new Date();

  // Widget 1: progreso
  const mesesPagados = pagos.filter((p) => p.estado === "Pagado").length;
  const totalMeses = pagos.length;
  const progresoPct = totalMeses > 0 ? Math.round((mesesPagados / totalMeses) * 100) : 0;

  // Widget 2: próxima actualización
  let diasActualizacion: number | null = null;
  if (contrato.meses_actualizacion && contrato.meses_actualizacion > 0) {
    const proxima = proximaFechaActualizacionAlquiler(
      contrato.fecha_inicio,
      contrato.fecha_vencimiento,
      contrato.meses_actualizacion,
      contrato.ultima_actualizacion,
      hoy,
    );
    diasActualizacion = proxima ? diffDays(hoy, proxima) : null;
  }

  // Widget 3: vencimiento
  const fechaVenc = parseLocalDate(contrato.fecha_vencimiento);
  const diasVencimiento = diffDays(hoy, fechaVenc);

  const widgets: ContratoWidgetData = {
    mesesPagados,
    totalMeses,
    progresoPct,
    diasActualizacion,
    diasVencimiento,
  };

  return <PortalView contrato={contrato} pagos={pagos} widgets={widgets} />;
}
