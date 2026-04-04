import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";
import { contratosConAlertaEnMes } from "@/lib/cobranzas/alertas-actualizacion";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { CobranzasClient } from "@/components/cobranzas/cobranzas-client";
import { BannerActualizaciones } from "@/components/cobranzas/banner-actualizaciones";
import type { SelectOption } from "@/components/cobranzas/contrato-form-dialog";

export const metadata: Metadata = {
  title: "Cobranzas",
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
    propiedad: unwrapFk(row.propiedad as { nombre: string; direccion?: string } | { nombre: string; direccion?: string }[] | null),
    inquilino: unwrapFk(row.inquilino as { nombre_completo: string; telefono?: string | null } | { nombre_completo: string; telefono?: string | null }[] | null),
    locador: unwrapFk(row.locador as { nombre_completo: string } | { nombre_completo: string }[] | null),
  };
}

export default async function DashboardCobranzasPage() {
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

  const { data: contratosRaw, error: cErr } = await supabase
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
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono ),
      locador:clientes!contratos_cobranza_locador_id_fkey ( nombre_completo )
    `,
    )
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

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

  const [{ data: propRows }, { data: personasRows, error: personasErr }] = await Promise.all([
    supabase.from("propiedades").select("id, nombre, direccion").eq("is_active", true).order("nombre"),
    supabase
      .from("clientes")
      .select("id, nombre_completo, dni, tipo_cliente, email, telefono")
      .eq("is_active", true)
      .order("nombre_completo"),
  ]);

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

  const propiedades: SelectOption[] =
    propRows?.map((p) => ({
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.direccion as string) || null),
    })) ?? [];

  const personas = personasRows ?? [];
  const clientes: SelectOption[] = personas
    .filter((p) => p.tipo_cliente === "Inquilino" || p.tipo_cliente === "Ambos")
    .map((p) => ({
      id: p.id as string,
      label: optLabel(
        p.nombre_completo as string,
        (p.email as string) || `DNI ${p.dni}` || (p.telefono as string) || null,
      ),
    }));

  const locadores: SelectOption[] = personas
    .filter((p) => p.tipo_cliente === "Propietario" || p.tipo_cliente === "Ambos")
    .map((p) => ({
      id: p.id as string,
      label: optLabel(
        p.nombre_completo as string,
        (p.email as string) || `DNI ${p.dni}` || (p.telefono as string) || null,
      ),
    }));

  const contratosAlerta = contratosConAlertaEnMes(contratos);

  return (
    <div className="flex flex-col gap-6">
      <BannerActualizaciones contratos={contratosAlerta} />
      <CobranzasClient
        contratos={contratos}
        pagosMesActual={pagosMes}
        propiedades={propiedades}
        clientes={clientes}
        locadores={locadores}
      />
    </div>
  );
}
