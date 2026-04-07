/**
 * ICL vía Arquiler API: caché en historico_indices (tipo ICL_ARQUILER), fórmula legal y proyección.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchArquilerStats, isArquilerApiConfigured } from "@/lib/services/arquiler-api";
import type { PuntoICLArquiler } from "@/lib/services/arquiler-api";

export const TIPO_ICL_ARQUILER = "ICL_ARQUILER" as const;

function ymd(fecha: string): string {
  return fecha.slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const ta = new Date(a + "T12:00:00").getTime();
  const tb = new Date(b + "T12:00:00").getTime();
  return Math.round((tb - ta) / (86400 * 1000));
}

/** Nuevo Valor = Valor Inicial × (ICL_act / ICL_ini) */
export function calcularActualizacionICL(
  valorInicial: number,
  iclFechaInicio: number,
  iclFechaActualizacion: number,
): { nuevoValor: number; coeficiente: number } {
  if (iclFechaInicio <= 0 || !Number.isFinite(iclFechaInicio)) {
    throw new Error("ICL fecha inicio inválido o no positivo.");
  }
  if (iclFechaActualizacion <= 0 || !Number.isFinite(iclFechaActualizacion)) {
    throw new Error("ICL fecha actualización inválido o no positivo.");
  }
  const coeficiente = iclFechaActualizacion / iclFechaInicio;
  return { nuevoValor: valorInicial * coeficiente, coeficiente };
}

const fmtDesglose = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearDesgloseICL(
  valorInicial: number,
  iclIni: number,
  iclFin: number,
): string {
  return `${fmtDesglose.format(valorInicial)} × (${fmtDesglose.format(iclFin)} / ${fmtDesglose.format(iclIni)})`;
}

async function leerCache(db: SupabaseClient): Promise<PuntoICLArquiler[]> {
  const { data, error } = await db
    .from("historico_indices")
    .select("fecha, valor")
    .eq("tipo", TIPO_ICL_ARQUILER)
    .order("fecha", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ fecha: r.fecha as string, valor: Number(r.valor) }));
}

async function upsertSerie(db: SupabaseClient, puntos: PuntoICLArquiler[]): Promise<void> {
  if (puntos.length === 0) return;
  const { error } = await db.from("historico_indices").upsert(
    puntos.map((p) => ({ tipo: TIPO_ICL_ARQUILER, fecha: p.fecha, valor: p.valor })),
    { onConflict: "tipo,fecha" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Variación diaria promedio entre los dos últimos puntos y extrapolación a fecha objetivo
 * (fecha objetivo estrictamente posterior al último dato).
 */
function proyectarDesdeUltimosDos(serieAsc: PuntoICLArquiler[], fechaObjetivo: string): number | null {
  if (serieAsc.length < 2) return null;
  const a = serieAsc[serieAsc.length - 2];
  const b = serieAsc[serieAsc.length - 1];
  if (fechaObjetivo <= b.fecha) return null;
  const d = diasEntre(a.fecha, b.fecha);
  if (d <= 0) return null;
  const daily = (b.valor - a.valor) / d;
  return b.valor + daily * diasEntre(b.fecha, fechaObjetivo);
}

function interpolarEntreVecinos(serieAsc: PuntoICLArquiler[], fechaObjetivo: string): number | null {
  let prev: PuntoICLArquiler | null = null;
  let next: PuntoICLArquiler | null = null;
  for (const p of serieAsc) {
    if (p.fecha < fechaObjetivo) prev = p;
    if (p.fecha > fechaObjetivo) {
      next = p;
      break;
    }
  }
  if (!prev || !next) return null;
  const d0 = diasEntre(prev.fecha, next.fecha);
  if (d0 <= 0) return null;
  const t = diasEntre(prev.fecha, fechaObjetivo) / d0;
  return prev.valor + t * (next.valor - prev.valor);
}

function valorEnSerie(
  serieAsc: PuntoICLArquiler[],
  fechaObjetivo: string,
): { valor: number; esEstimado: boolean } | null {
  const exact = serieAsc.find((p) => p.fecha === fechaObjetivo);
  if (exact) return { valor: exact.valor, esEstimado: false };

  const ultimo = serieAsc[serieAsc.length - 1];
  if (ultimo && fechaObjetivo > ultimo.fecha) {
    const v = proyectarDesdeUltimosDos(serieAsc, fechaObjetivo);
    if (v != null && Number.isFinite(v) && v > 0) return { valor: v, esEstimado: true };
    return null;
  }

  const interp = interpolarEntreVecinos(serieAsc, fechaObjetivo);
  if (interp != null && Number.isFinite(interp) && interp > 0) {
    return { valor: interp, esEstimado: true };
  }

  return null;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

function addMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr.slice(0, 10));
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfCalendarMonth(fechaIso: string): string {
  return `${fechaIso.slice(0, 7)}-01`;
}

/**
 * Misma convención que el motor ICL en calculator.ts (primer día de mes para niveles).
 */
export function fechasICLArquilerParaContrato(params: {
  fecha_inicio: string;
  ultima_actualizacion: string | null;
  meses_actualizacion: number;
}): { fechaIclInicio: string; fechaIclFin: string } {
  const fechaRef = params.ultima_actualizacion ?? params.fecha_inicio;
  const fechaActualizacion = addMonths(fechaRef.slice(0, 10), params.meses_actualizacion);
  const mesIclRef = firstOfCalendarMonth(fechaRef);
  const mesIclAct =
    fechaActualizacion.slice(8, 10) === "01"
      ? fechaActualizacion.slice(0, 10)
      : firstOfCalendarMonth(fechaActualizacion);
  return { fechaIclInicio: mesIclRef, fechaIclFin: mesIclAct };
}

export type ResultadoICLArquilerContrato =
  | {
      ok: true;
      monto_actual: number;
      monto_sugerido: number;
      coeficiente: number;
      indice_inicial: number;
      indice_final: number;
      fecha_icl_inicio: string;
      fecha_icl_fin: string;
      es_estimado: boolean;
      desglose_formula: string;
      detalle: string;
    }
  | { ok: false; error: string };

/**
 * Resuelve ICL para dos fechas (YYYY-MM-DD): lee caché ICL_ARQUILER, completa con API si hace falta.
 */
export async function calcularSiguienteActualizacionArquilerApi(
  db: SupabaseClient,
  contrato: {
    fecha_inicio: string;
    fecha_vencimiento: string;
    monto_mensual: number;
    meses_actualizacion: number;
    ultima_actualizacion: string | null;
  },
): Promise<ResultadoICLArquilerContrato> {
  const fechaRef = contrato.ultima_actualizacion ?? contrato.fecha_inicio;
  const fechaActualizacion = addMonths(fechaRef.slice(0, 10), contrato.meses_actualizacion);
  if (fechaActualizacion.slice(0, 10) > contrato.fecha_vencimiento.slice(0, 10)) {
    return { ok: false, error: "No quedan actualizaciones pendientes en este contrato." };
  }
  const { fechaIclInicio, fechaIclFin } = fechasICLArquilerParaContrato({
    fecha_inicio: contrato.fecha_inicio,
    ultima_actualizacion: contrato.ultima_actualizacion,
    meses_actualizacion: contrato.meses_actualizacion,
  });
  return calcularActualizacionICLDesdeArquilerApi(
    db,
    contrato.monto_mensual,
    fechaIclInicio,
    fechaIclFin,
  );
}

export async function calcularActualizacionICLDesdeArquilerApi(
  db: SupabaseClient,
  valorInicial: number,
  fechaInicio: string,
  fechaActualizacion: string,
): Promise<ResultadoICLArquilerContrato> {
  const fi = ymd(fechaInicio);
  const fa = ymd(fechaActualizacion);

  if (!isArquilerApiConfigured()) {
    return { ok: false, error: "Arquiler API no configurada (RAPIDAPI_ARQUILER_KEY)." };
  }

  try {
    let serie = await leerCache(db);
    let rowIni = valorEnSerie(serie, fi);
    let rowFin = valorEnSerie(serie, fa);

    if (!rowIni || !rowFin) {
      const api = await fetchArquilerStats();
      await upsertSerie(db, api);
      serie = await leerCache(db);
      rowIni = valorEnSerie(serie, fi);
      rowFin = valorEnSerie(serie, fa);
    }

    if (serie.length === 0) {
      return { ok: false, error: "No hay serie ICL en caché ni en la API." };
    }

    if (!rowIni) {
      return {
        ok: false,
        error: `No hay datos de ICL (Arquiler API) para la fecha de inicio ${fi}.`,
      };
    }
    if (!rowFin) {
      return {
        ok: false,
        error: `No hay datos de ICL (Arquiler API) para la fecha de actualización ${fa}.`,
      };
    }

    const { nuevoValor, coeficiente } = calcularActualizacionICL(
      valorInicial,
      rowIni.valor,
      rowFin.valor,
    );
    const es_estimado = rowIni.esEstimado || rowFin.esEstimado;
    const monto_sugerido = Math.round(nuevoValor * 100) / 100;

    const desglose_formula = formatearDesgloseICL(valorInicial, rowIni.valor, rowFin.valor);
    const detalle = `ICL Arquiler ${fi}: ${rowIni.valor.toFixed(4)}${rowIni.esEstimado ? " (est.)" : ""} → ${fa}: ${rowFin.valor.toFixed(4)}${rowFin.esEstimado ? " (est.)" : ""}`;

    return {
      ok: true,
      monto_actual: valorInicial,
      monto_sugerido,
      coeficiente,
      indice_inicial: rowIni.valor,
      indice_final: rowFin.valor,
      fecha_icl_inicio: fi,
      fecha_icl_fin: fa,
      es_estimado,
      desglose_formula,
      detalle,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
