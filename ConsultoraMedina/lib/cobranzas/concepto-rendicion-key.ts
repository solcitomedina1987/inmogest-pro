import { CONCEPTOS_PAGO_KEYS, etiquetaConceptoConEmoji, etiquetaConceptoSinEmoji } from "@/lib/cobranzas/conceptos-pago";
import type { ConceptoRendicionKey } from "@/lib/informes/rendicion-types";

export function conceptoRendicionKeyDesdeLinea(line: {
  concepto: string;
  concepto_key?: ConceptoRendicionKey | null;
}): ConceptoRendicionKey {
  if (line.concepto_key != null) return line.concepto_key;
  const t = line.concepto.trim();
  if (t === "Alquiler" || /\bAlquiler\b/i.test(t)) return "alquiler";
  for (const k of CONCEPTOS_PAGO_KEYS) {
    const sin = etiquetaConceptoSinEmoji(k);
    const con = etiquetaConceptoConEmoji(k);
    if (t.includes(sin) || t.includes(con)) return k;
  }
  return "otros";
}
