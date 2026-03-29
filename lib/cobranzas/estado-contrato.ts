import type { EstadoPagoCobranza } from "@/lib/cobranzas/types";

export type EstadoVisualCobranza = "al_dia" | "en_mora" | "pendiente";

export type PagoMesInfo = {
  mes_periodo: string;
  estado: EstadoPagoCobranza;
  monto_pagado: number | null;
  monto_esperado: number;
} | null;

/**
 * mes_periodo actual en formato YYYY-MM (zona local).
 */
export function mesPeriodoActual(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = fecha.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Deriva YYYY-MM desde una fecha ISO YYYY-MM-DD. */
export function mesPeriodoDesdeFecha(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

/**
 * Si el día calendario supera dia_limite_pago y no hay pago "Pagado" en el mes, hay mora.
 */
export function estadoCobranzaContrato(
  diaLimitePago: number,
  pagoMesActual: PagoMesInfo,
  hoy: Date = new Date(),
): EstadoVisualCobranza {
  const dia = hoy.getDate();

  if (pagoMesActual?.estado === "Pagado") {
    return "al_dia";
  }

  if (pagoMesActual?.estado === "Atrasado") {
    return "en_mora";
  }

  if (dia > diaLimitePago) {
    return "en_mora";
  }

  return "pendiente";
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() < day) {
    x.setDate(0);
  }
  return x;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Próxima fecha de actualización de alquiler desde ultima_actualizacion (o fecha_inicio) + N meses,
 * avanzando hasta quedar >= hoy y <= fecha_vencimiento.
 */
export function proximaFechaActualizacionAlquiler(
  fechaInicio: string,
  fechaVencimiento: string,
  mesesActualizacion: number,
  ultimaActualizacion: string | null,
  hoy: Date = new Date(),
): Date | null {
  const fin = parseLocalDate(fechaVencimiento);
  const inicio = parseLocalDate(fechaInicio);
  const ref = ultimaActualizacion ? parseLocalDate(ultimaActualizacion) : inicio;
  let next = addMonths(ref, mesesActualizacion);

  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  let guard = 0;
  while (next < hoy0 && next <= fin && guard < 240) {
    next = addMonths(next, mesesActualizacion);
    guard++;
  }

  if (next > fin) {
    return null;
  }
  return next;
}

/**
 * Contratos cuya próxima actualización cae en los próximos `diasVentana` días (incluye hoy).
 */
export function filtrarProximasActualizaciones<
  T extends {
    fecha_inicio: string;
    fecha_vencimiento: string;
    meses_actualizacion: number;
    ultima_actualizacion: string | null;
  },
>(contratos: T[], diasVentana: number, hoy: Date = new Date()): Array<T & { proxima_actualizacion: Date }> {
  const finVentana = new Date(hoy.getTime());
  finVentana.setDate(finVentana.getDate() + diasVentana);

  const out: Array<T & { proxima_actualizacion: Date }> = [];

  for (const c of contratos) {
    const prox = proximaFechaActualizacionAlquiler(
      c.fecha_inicio,
      c.fecha_vencimiento,
      c.meses_actualizacion,
      c.ultima_actualizacion,
      hoy,
    );
    if (!prox) {
      continue;
    }
    if (prox >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) && prox <= finVentana) {
      out.push({ ...c, proxima_actualizacion: prox });
    }
  }

  out.sort((a, b) => a.proxima_actualizacion.getTime() - b.proxima_actualizacion.getTime());
  return out;
}
