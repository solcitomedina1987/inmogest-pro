import { createClient } from "@/lib/supabase/server";
import { PROPIEDAD_ESTADOS_PUBLICOS } from "@/lib/constants/public-site";
import { primeraImagenPropiedad } from "@/lib/propiedades/imagenes";

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
  imagen_modal: string;
};

type ImgRow = { url_imagen: string; orden: number };

/**
 * Propiedades activas en cartel para el home público (Server Component / RSC).
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
      propiedades_img ( url_imagen, orden )
    `,
    )
    .eq("is_active", true)
    .in("estado", [...PROPIEDAD_ESTADOS_PUBLICOS])
    .order("created_at", { ascending: false })
    .limit(120);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const r = row as Record<string, unknown> & { propiedades_img?: ImgRow[] | null };
    const imgs = Array.isArray(r.propiedades_img) ? r.propiedades_img : [];
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
      imagen_modal: primeraImagenPropiedad(imgs),
    };
  });
}
