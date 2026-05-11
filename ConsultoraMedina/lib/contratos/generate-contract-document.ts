import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { ContratoLocacionPdfDocument } from "@/components/contratos/contrato-locacion-pdf-document";
import type { ContratoLocacionPdfData } from "@/lib/contratos/contract-pdf-data";

/**
 * Genera el PDF del contrato de locación (react-pdf).
 * Pensado para ejecutarse en Node (Server Action).
 */
export async function generateContractDocument(data: ContratoLocacionPdfData): Promise<Buffer> {
  const doc = pdf(createElement(ContratoLocacionPdfDocument, { data }));
  const out = await doc.toBlob();
  const ab = await out.arrayBuffer();
  return Buffer.from(ab);
}
