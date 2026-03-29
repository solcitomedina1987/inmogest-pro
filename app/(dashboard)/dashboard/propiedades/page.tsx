import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropiedadesTable } from "@/components/propiedades/propiedades-table";
import type { PersonaOption, PropiedadListRow } from "@/components/propiedades/types";
import { primeraImagenPropiedad } from "@/lib/propiedades/imagenes";

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
  if (miRol !== "admin" && miRol !== "agente") {
    redirect("/dashboard?aviso=propiedades_staff");
  }

  const { data: propsRows, error: propsErr } = await supabase
    .from("propiedades")
    .select(
      `
      id,
      nombre,
      valor,
      tipo,
      estado,
      direccion,
      dormitorios,
      banos,
      m2_totales,
      m2_cubiertos,
      ubicacion_texto,
      propietario_id,
      cliente_id,
      propiedades_img ( url_imagen, orden )
    `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: propietariosData, error: propErr } = await supabase
    .from("propietarios")
    .select("id, nombre, email, contacto")
    .order("nombre");

  const { data: clientesData, error: cliErr } = await supabase
    .from("clientes")
    .select("id, nombre, email, contacto")
    .order("nombre");

  const queryError = propsErr?.message ?? propErr?.message ?? cliErr?.message;

  if (queryError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar datos</p>
        <p className="text-muted-foreground mt-1">{queryError}</p>
        <p className="text-muted-foreground mt-2">
          Si acabás de desplegar el proyecto, ejecutá la migración SQL en{" "}
          <code className="rounded bg-muted px-1">supabase/migrations/20250328120000_propiedades_crud.sql</code>.
        </p>
      </div>
    );
  }

  type ImgRow = { url_imagen: string; orden: number };
  type RawProp = Record<string, unknown> & { propiedades_img?: ImgRow[] | null };

  const rowsBase: Omit<PropiedadListRow, "contrato_cobranza_id">[] = (propsRows ?? []).map((r) => {
    const raw = r as RawProp;
    const imgs = Array.isArray(raw.propiedades_img) ? raw.propiedades_img : [];
    return {
      id: raw.id as string,
      nombre: raw.nombre as string,
      valor: Number(raw.valor),
      tipo: raw.tipo as string,
      estado: raw.estado as string,
      direccion: raw.direccion as string,
      dormitorios: Number(raw.dormitorios),
      banos: Number(raw.banos),
      m2_totales: Number(raw.m2_totales),
      m2_cubiertos: Number(raw.m2_cubiertos),
      ubicacion_texto: (raw.ubicacion_texto as string) ?? null,
      propietario_id: raw.propietario_id as string,
      cliente_id: (raw.cliente_id as string) ?? null,
      imagen_principal: primeraImagenPropiedad(imgs),
    };
  });

  const propIds = rowsBase.map((r) => r.id);
  const contratoPorPropiedad = new Map<string, string>();

  if (propIds.length > 0) {
    const { data: contratosRows } = await supabase
      .from("contratos_cobranza")
      .select("id, propiedad_id, created_at")
      .eq("is_active", true)
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

  return (
    <PropiedadesTable
      rows={rows}
      propietarios={(propietariosData ?? []) as PersonaOption[]}
      clientes={(clientesData ?? []) as PersonaOption[]}
    />
  );
}
