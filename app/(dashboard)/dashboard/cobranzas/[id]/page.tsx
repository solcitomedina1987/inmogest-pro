import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ensurePagosMensualesExistentes } from "@/lib/cobranzas/sync-pagos-mensuales";
import { ContratoDetalleClient } from "@/components/cobranzas/contrato-detalle-client";

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) {
    return null;
  }
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalizeContratoRow(row: Record<string, unknown>): ContratoCobranzaRow {
  return {
    id: row.id as string,
    propiedad_id: row.propiedad_id as string,
    cliente_id: row.cliente_id as string,
    locador_id: row.locador_id as string,
    fecha_inicio: row.fecha_inicio as string,
    fecha_vencimiento: row.fecha_vencimiento as string,
    monto_mensual: Number(row.monto_mensual),
    dia_limite_pago: Number(row.dia_limite_pago),
    meses_actualizacion: Number(row.meses_actualizacion),
    indice_actualizacion: (row.indice_actualizacion as "IPC" | "ICL") ?? "ICL",
    ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
    is_active: Boolean(row.is_active),
    propiedad: unwrapFk(row.propiedad as { nombre: string } | { nombre: string }[] | null),
    inquilino: unwrapFk(row.inquilino as { nombre_completo: string } | { nombre_completo: string }[] | null),
    locador: unwrapFk(row.locador as { nombre_completo: string } | { nombre_completo: string }[] | null),
  };
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos_cobranza")
    .select("propiedad:propiedades ( nombre )")
    .eq("id", id)
    .maybeSingle();
  const raw = data as { propiedad?: { nombre: string } | { nombre: string }[] } | null;
  const p = raw?.propiedad;
  const nombre = Array.isArray(p) ? p[0]?.nombre : p?.nombre;
  return {
    title: nombre ? `Cobranzas · ${nombre}` : "Contrato de alquiler",
  };
}

export default async function CobranzasContratoDetallePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  const miRol = miPerfil?.rol as string | undefined;
  if (miRol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  const { data: row, error } = await supabase
    .from("contratos_cobranza")
    .select(
      `
      id,
      propiedad_id,
      cliente_id,
      locador_id,
      fecha_inicio,
      fecha_vencimiento,
      monto_mensual,
      dia_limite_pago,
      meses_actualizacion,
      ultima_actualizacion,
      is_active,
      propiedad:propiedades ( nombre ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo ),
      locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const contrato = normalizeContratoRow(row as Record<string, unknown>);

  const sync = await ensurePagosMensualesExistentes(supabase, id);
  if (!sync.ok) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al sincronizar cuotas mensuales</p>
        <p className="text-muted-foreground mt-1">{sync.error}</p>
      </div>
    );
  }

  const { data: pagosRaw, error: pErr } = await supabase
    .from("pagos")
    .select("*")
    .eq("contrato_id", id)
    .order("mes_periodo", { ascending: true });

  if (pErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar pagos</p>
        <p className="text-muted-foreground mt-1">{pErr.message}</p>
      </div>
    );
  }

  const pagos = (pagosRaw ?? []) as PagoRow[];

  return <ContratoDetalleClient contrato={contrato} pagos={pagos} />;
}
