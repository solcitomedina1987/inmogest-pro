import { conceptoRendicionKeyDesdeLinea } from "@/lib/cobranzas/concepto-rendicion-key";
import type {
  ImpactoLineaRendicionV4,
  InformeRendicionPayloadV4,
  LineaRendicionUnidad,
  UnidadRendicionV4,
} from "@/lib/informes/rendicion-types";

export function impactoLineaEffective(row: LineaRendicionUnidad): ImpactoLineaRendicionV4 {
  const fromPayload = row.impacto_linea;
  if (fromPayload === "alquiler" || fromPayload === "propietario_suma" || fromPayload === "propietario_resta") {
    return fromPayload;
  }
  const k = conceptoRendicionKeyDesdeLinea(row);
  if (k === "alquiler") return "alquiler";
  return "propietario_suma";
}

/** Alquiler (primera coincidencia) y el resto en el orden persistido. */
export function partesLineasUnidadV4(u: UnidadRendicionV4): {
  lineaAlquiler: LineaRendicionUnidad | null;
  resto: LineaRendicionUnidad[];
} {
  const idx = u.lineas.findIndex(
    (l) => impactoLineaEffective(l) === "alquiler" || conceptoRendicionKeyDesdeLinea(l) === "alquiler",
  );
  if (idx < 0) return { lineaAlquiler: null, resto: [...u.lineas] };
  return { lineaAlquiler: u.lineas[idx]!, resto: u.lineas.filter((_, i) => i !== idx) };
}

export function debeMostrarLineaComision(payload: InformeRendicionPayloadV4, u: UnidadRendicionV4): boolean {
  return payload.comision_porcentaje > 0 && u.monto_alquiler > 0;
}

/** Texto de la línea de comisión (el monto del alquiler va ya formateado, ej. moneda local). */
export function etiquetaComisionInmobiliaria(comisionPct: number, montoAlquilerFormateado: string): string {
  return `Comisión inmobiliaria (${comisionPct}% sobre alquiler ${montoAlquilerFormateado})`;
}
