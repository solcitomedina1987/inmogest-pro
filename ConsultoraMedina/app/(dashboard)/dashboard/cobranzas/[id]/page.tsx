import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDetallePagoDb } from "@/lib/cobranzas/detalle-pago";
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
    deleted_at: (row.deleted_at as string | null | undefined) ?? null,
    propiedad: unwrapFk(
      row.propiedad as { nombre: string; direccion?: string | null } | { nombre: string; direccion?: string | null }[] | null,
    ),
    inquilino: unwrapFk(
      row.inquilino as
        | { nombre_completo: string; dni?: number | null }
        | { nombre_completo: string; dni?: number | null }[]
        | null,
    ),
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
    title: nombre ? `Alquileres · ${nombre}` : "Contrato de alquiler",
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
      deleted_at,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, dni ),
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

  const pagos: PagoRow[] = (pagosRaw ?? []).map((raw) => {
    const x = raw as Record<string, unknown>;
    const propiedadIdCol = x.propiedad_id as string | null | undefined;
    return {
      id: x.id as string,
      contrato_id: x.contrato_id as string,
      propiedad_id: propiedadIdCol ?? contrato.propiedad_id,
      mes_periodo: x.mes_periodo as string,
      monto_esperado: Number(x.monto_esperado),
      monto_pagado: x.monto_pagado != null ? Number(x.monto_pagado) : null,
      fecha_pago_realizado: (x.fecha_pago_realizado as string | null) ?? null,
      estado: x.estado as PagoRow["estado"],
      forma_pago: (x.forma_pago as string | null) ?? null,
      observaciones: (x.observaciones as string | null) ?? null,
      detalle_pago: parseDetallePagoDb(x.detalle_pago),
      created_at: x.created_at as string | undefined,
    };
  });

  return <ContratoDetalleClient contrato={contrato} pagos={pagos} />;
}
