/**
 * GET /api/cron/calcular-aumentos
 * Sincroniza historico_indices (IPC + ICL) y pre-calcula aumentos del mes.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sincronizarTodo } from "@/lib/indices/historico-indices";
import { precalcularAumentosMes } from "@/app/actions/calcular-aumento";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const log: Record<string, unknown> = { inicio: new Date().toISOString() };

  try {
    const sync = await sincronizarTodo(db, 12);
    log.indices = sync;
  } catch (e) {
    log.indices = { ok: false, error: String(e) };
    console.error("[cron/calcular-aumentos] indices sync error:", e);
  }

  try {
    log.aumentos = await precalcularAumentosMes();
  } catch (e) {
    log.aumentos = { ok: false, error: String(e) };
    console.error("[cron/calcular-aumentos] pre-calcular error:", e);
  }

  log.fin = new Date().toISOString();
  console.info("[cron/calcular-aumentos]", JSON.stringify(log));

  return NextResponse.json({ ok: true, log });
}
