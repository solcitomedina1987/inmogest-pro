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
  concepto?: ConceptoPagoTipo | null;
  concepto_pago_id?: number | null;
  concepto_label?: string | null;
  slug?: string | null;
  monto: number;
  observaciones: string | null;
  impacto: ImpactoPago;
};

export type DetallePagoV2 = {
  v: 2;
  monto_alquiler: number;
  extras: DetallePagoExtraV2[];
  /** Congelado al guardar: suma(alquiler + todos los extras con monto > 0). */
  total_cobrado_inquilino?: number;
  /** Congelado al guardar: suma al propietario − resta al propietario − suma inmobiliaria. */
  total_rendir_propietario?: number;
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

/** Impacto por defecto al migrar desde v1: honorarios/escribanía como suma a inmobiliaria. */
export function impactoDefaultDesdeConcepto(concepto: ConceptoPagoTipo): ImpactoPago {
  if (concepto === "honorarios_inmobiliarios" || concepto === "escribania") {
    return "inmobiliaria";
  }
  return "propietario_suma";
}

export function etiquetaExtraDetalleV2(e: DetallePagoExtraV2): string {
  if (e.concepto_label?.trim()) return e.concepto_label.trim();
  if (e.concepto && esConceptoPagoTipo(e.concepto)) return etiquetaConceptoConEmoji(e.concepto);
  return "Concepto";
}

export function conceptoTipoDesdeExtraV2(e: DetallePagoExtraV2): ConceptoPagoTipo | null {
  if (e.slug && esConceptoPagoTipo(e.slug)) return e.slug;
  if (e.concepto && esConceptoPagoTipo(e.concepto)) return e.concepto;
  return null;
}

export function totalDesdeDetalle(d: DetallePagoV1): number {
  return d.monto_alquiler + d.extras.reduce((a, e) => a + Number(e.monto || 0), 0);
}

/** Parte de alquiler + extras clasificados por impacto (montos ≥ 0). */
export function montosImpactoDesdeDetalleV2(d: DetallePagoV2): {
  sumaPropietario: number;
  restaPropietario: number;
  sumaInmobiliaria: number;
} {
  let sumaPropietario = Number(d.monto_alquiler) || 0;
  let restaPropietario = 0;
  let sumaInmobiliaria = 0;
  for (const e of d.extras) {
    const m = Number(e.monto) || 0;
    if (m <= 0) continue;
    if (e.impacto === "propietario_resta") restaPropietario += m;
    else if (e.impacto === "inmobiliaria") sumaInmobiliaria += m;
    else if (e.impacto === "propietario_suma") sumaPropietario += m;
    else sumaPropietario += m;
  }
  return {
    sumaPropietario: round2(sumaPropietario),
    restaPropietario: round2(restaPropietario),
    sumaInmobiliaria: round2(sumaInmobiliaria),
  };
}

/** Total que abona el inquilino: suma de montos de los tres rubros (incluye alquiler en “suma propietario”). */
export function totalCobrarInquilinoDesdeDetalleV2(d: DetallePagoV2): number {
  const { sumaPropietario, restaPropietario, sumaInmobiliaria } = montosImpactoDesdeDetalleV2(d);
  return round2(sumaPropietario + restaPropietario + sumaInmobiliaria);
}

/** Efectivo neto a liquidar al propietario por este recibo (sin comisión inmobiliaria global del informe). */
export function totalRendirPropietarioDesdeDetalleV2(d: DetallePagoV2): number {
  const { sumaPropietario, restaPropietario, sumaInmobiliaria } = montosImpactoDesdeDetalleV2(d);
  return round2(sumaPropietario - restaPropietario - sumaInmobiliaria);
}

/** Total que abona el inquilino (recibo). Usa totales persistidos en v2 si existen. */
export function totalRecaudadoInquilino(d: DetallePagoParsed | null, montoSinDetalle: number): number {
  if (!d) return round2(montoSinDetalle);
  if (d.v === 1) return round2(totalDesdeDetalle(d));
  const v2 = d;
  if (typeof v2.total_cobrado_inquilino === "number" && !Number.isNaN(v2.total_cobrado_inquilino)) {
    return round2(v2.total_cobrado_inquilino);
  }
  return totalCobrarInquilinoDesdeDetalleV2(v2);
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

export type ExtraInputConstruirDetalle =
  | {
      concepto: ConceptoPagoTipo;
      monto: number;
      observaciones?: string | null;
      impacto: ImpactoPago;
    }
  | {
      concepto_pago_id: number;
      concepto_label: string;
      slug: string | null;
      monto: number;
      observaciones?: string | null;
      impacto: ImpactoPago;
    };

export function construirDetallePagoV2(input: {
  monto_alquiler: number;
  extras: ExtraInputConstruirDetalle[];
}): DetallePagoV2 {
  const monto_alquiler = Number(input.monto_alquiler);
  const extras: DetallePagoExtraV2[] = input.extras
    .filter((e) => Number(e.monto) > 0)
    .map((e) => {
      if ("concepto_pago_id" in e) {
        const slugOk = e.slug && esConceptoPagoTipo(e.slug) ? e.slug : null;
        return {
          concepto_pago_id: e.concepto_pago_id,
          concepto_label: e.concepto_label.trim(),
          slug: e.slug,
          concepto: slugOk,
          monto: Number(e.monto),
          observaciones: e.observaciones?.trim() ? e.observaciones.trim() : null,
          impacto: e.impacto,
        };
      }
      return {
        concepto: e.concepto,
        concepto_pago_id: null,
        concepto_label: null,
        slug: null,
        monto: Number(e.monto),
        observaciones: e.observaciones?.trim() ? e.observaciones.trim() : null,
        impacto: e.impacto,
      };
    });
  const base: DetallePagoV2 = { v: 2, monto_alquiler, extras };
  return {
    ...base,
    total_cobrado_inquilino: totalCobrarInquilinoDesdeDetalleV2(base),
    total_rendir_propietario: totalRendirPropietarioDesdeDetalleV2(base),
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
      const m = Number(r.monto);
      if (Number.isNaN(m) || m < 0) continue;
      const obs = r.observaciones;
      const idRaw = r.concepto_pago_id;
      const idNum =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? idRaw
          : typeof idRaw === "string" && /^\d+$/.test(idRaw)
            ? Number(idRaw)
            : NaN;
      const labelRaw = r.concepto_label;
      if (Number.isFinite(idNum) && idNum > 0 && typeof labelRaw === "string" && labelRaw.trim()) {
        const slugRaw = r.slug;
        const slug = typeof slugRaw === "string" && slugRaw.trim() ? slugRaw.trim() : null;
        const slugOk = slug && esConceptoPagoTipo(slug) ? slug : null;
        const imp = r.impacto;
        const impacto: ImpactoPago =
          typeof imp === "string" && esImpactoPago(imp) ? imp : slugOk ? impactoDefaultDesdeConcepto(slugOk) : "propietario_suma";
        const cLegacy = r.concepto;
        const conceptoLegacy =
          typeof cLegacy === "string" && esConceptoPagoTipo(cLegacy) ? cLegacy : slugOk;
        extras.push({
          concepto_pago_id: idNum,
          concepto_label: labelRaw.trim(),
          slug,
          concepto: conceptoLegacy,
          monto: m,
          observaciones: typeof obs === "string" && obs.trim() ? obs.trim() : null,
          impacto,
        });
        continue;
      }
      const c = r.concepto;
      if (typeof c !== "string" || !esConceptoPagoTipo(c)) continue;
      const imp = r.impacto;
      const impacto: ImpactoPago =
        typeof imp === "string" && esImpactoPago(imp) ? imp : impactoDefaultDesdeConcepto(c);
      extras.push({
        concepto: c,
        concepto_pago_id: null,
        concepto_label: null,
        slug: null,
        monto: m,
        observaciones: typeof obs === "string" && obs.trim() ? obs.trim() : null,
        impacto,
      });
    }
    const totC = o.total_cobrado_inquilino;
    const totR = o.total_rendir_propietario;
    const out: DetallePagoV2 = { v: 2, monto_alquiler: mAlq, extras };
    if (typeof totC === "number" && !Number.isNaN(totC)) out.total_cobrado_inquilino = round2(totC);
    if (typeof totR === "number" && !Number.isNaN(totR)) out.total_rendir_propietario = round2(totR);
    return out;
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
  const extras = d.extras.map((e) => ({
    concepto: e.concepto,
    monto: e.monto,
    observaciones: e.observaciones,
    impacto: impactoDefaultDesdeConcepto(e.concepto),
  }));
  const base: DetallePagoV2 = { v: 2, monto_alquiler: d.monto_alquiler, extras };
  return {
    ...base,
    total_cobrado_inquilino: totalCobrarInquilinoDesdeDetalleV2(base),
    total_rendir_propietario: totalRendirPropietarioDesdeDetalleV2(base),
  };
}

/**
 * Líneas planas para compatibilidad.
 * Preferir `seccionesReciboDesdeDetalle` (recibo inquilino: un solo detalle, total = suma de ítems).
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
    lines.push({
      concepto: etiquetaExtraDetalleV2(e),
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
      secciones: [
        { titulo: "Detalle de cobro", lineas: [{ concepto: "Alquiler", monto: input.monto_pagado, observaciones: obsAlq }] },
      ],
      total,
    };
  }

  const d = input.detalle;
  const lineas: LineaRecibo[] = [{ concepto: "Alquiler", monto: d.monto_alquiler, observaciones: obsAlq }];

  if (d.v === 1) {
    for (const e of d.extras) {
      lineas.push({
        concepto: etiquetaConceptoConEmoji(e.concepto),
        monto: e.monto,
        observaciones: e.observaciones,
      });
    }
  } else {
    for (const e of d.extras) {
      lineas.push({
        concepto: etiquetaExtraDetalleV2(e),
        monto: e.monto,
        observaciones: e.observaciones,
      });
    }
  }

  return {
    secciones: [{ titulo: "Detalle de cobro", lineas }],
    total,
  };
}
