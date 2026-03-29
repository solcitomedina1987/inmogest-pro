import { PROPIEDAD_IMAGEN_DEFAULT } from "@/lib/constants/propiedades";

const LEGACY_PLACEHOLDER_PREFIXES = ["https://placehold.co/"];

/**
 * Normaliza una URL de imagen de propiedad: vacío o placeholders antiguos → imagen local por defecto.
 */
export function resolvePropiedadImageUrl(url: string | null | undefined): string {
  const u = url?.trim();
  if (!u) {
    return PROPIEDAD_IMAGEN_DEFAULT;
  }
  if (LEGACY_PLACEHOLDER_PREFIXES.some((p) => u.startsWith(p))) {
    return PROPIEDAD_IMAGEN_DEFAULT;
  }
  return u;
}

export type FilaImagenPropiedad = {
  url_imagen: string;
  orden: number;
};

/** Todas las URLs según `orden` (normalizadas); sin filas → solo imagen por defecto. */
export function imagenesOrdenadasPropiedad(
  filas: readonly FilaImagenPropiedad[] | null | undefined,
): string[] {
  if (!filas?.length) {
    return [PROPIEDAD_IMAGEN_DEFAULT];
  }
  const sorted = [...filas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const urls = sorted.map((f) => resolvePropiedadImageUrl(f.url_imagen));
  return urls.length ? urls : [PROPIEDAD_IMAGEN_DEFAULT];
}

/** Primera imagen según `orden`, o la imagen por defecto si no hay filas. */
export function primeraImagenPropiedad(
  filas: readonly FilaImagenPropiedad[] | null | undefined,
): string {
  return imagenesOrdenadasPropiedad(filas)[0];
}
