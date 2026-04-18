import type { InformeRendicionPayloadV1 } from "@/lib/informes/rendicion-types";

export function parseInformePayloadV1(raw: unknown): InformeRendicionPayloadV1 | null {
  if (raw == null || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.v !== 1) return null;
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
  return raw as InformeRendicionPayloadV1;
}
