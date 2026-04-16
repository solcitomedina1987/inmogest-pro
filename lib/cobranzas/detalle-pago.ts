import type { ConceptoPagoTipo } from "@/lib/cobranzas/conceptos-pago";
import { esConceptoPagoTipo, etiquetaConceptoConEmoji } from "@/lib/cobranzas/conceptos-pago";

/** Estructura persistida en `pagos.detalle_pago` (JSONB). */
export type DetallePagoExtra = {
  concepto: ConceptoPagoTipo;
  monto: number;
  observaciones: string | null;
};

export type DetallePagoV1 = {
  v: 1;
  monto_alquiler: number;
  extras: DetallePagoExtra[];
};

export type LineaRecibo = {
  concepto: string;
  monto: number;
  observaciones: string | null;
};

export function totalDesdeDetalle(d: DetallePagoV1): number {
  return d.monto_alquiler + d.extras.reduce((a, e) => a + Number(e.monto || 0), 0);
}

export function construirDetallePagoV1(input: {
  monto_alquiler: number;
  extras: Array<{ concepto: ConceptoPagoTipo; monto: number; observaciones?: string | null }>;
}): DetallePagoV1 {
  return {
    v: 1,
    monto_alquiler: Number(input.monto_alquiler),
    extras: input.extras
      .filter((e) => Number(e.monto) > 0)
      .map((e) => ({
        concepto: e.concepto,
        monto: Number(e.monto),
        observaciones: e.observaciones?.trim() ? e.observaciones.trim() : null,
      })),
  };
}

/** Interpreta JSON de DB (desconocido) a DetallePagoV1 o null. */
export function parseDetallePagoDb(raw: unknown): DetallePagoV1 | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  const mAlq = Number(o.monto_alquiler);
  if (Number.isNaN(mAlq) || mAlq < 0) return null;
  const extrasRaw = Array.isArray(o.extras) ? o.extras : [];
  const extras: DetallePagoExtra[] = [];
  for (const row of extrasRaw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const c = r.concepto;
    if (typeof c !== "string" || !esConceptoPagoTipo(c)) continue;
    const m = Number(r.monto);
    if (Number.isNaN(m) || m < 0) continue;
    const obs = r.observaciones;
    extras.push({
      concepto: c,
      monto: m,
      observaciones: typeof obs === "string" && obs.trim() ? obs.trim() : null,
    });
  }
  return { v: 1, monto_alquiler: mAlq, extras };
}

/**
 * Líneas para tabla de recibo: alquiler + extras.
 * Si no hay detalle guardado, una sola línea con el total cobrado.
 */
export function lineasReciboDesdePago(input: {
  monto_pagado: number;
  mes_periodo: string;
  detalle: DetallePagoV1 | null;
  observacionesGenerales: string | null;
}): LineaRecibo[] {
  const obsPeriodo = `Período ${input.mes_periodo}`;
  if (!input.detalle) {
    return [
      {
        concepto: "Alquiler",
        monto: input.monto_pagado,
        observaciones: input.observacionesGenerales?.trim() || obsPeriodo,
      },
    ];
  }
  const d = input.detalle;
  const lines: LineaRecibo[] = [
    {
      concepto: "Alquiler",
      monto: d.monto_alquiler,
      observaciones: input.observacionesGenerales?.trim() || obsPeriodo,
    },
  ];
  for (const e of d.extras) {
    lines.push({
      concepto: etiquetaConceptoConEmoji(e.concepto),
      monto: e.monto,
      observaciones: e.observaciones,
    });
  }
  return lines;
}
