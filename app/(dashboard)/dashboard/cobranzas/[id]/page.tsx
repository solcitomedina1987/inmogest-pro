import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { ContratoDetalleClient } from "@/components/cobranzas/contrato-detalle-client";

function unwrapFk<T extends { nombre?: string }>(v: T | T[] | null | undefined): T | null {
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
    ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
    is_active: Boolean(row.is_active),
    propiedad: unwrapFk(row.propiedad as { nombre: string } | { nombre: string }[] | null),
    inquilino: unwrapFk(row.inquilino as { nombre: string } | { nombre: string }[] | null),
    locador: unwrapFk(row.locador as { nombre: string } | { nombre: string }[] | null),
  };
}

type PageProps = { params: Promise<{ id: string }> };

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
  if (miRol !== "admin" && miRol !== "agente") {
    redirect("/dashboard?aviso=cobranzas_staff");
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
      inquilino:clientes ( nombre ),
      locador:propietarios ( nombre )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const contrato = normalizeContratoRow(row as Record<string, unknown>);

  const { data: pagosRaw, error: pErr } = await supabase
    .from("pagos")
    .select("*")
    .eq("contrato_id", id)
    .order("mes_periodo", { ascending: false })
    .order("created_at", { ascending: false });

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
