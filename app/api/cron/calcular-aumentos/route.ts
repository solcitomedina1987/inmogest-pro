/**
 * GET /api/cron/calcular-aumentos
 * Ejecutado el día 1 de cada mes por Vercel Cron (vercel.json).
 * 1) Sincroniza índices ICL + IPC.
 * 2) Pre-calcula aumentos para contratos con actualización este mes.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchICL, fetchIPC } from "@/lib/indices/fetcher";
import { precalcularAumentosMes } from "@/app/actions/calcular-aumento";

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  // Validar secret de Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const log: Record<string, unknown> = { inicio: new Date().toISOString() };

  /* 1. Sincronizar ICL */
  try {
    const hasta = yyyymmdd(new Date());
    const desde = yyyymmdd(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
    const valores = await fetchICL(desde, hasta);
    if (valores.length > 0) {
      await db.from("indices_economicos").upsert(
        valores.map((v) => ({ tipo: "ICL", fecha: v.fecha, valor: v.valor, fuente: "BCRA", es_estimado: false })),
        { onConflict: "tipo,fecha" },
      );
    }
    log.icl = { ok: true, registros: valores.length };
  } catch (e) {
    log.icl = { ok: false, error: String(e) };
    console.error("[cron/calcular-aumentos] ICL sync error:", e);
  }

  /* 2. Sincronizar IPC */
  try {
    const valores = await fetchIPC(6);
    if (valores.length > 0) {
      await db.from("indices_economicos").upsert(
        valores.map((v) => ({ tipo: "IPC", fecha: v.fecha, valor: v.valor, fuente: "INDEC", es_estimado: false })),
        { onConflict: "tipo,fecha" },
      );
    }
    log.ipc = { ok: true, registros: valores.length };
  } catch (e) {
    log.ipc = { ok: false, error: String(e) };
    console.error("[cron/calcular-aumentos] IPC sync error:", e);
  }

  /* 3. Pre-calcular aumentos del mes */
  try {
    const resultado = await precalcularAumentosMes();
    log.aumentos = resultado;
  } catch (e) {
    log.aumentos = { ok: false, error: String(e) };
    console.error("[cron/calcular-aumentos] pre-calcular error:", e);
  }

  log.fin = new Date().toISOString();
  console.info("[cron/calcular-aumentos]", JSON.stringify(log));

  return NextResponse.json({ ok: true, log });
}
