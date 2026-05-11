import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_PROPIEDAD_VALUES, TIPO_PROPIEDAD_VALUES } from "@/lib/constants/propiedades";
import { PropiedadesTable } from "@/components/propiedades/propiedades-table";
import type { PersonaOption, PropiedadListRow } from "@/components/propiedades/types";
import { primeraImagenPropiedad } from "@/lib/propiedades/imagenes";
import { ExecutiveDashboardPanel } from "@/components/dashboard/executive-dashboard-panel";
import { ExecutiveDashboardSkeleton } from "@/components/dashboard/executive-dashboard-skeleton";

export const metadata: Metadata = {
  title: "Propiedades",
};

export default async function DashboardPropiedadesPage() {
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

  const [propsRes, personasRes, tiposRes, estadosRes] = await Promise.all([
    supabase
      .from("propiedades")
      .select(
        `
      id,
      nombre,
      valor,
      tipo,
      estado,
      direccion,
      ciudad,
      provincia,
      dormitorios,
      banos,
      m2_totales,
      m2_cubiertos,
      ubicacion_texto,
      propietario_id,
      cliente_id,
      es_destacada,
      propiedades_img ( url_imagen, orden ),
      cliente_inquilino:clientes!propiedades_cliente_id_fkey ( nombre_completo, telefono )
    `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nombre_completo, dni, tipo_cliente, email, telefono")
      .eq("is_active", true)
      .order("nombre_completo"),
    supabase.from("tipos_propiedad").select("nombre").is("deleted_at", null).order("nombre"),
    supabase.from("estados_propiedad").select("nombre").is("deleted_at", null).order("nombre"),
  ]);

  const propsRows = propsRes.data;
  const propsErr = propsRes.error;
  const personasData = personasRes.data;
  const personasErr = personasRes.error;

  const tiposCatalogo =
    !tiposRes.error && (tiposRes.data?.length ?? 0) > 0
      ? (tiposRes.data ?? []).map((r: { nombre: string }) => r.nombre)
      : [...TIPO_PROPIEDAD_VALUES];
  const estadosCatalogo =
    !estadosRes.error && (estadosRes.data?.length ?? 0) > 0
      ? (estadosRes.data ?? []).map((r: { nombre: string }) => r.nombre)
      : [...ESTADO_PROPIEDAD_VALUES];

  const queryError = propsErr?.message ?? personasErr?.message;

  if (queryError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar datos</p>
        <p className="text-muted-foreground mt-1">{queryError}</p>
        <p className="text-muted-foreground mt-2">
          Si acabás de desplegar el proyecto, ejecutá las migraciones en{" "}
          <code className="rounded bg-muted px-1">supabase/migrations/</code> (propiedades y clientes unificados).
        </p>
      </div>
    );
  }

  type ImgRow = { url_imagen: string; orden: number };
  type InquilinoEmb = { nombre_completo: string; telefono: string | null };
  type RawProp = Record<string, unknown> & {
    propiedades_img?: ImgRow[] | null;
    cliente_inquilino?: InquilinoEmb | InquilinoEmb[] | null;
  };

  function unwrapInquilino(v: RawProp["cliente_inquilino"]): InquilinoEmb | null {
    if (v == null) {
      return null;
    }
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const rowsBase: Omit<PropiedadListRow, "contrato_cobranza_id">[] = (propsRows ?? []).map((r) => {
    const raw = r as RawProp;
    const imgs = Array.isArray(raw.propiedades_img) ? raw.propiedades_img : [];
    const inq = unwrapInquilino(raw.cliente_inquilino);
    return {
      id: raw.id as string,
      nombre: raw.nombre as string,
      valor: Number(raw.valor),
      tipo: raw.tipo as string,
      estado: raw.estado as string,
      direccion: raw.direccion as string,
      ciudad: (raw.ciudad as string | null) ?? null,
      provincia: (raw.provincia as string | null) ?? null,
      dormitorios: Number(raw.dormitorios),
      banos: Number(raw.banos),
      m2_totales: Number(raw.m2_totales),
      m2_cubiertos: Number(raw.m2_cubiertos),
      ubicacion_texto: (raw.ubicacion_texto as string) ?? null,
      propietario_id: raw.propietario_id as string,
      cliente_id: (raw.cliente_id as string) ?? null,
      imagen_principal: primeraImagenPropiedad(imgs),
      inquilino_nombre: inq?.nombre_completo?.trim() ? inq.nombre_completo.trim() : null,
      inquilino_telefono: inq?.telefono?.trim() ? inq.telefono.trim() : null,
      es_destacada: Boolean(raw.es_destacada),
    };
  });

  const propIds = rowsBase.map((r) => r.id);
  const contratoPorPropiedad = new Map<string, string>();

  if (propIds.length > 0) {
    const { data: contratosRows } = await supabase
      .from("contratos_cobranza")
      .select("id, propiedad_id, created_at")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("propiedad_id", propIds)
      .order("created_at", { ascending: false });

    for (const c of contratosRows ?? []) {
      const pid = (c as { propiedad_id: string }).propiedad_id;
      const cid = (c as { id: string }).id;
      if (!contratoPorPropiedad.has(pid)) {
        contratoPorPropiedad.set(pid, cid);
      }
    }
  }

  const rows: PropiedadListRow[] = rowsBase.map((r) => ({
    ...r,
    contrato_cobranza_id: contratoPorPropiedad.get(r.id) ?? null,
  }));

  const todas: PersonaOption[] = (personasData ?? []).map((r) => ({
    id: r.id as string,
    nombre_completo: r.nombre_completo as string,
    dni: Number(r.dni),
    tipo_cliente: r.tipo_cliente as PersonaOption["tipo_cliente"],
    email: (r.email as string) ?? null,
    telefono: (r.telefono as string) ?? null,
  }));
  const propietariosOpts = todas.filter((p) => p.tipo_cliente === "Propietario" || p.tipo_cliente === "Ambos");

  return (
    <PropiedadesTable
      rows={rows}
      propietarios={propietariosOpts}
      tiposCatalogo={tiposCatalogo}
      estadosCatalogo={estadosCatalogo}
    >
      <Suspense fallback={<ExecutiveDashboardSkeleton />}>
        <ExecutiveDashboardPanel />
      </Suspense>
    </PropiedadesTable>
  );
}
