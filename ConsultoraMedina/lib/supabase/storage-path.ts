/** Extrae la ruta del objeto dentro del bucket a partir de la URL pública de Supabase Storage. */
export function storagePathFromPublicUrl(url: string, bucket: string): string | null {
  const needle = `/object/public/${bucket}/`;
  const idx = url.indexOf(needle);
  if (idx === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(idx + needle.length));
}
