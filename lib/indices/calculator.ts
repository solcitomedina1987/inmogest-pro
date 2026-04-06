/**
 * Motor de cálculo de aumentos de alquiler según ICL o IPC.
 * Datos desde public.historico_indices (caché local).
 *
 * ICL: Nuevo = Actual × (ICL_mes_act / ICL_mes_ref)  (nivel del índice)
 * IPC: Nuevo = Actual × ∏ (1 + variación_mensual%/100)  (serie INVAR datos.gob.ar)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoCalculo, TipoIndice } from "@/lib/indices/types";
import { obtenerICLParaMes, obtenerIPCParaMes } from "@/lib/indices/historico-indices";

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

function addMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function toYYYYMM(fecha: string): string {
  return fecha.slice(0, 7);
}

function firstOfCalendarMonth(fechaIso: string): string {
  return `${toYYYYMM(fechaIso)}-01`;
}

type ContratoMinimo = {
  id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_mensual: number;
  meses_actualizacion: number;
  indice_actualizacion: TipoIndice;
  ultima_actualizacion: string | null;
};

export async function calculateRentalIncrease(
  db: SupabaseClient,
  contrato: ContratoMinimo,
): Promise<ResultadoCalculo> {
  const {
    meses_actualizacion,
    indice_actualizacion,
    ultima_actualizacion,
    monto_mensual,
    fecha_vencimiento,
  } = contrato;

  const fechaRef = ultima_actualizacion ?? contrato.fecha_inicio;
  const fechaActualizacion = addMonths(fechaRef, meses_actualizacion);

  if (fechaActualizacion > fecha_vencimiento) {
    return { ok: false, error: "No quedan actualizaciones pendientes en este contrato." };
  }

  if (indice_actualizacion === "ICL") {
    return calcularICL(db, contrato, fechaRef, fechaActualizacion);
  }
  return calcularIPC(db, contrato, fechaRef, fechaActualizacion);
}

async function calcularICL(
  db: SupabaseClient,
  contrato: ContratoMinimo,
  fechaRef: string,
  fechaActualizacion: string,
): Promise<ResultadoCalculo> {
  const mesIclRef = firstOfCalendarMonth(fechaRef);
  const mesIclAct =
    fechaActualizacion.slice(8, 10) === "01"
      ? fechaActualizacion
      : firstOfCalendarMonth(fechaActualizacion);

  const iclRef = await obtenerICLParaMes(db, mesIclRef);
  if (!iclRef) {
    return {
      ok: false,
      error: `No hay datos de ICL para el mes de referencia (${mesIclRef}). Sincronizá índices o revisá el scraping BCRA.`,
    };
  }

  const iclAct = await obtenerICLParaMes(db, mesIclAct);
  if (!iclAct) {
    return {
      ok: false,
      error: `No hay datos de ICL para el mes de actualización (${mesIclAct}). Sincronizá índices o revisá el scraping BCRA.`,
      es_estimado: true,
    };
  }

  const coeficiente = iclAct.valor / iclRef.valor;
  const monto_sugerido = Math.round(contrato.monto_mensual * coeficiente);
  const esEstimado = iclRef.es_estimado || iclAct.es_estimado;

  return {
    ok: true,
    monto_actual: contrato.monto_mensual,
    monto_sugerido,
    coeficiente,
    indice_tipo: "ICL",
    indice_inicial: iclRef.valor,
    indice_final: iclAct.valor,
    fecha_ref: iclRef.fecha,
    fecha_actualizacion: mesIclAct,
    es_estimado: esEstimado,
    detalle: `ICL ref. ${mesIclRef} (${iclRef.fecha}): ${iclRef.valor.toFixed(4)} → ICL act. ${mesIclAct} (${iclAct.fecha}): ${iclAct.valor.toFixed(4)} · ×${coeficiente.toFixed(4)}${esEstimado ? " (estimado)" : ""}`,
  };
}

async function calcularIPC(
  db: SupabaseClient,
  contrato: ContratoMinimo,
  fechaRef: string,
  fechaActualizacion: string,
): Promise<ResultadoCalculo> {
  const mesesPeriodo: string[] = [];
  let cursor = addMonths(toYYYYMM(fechaRef) + "-01", 1);
  const limite = toYYYYMM(fechaActualizacion) + "-01";
  let guard = 0;
  while (cursor <= limite && guard < 60) {
    mesesPeriodo.push(cursor);
    cursor = addMonths(cursor, 1);
    guard++;
  }

  if (mesesPeriodo.length === 0) {
    return { ok: false, error: "No se encontraron meses para calcular la variación IPC." };
  }

  let coeficiente = 1;
  let esEstimado = false;
  let primeraVar: number | null = null;
  let ultimaVar: number | null = null;
  const detalleLineas: string[] = [];

  for (const mes of mesesPeriodo) {
    const row = await obtenerIPCParaMes(db, mes);
    if (!row) {
      if (mes === mesesPeriodo[mesesPeriodo.length - 1]) {
        esEstimado = true;
        detalleLineas.push(`${mes}: sin dato exacto`);
        break;
      }
      return {
        ok: false,
        error: `Sin datos de IPC para ${mes}. Sincronizá índices desde Cobranzas.`,
      };
    }

    const factor = 1 + row.valor / 100;
    coeficiente *= factor;
    if (row.es_estimado) esEstimado = true;
    if (primeraVar === null) primeraVar = row.valor;
    ultimaVar = row.valor;
    detalleLineas.push(
      `${mes}: ${row.valor.toFixed(2)}% mensual → ×${factor.toFixed(4)}${row.es_estimado ? " ≈" : ""}`,
    );
  }

  const monto_sugerido = Math.round(contrato.monto_mensual * coeficiente);

  return {
    ok: true,
    monto_actual: contrato.monto_mensual,
    monto_sugerido,
    coeficiente,
    indice_tipo: "IPC",
    indice_inicial: primeraVar ?? 0,
    indice_final: ultimaVar ?? 0,
    fecha_ref: toYYYYMM(fechaRef) + "-01",
    fecha_actualizacion: mesesPeriodo[mesesPeriodo.length - 1] ?? fechaActualizacion,
    es_estimado: esEstimado,
    detalle:
      detalleLineas.join(" | ") + ` · Total: ×${coeficiente.toFixed(4)} (producto 1+r%)${esEstimado ? " (estimado)" : ""}`,
  };
}
