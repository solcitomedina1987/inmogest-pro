/**
 * Motor de cálculo de aumentos de alquiler según ICL o IPC.
 *
 * ICL: Nuevo = Actual × (ICL_fecha_actualizacion / ICL_fecha_referencia)
 * IPC: Nuevo = Actual × ∏ (IPC_mes_n / IPC_mes_n-1) para cada mes del período
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoCalculo, TipoIndice } from "@/lib/indices/types";

/* ─── helpers ────────────────────────────────────────────────────────────── */

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

/** Primer día del mes siguiente */
function addMonths(dateStr: string, months: number): string {
  const d = parseLocalDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** YYYY-MM-DD → YYYY-MM */
function toYYYYMM(fecha: string): string {
  return fecha.slice(0, 7);
}

/* ─── acceso a caché en Supabase ─────────────────────────────────────────── */

/**
 * Devuelve el índice ICL más cercano (hacia atrás) a `fecha` desde la caché.
 */
async function getICLCercano(
  db: SupabaseClient,
  fecha: string,
): Promise<{ valor: number; fecha: string; es_estimado: boolean } | null> {
  const { data } = await db
    .from("indices_economicos")
    .select("fecha, valor, es_estimado")
    .eq("tipo", "ICL")
    .lte("fecha", fecha)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { valor: Number(data.valor), fecha: data.fecha as string, es_estimado: Boolean(data.es_estimado) };
}

/**
 * Devuelve el IPC del mes (YYYY-MM-01). Si no existe, toma el último disponible.
 */
async function getIPCMes(
  db: SupabaseClient,
  mesISO: string, // YYYY-MM-01
): Promise<{ valor: number; fecha: string; es_estimado: boolean } | null> {
  // Intento exacto
  const { data: exact } = await db
    .from("indices_economicos")
    .select("fecha, valor, es_estimado")
    .eq("tipo", "IPC")
    .eq("fecha", mesISO)
    .maybeSingle();

  if (exact) return { valor: Number(exact.valor), fecha: exact.fecha as string, es_estimado: false };

  // Fallback: último disponible antes de esa fecha
  const { data: prev } = await db
    .from("indices_economicos")
    .select("fecha, valor")
    .eq("tipo", "IPC")
    .lt("fecha", mesISO)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prev) return null;
  return { valor: Number(prev.valor), fecha: prev.fecha as string, es_estimado: true };
}

/* ─── cálculo principal ──────────────────────────────────────────────────── */

type ContratoMinimo = {
  id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_mensual: number;
  meses_actualizacion: number;
  indice_actualizacion: TipoIndice;
  ultima_actualizacion: string | null;
};

/**
 * Calcula el aumento para la PRÓXIMA fecha de actualización del contrato.
 */
export async function calculateRentalIncrease(
  db: SupabaseClient,
  contrato: ContratoMinimo,
): Promise<ResultadoCalculo> {
  const {
    fecha_inicio,
    meses_actualizacion,
    indice_actualizacion,
    ultima_actualizacion,
    monto_mensual,
    fecha_vencimiento,
  } = contrato;

  // Fecha de referencia = última actualización o inicio
  const fechaRef = ultima_actualizacion ?? fecha_inicio;

  // Fecha de la próxima actualización
  const fechaActualizacion = addMonths(fechaRef, meses_actualizacion);

  if (fechaActualizacion > fecha_vencimiento) {
    return { ok: false, error: "No quedan actualizaciones pendientes en este contrato." };
  }

  if (indice_actualizacion === "ICL") {
    return calcularICL(db, contrato, fechaRef, fechaActualizacion);
  } else {
    return calcularIPC(db, contrato, fechaRef, fechaActualizacion);
  }
}

async function calcularICL(
  db: SupabaseClient,
  contrato: ContratoMinimo,
  fechaRef: string,
  fechaActualizacion: string,
): Promise<ResultadoCalculo> {
  const iclRef = await getICLCercano(db, fechaRef);
  if (!iclRef) {
    return {
      ok: false,
      error: `No hay datos de ICL disponibles para la fecha de referencia (${fechaRef}). Sincronizá los índices desde el panel.`,
    };
  }

  const iclAct = await getICLCercano(db, fechaActualizacion);
  if (!iclAct) {
    return {
      ok: false,
      error: `No hay datos de ICL disponibles para la fecha de actualización (${fechaActualizacion}). Sincronizá los índices desde el panel.`,
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
    fecha_actualizacion: iclAct.fecha,
    es_estimado: esEstimado,
    detalle: `ICL ${iclRef.fecha}: ${iclRef.valor.toFixed(4)} → ICL ${iclAct.fecha}: ${iclAct.valor.toFixed(4)} · Coeficiente: ×${coeficiente.toFixed(4)}${esEstimado ? " (valor estimado)" : ""}`,
  };
}

async function calcularIPC(
  db: SupabaseClient,
  contrato: ContratoMinimo,
  fechaRef: string,
  fechaActualizacion: string,
): Promise<ResultadoCalculo> {
  // Genera YYYY-MM-01 para cada mes del período (excluyendo mes base, incluyendo mes final)
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

  // Necesitamos el IPC del mes anterior al primero del período (base)
  const mesBase = toYYYYMM(fechaRef) + "-01";
  const ipcBase = await getIPCMes(db, mesBase);
  if (!ipcBase) {
    return {
      ok: false,
      error: `No hay datos de IPC disponibles para el mes base (${mesBase}). Sincronizá los índices desde el panel.`,
    };
  }

  let coeficiente = 1;
  let ipcPrev = ipcBase.valor;
  let esEstimado = ipcBase.es_estimado;
  const detalleLineas: string[] = [];

  for (const mes of mesesPeriodo) {
    const ipc = await getIPCMes(db, mes);
    if (!ipc) {
      // Si no hay datos del mes final, usamos el último disponible
      if (mes === mesesPeriodo[mesesPeriodo.length - 1]) {
        esEstimado = true;
        detalleLineas.push(`${mes}: sin datos (estimado con último disponible)`);
        break;
      }
      return {
        ok: false,
        error: `Sin datos de IPC para ${mes}. Sincronizá los índices desde el panel.`,
      };
    }

    const factor = ipc.valor / ipcPrev;
    coeficiente *= factor;
    if (ipc.es_estimado) esEstimado = true;
    detalleLineas.push(`${mes}: IPC ${ipc.valor.toFixed(2)} · factor ×${factor.toFixed(4)}${ipc.es_estimado ? " ≈" : ""}`);
    ipcPrev = ipc.valor;
  }

  const monto_sugerido = Math.round(contrato.monto_mensual * coeficiente);

  return {
    ok: true,
    monto_actual: contrato.monto_mensual,
    monto_sugerido,
    coeficiente,
    indice_tipo: "IPC",
    indice_inicial: ipcBase.valor,
    indice_final: ipcPrev,
    fecha_ref: ipcBase.fecha,
    fecha_actualizacion: mesesPeriodo[mesesPeriodo.length - 1] ?? fechaActualizacion,
    es_estimado: esEstimado,
    detalle: detalleLineas.join(" | ") + ` · Total: ×${coeficiente.toFixed(4)}${esEstimado ? " (estimado)" : ""}`,
  };
}
