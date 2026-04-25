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
  const deducciones_propietario = Array.isArray(p.deducciones_propietario)
    ? (p.deducciones_propietario as InformeRendicionPayloadV2["deducciones_propietario"])
    : [];
  const informativos_conceptos = Array.isArray(p.informativos_conceptos)
    ? (p.informativos_conceptos as InformeRendicionPayloadV2["informativos_conceptos"])
    : [];
  return {
    v: 2,
    propietario_nombre: p.propietario_nombre,
    mes_periodo: p.mes_periodo,
    comision_porcentaje: p.comision_porcentaje,
    alquileres: p.alquileres as InformeRendicionPayloadV2["alquileres"],
    otros_conceptos: p.otros_conceptos as InformeRendicionPayloadV2["otros_conceptos"],
    deducciones_propietario,
    informativos_conceptos,
    total_alquileres_cobrados: p.total_alquileres_cobrados,
    comision_monto: p.comision_monto,
    neto_alquileres: p.neto_alquileres,
    subtotal_otros_conceptos: p.subtotal_otros_conceptos,
    total_neto_a_rendir: p.total_neto_a_rendir,
  };
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
