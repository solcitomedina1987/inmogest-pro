/** URL pública de un objeto en un bucket público de Supabase Storage. */
export function publicStorageObjectUrl(bucket: string, objectPath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const path = objectPath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
