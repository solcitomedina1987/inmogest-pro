/**
 * Conceptos adicionales de cobro (orden alfabético por etiqueta, sin emoji en la clave).
 */
export const CONCEPTOS_PAGO_KEYS = [
  "arreglos",
  "compra_materiales",
  "deposito_garantia",
  "escribania",
  "gas",
  "honorarios_inmobiliarios",
  "honorarios_tecnicos",
  "intereses_mora",
  "luz",
  "otros_servicios",
  "servicios_municipales",
  "otros",
] as const;

export type ConceptoPagoTipo = (typeof CONCEPTOS_PAGO_KEYS)[number];

type Def = { key: ConceptoPagoTipo; label: string; emoji: string };

const DEFS: Def[] = [
  { key: "arreglos", label: "Arreglos", emoji: "🔧" },
  { key: "compra_materiales", label: "Compra de materiales", emoji: "🧱" },
  { key: "deposito_garantia", label: "Depósito de garantía", emoji: "🏠" },
  { key: "escribania", label: "Escribanía", emoji: "🖋️" },
  { key: "gas", label: "Gas", emoji: "🔥" },
  { key: "honorarios_inmobiliarios", label: "Honorarios Inmobiliarios", emoji: "🔑" },
  { key: "honorarios_tecnicos", label: "Honorarios técnicos (plomero/electricista)", emoji: "⚡" },
  { key: "intereses_mora", label: "Intereses por mora", emoji: "⏱️" },
  { key: "luz", label: "Luz", emoji: "💡" },
  { key: "otros_servicios", label: "Otros Servicios", emoji: "🌐" },
  { key: "servicios_municipales", label: "Servicios Municipales / Expensas", emoji: "🏢" },
  { key: "otros", label: "Otros", emoji: "➕" },
];

/** Orden alfabético por etiqueta (español). */
export const CONCEPTOS_PAGO_ORDENADOS: readonly Def[] = [...DEFS].sort((a, b) =>
  a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
);

export function etiquetaConceptoConEmoji(key: ConceptoPagoTipo): string {
  const d = DEFS.find((x) => x.key === key);
  return d ? `${d.emoji} ${d.label}` : key;
}

/** Etiqueta sin emoji (p. ej. informes con icono Lucide aparte). */
export function etiquetaConceptoSinEmoji(key: ConceptoPagoTipo): string {
  const d = DEFS.find((x) => x.key === key);
  return d ? d.label : key;
}

export function esConceptoPagoTipo(s: string): s is ConceptoPagoTipo {
  return (CONCEPTOS_PAGO_KEYS as readonly string[]).includes(s);
}
