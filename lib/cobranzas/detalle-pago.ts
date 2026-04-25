import type { ConceptoPagoTipo } from "@/lib/cobranzas/conceptos-pago";
import { esConceptoPagoTipo, etiquetaConceptoConEmoji } from "@/lib/cobranzas/conceptos-pago";

/** Estructura persistida en `pagos.detalle_pago` (JSONB) — versión inicial sin impacto contable. */
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

export const IMPACTO_PAGO_VALUES = ["propietario_suma", "propietario_resta", "inmobiliaria"] as const;
export type ImpactoPago = (typeof IMPACTO_PAGO_VALUES)[number];

export type DetallePagoExtraV2 = {
  concepto: ConceptoPagoTipo;
  monto: number;
  observaciones: string | null;
  impacto: ImpactoPago;
};

export type DetallePagoV2 = {
  v: 2;
  monto_alquiler: number;
  extras: DetallePagoExtraV2[];
};

export type DetallePagoParsed = DetallePagoV1 | DetallePagoV2;

export type LineaRecibo = {
  concepto: string;
  monto: number;
  observaciones: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function esImpactoPago(s: string): s is ImpactoPago {
  return (IMPACTO_PAGO_VALUES as readonly string[]).includes(s);
}

/** Impacto por defecto al migrar desde v1: honorarios/escribanía no liquidan al dueño. */
export function impactoDefaultDesdeConcepto(concepto: ConceptoPagoTipo): ImpactoPago {
  if (concepto === "honorarios_inmobiliarios" || concepto === "escribania") {
    return "inmobiliaria";
  }
  return "propietario_suma";
}

export function totalDesdeDetalle(d: DetallePagoV1): number {
  return d.monto_alquiler + d.extras.reduce((a, e) => a + Number(e.monto || 0), 0);
}

/** Total que abona el inquilino en el recibo: alquiler + sumas + inmobiliaria − restas al propietario. */
export function totalRecaudadoInquilino(d: DetallePagoParsed | null, montoSinDetalle: number): number {
  if (!d) return round2(montoSinDetalle);
  if (d.v === 1) return round2(totalDesdeDetalle(d));
  let t = Number(d.monto_alquiler) || 0;
  for (const e of d.extras) {
    const m = Number(e.monto) || 0;
    if (e.impacto === "propietario_resta") t -= m;
    else t += m;
  }
  return round2(t);
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

export function construirDetallePagoV2(input: {
  monto_alquiler: number;
  extras: Array<{
    concepto: ConceptoPagoTipo;
    monto: number;
    observaciones?: string | null;
    impacto: ImpactoPago;
  }>;
}): DetallePagoV2 {
  return {
    v: 2,
    monto_alquiler: Number(input.monto_alquiler),
    extras: input.extras
      .filter((e) => Number(e.monto) > 0)
      .map((e) => ({
        concepto: e.concepto,
        monto: Number(e.monto),
        observaciones: e.observaciones?.trim() ? e.observaciones.trim() : null,
        impacto: e.impacto,
      })),
  };
}

/** Interpreta JSON de DB: v2, v1 o null. */
export function parseDetallePagoDb(raw: unknown): DetallePagoParsed | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v === 2) {
    const mAlq = Number(o.monto_alquiler);
    if (Number.isNaN(mAlq) || mAlq < 0) return null;
    const extrasRaw = Array.isArray(o.extras) ? o.extras : [];
    const extras: DetallePagoExtraV2[] = [];
    for (const row of extrasRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const c = r.concepto;
      if (typeof c !== "string" || !esConceptoPagoTipo(c)) continue;
      const m = Number(r.monto);
      if (Number.isNaN(m) || m < 0) continue;
      const obs = r.observaciones;
      const imp = r.impacto;
      const impacto: ImpactoPago =
        typeof imp === "string" && esImpactoPago(imp) ? imp : impactoDefaultDesdeConcepto(c);
      extras.push({
        concepto: c,
        monto: m,
        observaciones: typeof obs === "string" && obs.trim() ? obs.trim() : null,
        impacto,
      });
    }
    return { v: 2, monto_alquiler: mAlq, extras };
  }
  if (o.v === 1) {
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
  return null;
}

/** Convierte cualquier detalle a v2 para cálculos de liquidación (v1 → impactos por defecto). */
export function aDetalleV2(d: DetallePagoParsed | null, montoPagoSinDetalle: number): DetallePagoV2 {
  if (!d) {
    return { v: 2, monto_alquiler: round2(montoPagoSinDetalle), extras: [] };
  }
  if (d.v === 2) return d;
  return {
    v: 2,
    monto_alquiler: d.monto_alquiler,
    extras: d.extras.map((e) => ({
      concepto: e.concepto,
      monto: e.monto,
      observaciones: e.observaciones,
      impacto: impactoDefaultDesdeConcepto(e.concepto),
    })),
  };
}

/**
 * Líneas planas para compatibilidad (recibo antiguo).
 * Preferir `seccionesReciboDesdeDetalle` para UI con Haberes / Deducciones.
 */
export function lineasReciboDesdePago(input: {
  monto_pagado: number;
  mes_periodo: string;
  detalle: DetallePagoParsed | null;
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
  if (d.v === 1) {
    for (const e of d.extras) {
      lines.push({
        concepto: etiquetaConceptoConEmoji(e.concepto),
        monto: e.monto,
        observaciones: e.observaciones,
      });
    }
    return lines;
  }
  for (const e of d.extras) {
    const sign = e.impacto === "propietario_resta" ? "− " : "";
    lines.push({
      concepto: `${sign}${etiquetaConceptoConEmoji(e.concepto)}`,
      monto: e.monto,
      observaciones: e.observaciones,
    });
  }
  return lines;
}

export type SeccionRecibo = { titulo: string; lineas: LineaRecibo[] };

export function seccionesReciboDesdeDetalle(input: {
  monto_pagado: number;
  mes_periodo: string;
  detalle: DetallePagoParsed | null;
  observacionesGenerales: string | null;
}): { secciones: SeccionRecibo[]; total: number } {
  const obsPeriodo = `Período ${input.mes_periodo}`;
  const obsAlq = input.observacionesGenerales?.trim() || obsPeriodo;
  const total = totalRecaudadoInquilino(input.detalle, input.monto_pagado);

  if (!input.detalle) {
    return {
      secciones: [{ titulo: "Haberes", lineas: [{ concepto: "Alquiler", monto: input.monto_pagado, observaciones: obsAlq }] }],
      total,
    };
  }

  const d = input.detalle;
  const haberes: LineaRecibo[] = [
    { concepto: "Alquiler", monto: d.monto_alquiler, observaciones: obsAlq },
  ];
  const deducciones: LineaRecibo[] = [];
  const inmob: LineaRecibo[] = [];

  if (d.v === 1) {
    for (const e of d.extras) {
      haberes.push({
        concepto: etiquetaConceptoConEmoji(e.concepto),
        monto: e.monto,
        observaciones: e.observaciones,
      });
    }
  } else {
    for (const e of d.extras) {
      const line: LineaRecibo = {
        concepto: etiquetaConceptoConEmoji(e.concepto),
        monto: e.monto,
        observaciones: e.observaciones,
      };
      if (e.impacto === "propietario_resta") deducciones.push(line);
      else if (e.impacto === "inmobiliaria") inmob.push(line);
      else haberes.push(line);
    }
  }

  const secciones: SeccionRecibo[] = [];
  if (haberes.length) secciones.push({ titulo: "Haberes", lineas: haberes });
  if (deducciones.length) secciones.push({ titulo: "Deducciones", lineas: deducciones });
  if (inmob.length) secciones.push({ titulo: "Conceptos inmobiliaria", lineas: inmob });

  return { secciones, total };
}
