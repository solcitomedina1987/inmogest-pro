import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContratosClient } from "@/components/contratos/contratos-client";
import type { ContratoLocacionListRow } from "@/lib/contratos/types";
import type { ClienteSelectOption, PropiedadContratoOption } from "@/components/contratos/contrato-locacion-form-dialog";
import { ESTADO_PROPIEDAD_CARTEL_ALQUILER } from "@/lib/constants/propiedades";

export const metadata: Metadata = {
  title: "Contratos",
};

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function DashboardContratosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    redirect("/dashboard?restringido=1");
  }

  const { data: contratosRaw, error: cErr } = await supabase
    .from("contratos")
    .select(
      `
      id,
      propiedad_id,
      propietario_id,
      cliente_id,
      fecha_firma,
      fecha_inicio_contrato,
      fecha_fin_contrato,
      valor_mensual,
      valor_deposito,
      tipo_ajuste,
      caracteristicas_propiedad,
      datos_garantes,
      estado,
      rescindido_at,
      pdf_storage_path,
      adjunto_storage_path,
      adjunto_mime,
      contratos_cobranza_id,
      dia_limite_pago,
      meses_actualizacion,
      propiedad:propiedades ( direccion ),
      propietario:clientes!contratos_propietario_id_fkey ( nombre_completo, dni ),
      inquilino:clientes!contratos_cliente_id_fkey ( nombre_completo, dni )
    `,
    )
    .order("created_at", { ascending: false });

  if (cErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">No se pudieron cargar los contratos</p>
        <p className="text-muted-foreground mt-1">{cErr.message}</p>
        <p className="text-muted-foreground mt-2">
          Si la tabla aún no existe, ejecutá la migración{" "}
          <code className="rounded bg-muted px-1">20260418120000_contratos_locacion_pdf.sql</code> y creá el bucket{" "}
          <strong>contratos-pdf</strong> en Storage si hace falta.
        </p>
      </div>
    );
  }

  type EmbP = { direccion?: string | null };
  type EmbC = { nombre_completo?: string | null; dni?: number | null };

  const rows: ContratoLocacionListRow[] = (contratosRaw ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const prop = unwrapFk(r.propiedad as EmbP | EmbP[] | null);
    const propietario = unwrapFk(r.propietario as EmbC | EmbC[] | null);
    const inquilino = unwrapFk(r.inquilino as EmbC | EmbC[] | null);
    return {
      id: r.id as string,
      propiedad_id: r.propiedad_id as string,
      propietario_id: r.propietario_id as string,
      cliente_id: r.cliente_id as string,
      fecha_firma: r.fecha_firma as string,
      fecha_inicio_contrato: r.fecha_inicio_contrato as string,
      fecha_fin_contrato: r.fecha_fin_contrato as string,
      valor_mensual: Number(r.valor_mensual),
      valor_deposito:
        r.valor_deposito != null && r.valor_deposito !== ""
          ? Number(r.valor_deposito)
          : null,
      tipo_ajuste: (r.tipo_ajuste as string) ?? "ICL",
      caracteristicas_propiedad: (r.caracteristicas_propiedad as string) ?? "",
      datos_garantes: (r.datos_garantes as string) ?? "",
      estado: (r.estado as string) ?? "VIGENTE",
      rescindido_at: (r.rescindido_at as string | null) ?? null,
      pdf_storage_path: (r.pdf_storage_path as string | null) ?? null,
      adjunto_storage_path: (r.adjunto_storage_path as string | null) ?? null,
      adjunto_mime: (r.adjunto_mime as string | null) ?? null,
      contratos_cobranza_id: (r.contratos_cobranza_id as string | null) ?? null,
      dia_limite_pago: r.dia_limite_pago != null ? Number(r.dia_limite_pago) : null,
      meses_actualizacion: r.meses_actualizacion != null ? Number(r.meses_actualizacion) : null,
      propiedad_direccion: prop?.direccion?.trim() ? (prop.direccion as string) : null,
      propietario_nombre: propietario?.nombre_completo?.trim() ? (propietario.nombre_completo as string) : null,
      propietario_dni: propietario?.dni != null ? Number(propietario.dni) : null,
      inquilino_nombre: inquilino?.nombre_completo?.trim() ? (inquilino.nombre_completo as string) : null,
      inquilino_dni: inquilino?.dni != null ? Number(inquilino.dni) : null,
    };
  });

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
    supabase.from("clientes").select("id, nombre_completo, dni, tipo_cliente, email, telefono").eq("is_active", true),
    supabase.from("contratos_cobranza").select("cliente_id").eq("is_active", true).is("deleted_at", null),
  ]);

  if (propErr || personasErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar datos del formulario</p>
        <p className="text-muted-foreground mt-1">{propErr?.message ?? personasErr?.message}</p>
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

  const propiedadesFormBase: PropiedadContratoOption[] = (propRows ?? []).map((p) => ({
    id: p.id as string,
    label: optLabel(p.nombre as string, (p.direccion as string) || null),
    propietario_id: p.propietario_id as string,
  }));

  const enCartelIds = new Set(propiedadesFormBase.map((p) => p.id));
  const idsFaltantes = [
    ...new Set(
      rows
        .filter((r) => !r.rescindido_at && r.propiedad_id && !enCartelIds.has(r.propiedad_id))
        .map((r) => r.propiedad_id),
    ),
  ];

  let propiedadesForm = propiedadesFormBase;
  if (idsFaltantes.length > 0) {
    const { data: extraPropRows } = await supabase
      .from("propiedades")
      .select("id, nombre, direccion, propietario_id")
      .in("id", idsFaltantes)
      .eq("is_active", true);

    const extras: PropiedadContratoOption[] = (extraPropRows ?? []).map((p) => ({
      id: p.id as string,
      label: optLabel(p.nombre as string, (p.direccion as string) || null),
      propietario_id: p.propietario_id as string,
    }));
    propiedadesForm = [...propiedadesFormBase, ...extras];
  }

  const personas = personasRows ?? [];
  const clientesForm: ClienteSelectOption[] = personas
    .filter((p) => p.tipo_cliente === "Inquilino" || p.tipo_cliente === "Ambos")
    .filter((p) => !clientesConContratoActivo.has(p.id as string))
    .map((p) => ({
      id: p.id as string,
      label: optLabel(
        p.nombre_completo as string,
        (p.email as string) || `DNI ${p.dni}` || (p.telefono as string) || null,
      ),
    }));

  const propietariosFiltro = personas
    .filter((p) => p.tipo_cliente === "Propietario" || p.tipo_cliente === "Ambos")
    .map((p) => ({
      id: p.id as string,
      label: ((p.nombre_completo as string) ?? "").trim() || "—",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  return (
    <ContratosClient
      rows={rows}
      propiedadesForm={propiedadesForm}
      clientesForm={clientesForm}
      propietariosFiltro={propietariosFiltro}
    />
  );
}
