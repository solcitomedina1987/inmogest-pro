import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { CobranzasClient } from "@/components/cobranzas/cobranzas-client";
import type { PropiedadSelectContrato, SelectOption } from "@/components/cobranzas/contrato-form-dialog";
import { ESTADO_PROPIEDAD_CARTEL_ALQUILER } from "@/lib/constants/propiedades";
import { isCalculatorConfigured } from "@/lib/services/calculator";
import { getExecutiveDashboardData } from "@/app/actions/dashboard-metrics";

export const metadata: Metadata = {
  title: "Alquileres",
};

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
    propiedad: unwrapFk(row.propiedad as { nombre: string; direccion?: string } | { nombre: string; direccion?: string }[] | null),
    inquilino: unwrapFk(row.inquilino as { nombre_completo: string; telefono?: string | null } | { nombre_completo: string; telefono?: string | null }[] | null),
    locador: unwrapFk(row.locador as { nombre_completo: string } | { nombre_completo: string }[] | null),
  };
}

type PageProps = { searchParams: Promise<{ eliminados?: string }> };

export default async function DashboardCobranzasPage({ searchParams }: PageProps) {
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

  const sp = await searchParams;
  const incluirEliminados = sp.eliminados === "1";

  let queryContratos = supabase
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
      indice_actualizacion,
      ultima_actualizacion,
      is_active,
      deleted_at,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono ),
      locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )
    `,
    )
    .order("deleted_at", { ascending: true, nullsFirst: true })
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (!incluirEliminados) {
    queryContratos = queryContratos.is("deleted_at", null);
  }

  const { data: contratosRaw, error: cErr } = await queryContratos;

  const mes = mesPeriodoActual();
  const contratos = (contratosRaw ?? []).map((r) => normalizeContratoRow(r as Record<string, unknown>));
  const ids = contratos.map((c) => c.id);

  let pagosMes: PagoRow[] = [];
  if (ids.length > 0) {
    const { data: pagosData, error: pErr } = await supabase
      .from("pagos")
      .select("*")
      .eq("mes_periodo", mes)
      .in("contrato_id", ids);

    if (pErr) {
      return (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Error al cargar pagos</p>
          <p className="text-muted-foreground mt-1">{pErr.message}</p>
        </div>
      );
    }
    pagosMes = (pagosData ?? []) as PagoRow[];
  }

  if (cErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar contratos</p>
        <p className="text-muted-foreground mt-1">{cErr.message}</p>
        <p className="text-muted-foreground mt-2">
          Ejecutá la migración{" "}
          <code className="rounded bg-muted px-1">supabase/migrations/20250328200000_cobranzas_contratos_pagos.sql</code>
        </p>
      </div>
    );
  }

  const [
    { data: propRows, error: propErr },
    { data: personasRows, error: personasErr },
    { data: contratosActivosRows },
  ] = await Promise.all([
    supabase
      .from("propiedades")
      .select(
        "id, nombre, direccion, propietario_id, estado, propietario:clientes!propiedades_propietario_id_fkey ( nombre_completo )",
      )
      .eq("is_active", true)
      .eq("estado", ESTADO_PROPIEDAD_CARTEL_ALQUILER)
      .order("nombre"),
    supabase
      .from("clientes")
      .select("id, nombre_completo, dni, tipo_cliente, email, telefono")
      .eq("is_active", true)
      .order("nombre_completo"),
    supabase.from("contratos_cobranza").select("cliente_id").eq("is_active", true).is("deleted_at", null),
  ]);

  if (propErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar propiedades</p>
        <p className="text-muted-foreground mt-1">{propErr.message}</p>
      </div>
    );
  }

  if (personasErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar clientes</p>
        <p className="text-muted-foreground mt-1">{personasErr.message}</p>
      </div>
    );
  }

  function optLabel(nombre: string, extra?: string | null) {
    const e = extra?.trim();
    return e ? `${nombre} · ${e}` : nombre;
  }

  const clientesConContratoActivo = new Set(
    (contratosActivosRows ?? []).map((r) => r.cliente_id as string).filter(Boolean),
  );

  const propiedades: PropiedadSelectContrato[] = (propRows ?? []).map((p) => {
    const propietarioEmb = unwrapFk(
      (p as { propietario?: { nombre_completo: string } | { nombre_completo: string }[] | null }).propietario,
    );
    return {
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.direccion as string) || null),
      propietario_id: p.propietario_id as string,
      propietarioNombre: propietarioEmb?.nombre_completo?.trim() || "—",
    };
  });

  const widgetsData = await getExecutiveDashboardData();

  const personas = personasRows ?? [];

  const propietariosFiltro = personas
    .filter((p) => p.tipo_cliente === "Propietario" || p.tipo_cliente === "Ambos")
    .map((p) => ({
      id: p.id as string,
      label: ((p.nombre_completo as string) ?? "").trim() || "—",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  const clientes: SelectOption[] = personas
    .filter((p) => p.tipo_cliente === "Inquilino" || p.tipo_cliente === "Ambos")
    .filter((p) => !clientesConContratoActivo.has(p.id as string))
    .map((p) => ({
      id: p.id as string,
      label: optLabel(
        p.nombre_completo as string,
        (p.email as string) || `DNI ${p.dni}` || (p.telefono as string) || null,
      ),
    }));

  return (
    <div className="flex flex-col gap-6">
      <CobranzasClient
        contratos={contratos}
        pagosMesActual={pagosMes}
        propiedades={propiedades}
        clientes={clientes}
        propietariosFiltro={propietariosFiltro}
        mesPeriodoReferencia={mes}
        calculatorConfigured={isCalculatorConfigured()}
        widgetsData={widgetsData}
        incluirEliminados={incluirEliminados}
      />
    </div>
  );
}
