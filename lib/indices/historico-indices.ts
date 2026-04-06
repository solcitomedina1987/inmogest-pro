/**
 * Caché en Supabase: tabla historico_indices.
 * IPC: variación mensual % (producto (1+v/100) en el motor).
 * ICL: nivel del índice (cociente entre meses).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getIPCData } from "@/lib/indices/sources/ipc-datos-gob-ar";
import { getICLData } from "@/lib/indices/sources/icl-bcra-scrape";

export type FilaHistorico = { tipo: "ICL" | "IPC"; fecha: string; valor: number };

export async function upsertHistorico(
  db: SupabaseClient,
  filas: FilaHistorico[],
): Promise<{ error: string | null }> {
  if (filas.length === 0) return { error: null };
  const { error } = await db.from("historico_indices").upsert(
    filas.map((f) => ({ tipo: f.tipo, fecha: f.fecha, valor: f.valor })),
    { onConflict: "tipo,fecha" },
  );
  return { error: error?.message ?? null };
}

/** Sincroniza IPC (últimos N meses) desde datos.gob.ar. */
export async function sincronizarIPCDesdeFuente(
  db: SupabaseClient,
  last = 12,
): Promise<{ ok: boolean; error?: string; registros: number }> {
  try {
    const datos = await getIPCData(last);
    const { error } = await upsertHistorico(
      db,
      datos.map((d) => ({ tipo: "IPC", fecha: d.fecha, valor: d.valor })),
    );
    if (error) return { ok: false, error, registros: 0 };
    return { ok: true, registros: datos.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), registros: 0 };
  }
}

/** ICL del mes en curso (AR) desde scraping BCRA. */
export async function sincronizarICLDesdeFuente(
  db: SupabaseClient,
): Promise<{ ok: boolean; error?: string; fecha?: string }> {
  try {
    const d = await getICLData();
    if (!d) return { ok: false, error: "No se pudo leer el ICL en la página del BCRA." };
    const { error } = await upsertHistorico(db, [{ tipo: "ICL", fecha: d.fecha, valor: d.valor }]);
    if (error) return { ok: false, error };
    return { ok: true, fecha: d.fecha };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sincronizarTodo(
  db: SupabaseClient,
  ipcLast = 12,
): Promise<{ ipc: Awaited<ReturnType<typeof sincronizarIPCDesdeFuente>>; icl: Awaited<ReturnType<typeof sincronizarICLDesdeFuente>> }> {
  const ipc = await sincronizarIPCDesdeFuente(db, ipcLast);
  const icl = await sincronizarICLDesdeFuente(db);
  return { ipc, icl };
}

async function selectICLExacto(
  db: SupabaseClient,
  mesPrimero: string,
): Promise<{ valor: number; fecha: string } | null> {
  const { data } = await db
    .from("historico_indices")
    .select("fecha, valor")
    .eq("tipo", "ICL")
    .eq("fecha", mesPrimero)
    .maybeSingle();
  if (!data) return null;
  return { valor: Number(data.valor), fecha: data.fecha as string };
}

async function selectIPCExacto(
  db: SupabaseClient,
  mesISO: string,
): Promise<{ valor: number; fecha: string } | null> {
  const { data } = await db
    .from("historico_indices")
    .select("fecha, valor")
    .eq("tipo", "IPC")
    .eq("fecha", mesISO)
    .maybeSingle();
  if (!data) return null;
  return { valor: Number(data.valor), fecha: data.fecha as string };
}

async function selectIPCAnterior(
  db: SupabaseClient,
  mesISO: string,
): Promise<{ valor: number; fecha: string } | null> {
  const { data } = await db
    .from("historico_indices")
    .select("fecha, valor")
    .eq("tipo", "IPC")
    .lt("fecha", mesISO)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { valor: Number(data.valor), fecha: data.fecha as string };
}

async function selectICLAnterior(
  db: SupabaseClient,
  mesPrimero: string,
): Promise<{ valor: number; fecha: string } | null> {
  const { data } = await db
    .from("historico_indices")
    .select("fecha, valor")
    .eq("tipo", "ICL")
    .lt("fecha", mesPrimero)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { valor: Number(data.valor), fecha: data.fecha as string };
}

/**
 * IPC del mes: lee caché; si no hay fila exacta, sincroniza desde datos.gob.ar y reintenta; si sigue sin haber, último mes anterior (estimado).
 */
export async function obtenerIPCParaMes(
  db: SupabaseClient,
  mesISO: string,
): Promise<{ valor: number; fecha: string; es_estimado: boolean } | null> {
  const ex = await selectIPCExacto(db, mesISO);
  if (ex) return { ...ex, es_estimado: false };

  await sincronizarIPCDesdeFuente(db, 24);
  const ex2 = await selectIPCExacto(db, mesISO);
  if (ex2) return { ...ex2, es_estimado: false };

  const prev = await selectIPCAnterior(db, mesISO);
  if (!prev) return null;
  return { ...prev, es_estimado: true };
}

/**
 * ICL del mes: lee caché; si no hay exacto, scrape BCRA (mes actual) y reintenta; si sigue sin haber, último anterior (estimado).
 */
export async function obtenerICLParaMes(
  db: SupabaseClient,
  mesPrimero: string,
): Promise<{ valor: number; fecha: string; es_estimado: boolean } | null> {
  const ex = await selectICLExacto(db, mesPrimero);
  if (ex) return { ...ex, es_estimado: false };

  await sincronizarICLDesdeFuente(db);
  const ex2 = await selectICLExacto(db, mesPrimero);
  if (ex2) return { ...ex2, es_estimado: false };

  const prev = await selectICLAnterior(db, mesPrimero);
  if (!prev) return null;
  return { ...prev, es_estimado: true };
}
