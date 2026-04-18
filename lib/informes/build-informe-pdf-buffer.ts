import { createElement } from "react";
import fs from "node:fs";
import path from "node:path";
import { pdf } from "@react-pdf/renderer";
import { InformeRendicionPdfDocument } from "@/components/informes/informe-rendicion-pdf-document";
import type { InformeRendicionPayload } from "@/lib/informes/rendicion-types";
import { BRAND_LOGO_SRC } from "@/lib/constants/branding";

function readBrandLogoDataUri(): string | undefined {
  try {
    const rel = BRAND_LOGO_SRC.replace(/^\//, "");
    const full = path.join(process.cwd(), "public", rel);
    if (!fs.existsSync(full)) return undefined;
    const ext = path.extname(full).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    const buf = fs.readFileSync(full);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export type BuildInformePdfOptions = {
  fechaGeneracion?: string | null;
};

export async function buildInformeRendicionPdfBuffer(
  payload: InformeRendicionPayload,
  options?: BuildInformePdfOptions,
): Promise<Buffer> {
  const logoDataUri = readBrandLogoDataUri();
  const doc = pdf(
    createElement(InformeRendicionPdfDocument, {
      payload,
      fechaGeneracion: options?.fechaGeneracion,
      logoDataUri: logoDataUri ?? null,
    }),
  );
  const blob = await doc.toBlob();
  const ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}
