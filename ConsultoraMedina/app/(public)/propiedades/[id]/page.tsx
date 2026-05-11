import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/branding";
import { PropiedadPreviewContent } from "@/components/propiedades/propiedad-preview-content";
import { imagenesOrdenadasPropiedad } from "@/lib/propiedades/imagenes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("propiedades").select("nombre").eq("id", id).eq("is_active", true).maybeSingle();
  const nombre = data?.nombre as string | undefined;
  return {
    title: nombre ?? "Propiedad",
    description: nombre ? `${nombre} — ${BRAND_NAME}. ${BRAND_TAGLINE}` : BRAND_TAGLINE,
  };
}

type ImgRow = { url_imagen: string; orden: number };

export default async function PropiedadPublicaPage({ params }: Props) {
  const { id } = await params;
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
      is_active,
      propiedades_img ( url_imagen, orden )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = data as Record<string, unknown> & { propiedades_img?: ImgRow[] | null };
  if (!row.is_active) {
    notFound();
  }

  const imgs = Array.isArray(row.propiedades_img) ? row.propiedades_img : [];
  const imageUrls = imagenesOrdenadasPropiedad(imgs);

  return (
    <main className="min-h-screen bg-stone-100 py-8 sm:py-12">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-md sm:rounded-3xl">
        <PropiedadPreviewContent
          data={{
            nombre: row.nombre as string,
            tipo: row.tipo as string,
            estado: row.estado as string,
            valor: Number(row.valor),
            dormitorios: Number(row.dormitorios),
            banos: Number(row.banos),
            m2_totales: Number(row.m2_totales),
            m2_cubiertos: Number(row.m2_cubiertos),
            direccion: row.direccion as string,
            ubicacion_texto: (row.ubicacion_texto as string) ?? null,
            descripcion: (row.descripcion as string) ?? null,
            imageUrls,
          }}
        />
      </article>
    </main>
  );
}
