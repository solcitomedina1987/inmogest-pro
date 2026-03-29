import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { CobranzasClient } from "@/components/cobranzas/cobranzas-client";
import type { SelectOption } from "@/components/cobranzas/contrato-form-dialog";

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
  if (miRol !== "admin" && miRol !== "agente") {
    redirect("/dashboard?aviso=cobranzas_staff");
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
      ultima_actualizacion,
      is_active,
      propiedad:propiedades ( nombre ),
      inquilino:clientes ( nombre ),
      locador:propietarios ( nombre )
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

  const { data: propRows } = await supabase
    .from("propiedades")
    .select("id, nombre, direccion")
    .eq("is_active", true)
    .order("nombre");

  const { data: cliRows } = await supabase
    .from("clientes")
    .select("id, nombre, email, contacto")
    .order("nombre");

  const { data: locRows } = await supabase
    .from("propietarios")
    .select("id, nombre, email, contacto")
    .order("nombre");

  function optLabel(nombre: string, extra?: string | null) {
    const e = extra?.trim();
    return e ? `${nombre} · ${e}` : nombre;
  }

  const propiedades: SelectOption[] =
    propRows?.map((p) => ({
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.direccion as string) || null),
    })) ?? [];

  const clientes: SelectOption[] =
    cliRows?.map((p) => ({
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.email as string) || (p.contacto as string) || null),
    })) ?? [];

  const locadores: SelectOption[] =
    locRows?.map((p) => ({
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.email as string) || (p.contacto as string) || null),
    })) ?? [];

  return (
    <CobranzasClient
      contratos={contratos}
      pagosMesActual={pagosMes}
      propiedades={propiedades}
      clientes={clientes}
      locadores={locadores}
    />
  );
}
