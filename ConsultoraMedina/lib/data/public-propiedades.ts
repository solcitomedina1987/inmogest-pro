import { createClient } from "@/lib/supabase/server";
import { imagenesOrdenadasPropiedad } from "@/lib/propiedades/imagenes";

export type PublicPropiedadHome = {
  id: string;
  nombre: string;
  valor: number;
  tipo: string;
  estado: string;
  direccion: string;
  dormitorios: number;
  banos: number;
  m2_totales: number;
  m2_cubiertos: number;
  ubicacion_texto: string | null;
  descripcion: string | null;
  /** Primera imagen (orden); misma que `imagenes[0]`. */
  imagen_modal: string;
  /** Galería ordenada; carrusel si hay más de una. */
  imagenes: string[];
  es_destacada: boolean;
};

type ImgRow = { url_imagen: string; orden: number };

/**
 * Todas las propiedades con baja lógica inactiva (is_active = true).
 * El filtrado por tipo y estado se hace en el cliente.
 */
export async function fetchPublicPropiedadesForHome(): Promise<PublicPropiedadHome[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
      descripcion,
      es_destacada,
      propiedades_img ( url_imagen, orden )
    `,
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const r = row as Record<string, unknown> & { propiedades_img?: ImgRow[] | null };
    const imgs = Array.isArray(r.propiedades_img) ? r.propiedades_img : [];
    const imagenes = imagenesOrdenadasPropiedad(imgs);
    return {
      id: r.id as string,
      nombre: r.nombre as string,
      valor: Number(r.valor),
      tipo: r.tipo as string,
      estado: r.estado as string,
      direccion: r.direccion as string,
      dormitorios: Number(r.dormitorios),
      banos: Number(r.banos),
      m2_totales: Number(r.m2_totales),
      m2_cubiertos: Number(r.m2_cubiertos),
      ubicacion_texto: (r.ubicacion_texto as string) ?? null,
      descripcion: (r.descripcion as string) ?? null,
      imagenes,
      imagen_modal: imagenes[0],
      es_destacada: Boolean(r.es_destacada),
    };
  });
}

/** Catálogos activos para filtros del home (requiere política RLS `anon` de lectura). */
export async function fetchCatalogosPropiedadPublic(): Promise<{ tipos: string[]; estados: string[] }> {
  const supabase = await createClient();
  const [tiposR, estadosR] = await Promise.all([
    supabase.from("tipos_propiedad").select("nombre").is("deleted_at", null).order("nombre"),
    supabase.from("estados_propiedad").select("nombre").is("deleted_at", null).order("nombre"),
  ]);
  if (tiposR.error || estadosR.error) {
    return { tipos: [], estados: [] };
  }
  return {
    tipos: (tiposR.data ?? []).map((r) => (r as { nombre: string }).nombre),
    estados: (estadosR.data ?? []).map((r) => (r as { nombre: string }).nombre),
  };
}
