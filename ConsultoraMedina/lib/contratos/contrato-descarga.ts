import { publicStorageObjectUrl } from "@/lib/supabase/public-storage-url";

const BUCKET = "contratos-pdf";

export type ContratoDocumentoStorage = {
  pdf_storage_path: string | null | undefined;
  adjunto_storage_path?: string | null | undefined;
  adjunto_mime?: string | null | undefined;
};

/** URL pública del objeto en el bucket de contratos. */
export function urlContratoStorage(relativePath: string): string {
  return publicStorageObjectUrl(BUCKET, relativePath);
}

/**
 * Prioriza PDF oficial; si no hay, usa adjunto si es PDF; si no, ofrece descarga del adjunto (p. ej. Word).
 */
export function resolveContratoDescarga(doc: ContratoDocumentoStorage): {
  href: string;
  esPdf: boolean;
  etiqueta: string;
} | null {
  const pdf = doc.pdf_storage_path?.trim();
  if (pdf) {
    return { href: urlContratoStorage(pdf), esPdf: true, etiqueta: "Descargar contrato (PDF)" };
  }
  const adj = doc.adjunto_storage_path?.trim();
  const mime = (doc.adjunto_mime ?? "").toLowerCase();
  if (adj && mime.includes("pdf")) {
    return { href: urlContratoStorage(adj), esPdf: true, etiqueta: "Descargar contrato (PDF)" };
  }
  if (adj) {
    return {
      href: urlContratoStorage(adj),
      esPdf: false,
      etiqueta: "Descargar contrato (archivo)",
    };
  }
  return null;
}

/** Mismo comportamiento que {@link resolveContratoDescarga} (nombre usado en UI y portales). */
export const resolveContratoDescargaUrl = resolveContratoDescarga;
