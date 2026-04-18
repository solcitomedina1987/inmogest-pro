import type {
  InformeRendicionPayload,
  InformeRendicionPayloadV1,
  InformeRendicionPayloadV2,
} from "@/lib/informes/rendicion-types";

function parseV1(p: Record<string, unknown>): InformeRendicionPayloadV1 | null {
  if (typeof p.propietario_nombre !== "string" || typeof p.mes_periodo !== "string") return null;
  if (typeof p.comision_porcentaje !== "number") return null;
  if (!Array.isArray(p.alquileres) || !Array.isArray(p.otros_conceptos)) return null;
  if (
    typeof p.subtotal_ingresos !== "number" ||
    typeof p.total_alquileres !== "number" ||
    typeof p.comision_monto !== "number" ||
    typeof p.neto_a_rendir !== "number"
  ) {
    return null;
  }
  return p as unknown as InformeRendicionPayloadV1;
}

function parseV2(p: Record<string, unknown>): InformeRendicionPayloadV2 | null {
  if (typeof p.propietario_nombre !== "string" || typeof p.mes_periodo !== "string") return null;
  if (typeof p.comision_porcentaje !== "number") return null;
  if (!Array.isArray(p.alquileres) || !Array.isArray(p.otros_conceptos)) return null;
  if (
    typeof p.total_alquileres_cobrados !== "number" ||
    typeof p.comision_monto !== "number" ||
    typeof p.neto_alquileres !== "number" ||
    typeof p.subtotal_otros_conceptos !== "number" ||
    typeof p.total_neto_a_rendir !== "number"
  ) {
    return null;
  }
  return p as unknown as InformeRendicionPayloadV2;
}

/** Acepta v1 (histórico) y v2 (segmentado comisionable / informativo). */
export function parseInformeRendicionPayload(raw: unknown): InformeRendicionPayload | null {
  if (raw == null || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.v === 1) return parseV1(p);
  if (p.v === 2) return parseV2(p);
  return null;
}

/** @deprecated Usar `parseInformeRendicionPayload` */
export function parseInformePayloadV1(raw: unknown): InformeRendicionPayloadV1 | null {
  const x = parseInformeRendicionPayload(raw);
  return x?.v === 1 ? x : null;
}
