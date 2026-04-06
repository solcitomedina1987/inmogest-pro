/**
 * POST /api/indices/sync
 * Sincroniza los índices ICL (BCRA) e IPC (INDEC) hacia la tabla indices_economicos.
 * - ICL: últimos 400 días desde hoy.
 * - IPC: últimos 24 meses.
 * Usa UPSERT para no duplicar ni perder datos existentes.
 * Solo accesible para admins.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchICL, fetchIPC } from "@/lib/indices/fetcher";

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sin autorización." }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const resultados: Record<string, unknown> = {};
  const errores: string[] = [];

  /* ── ICL (últimos 400 días) ── */
  try {
    const hasta = yyyymmdd(new Date());
    const desdeDate = new Date();
    desdeDate.setDate(desdeDate.getDate() - 400);
    const desde = yyyymmdd(desdeDate);

    const valores = await fetchICL(desde, hasta);

    if (valores.length > 0) {
      const rows = valores.map((v) => ({
        tipo: "ICL",
        fecha: v.fecha,
        valor: v.valor,
        fuente: "BCRA",
        es_estimado: false,
      }));

      const { error } = await db
        .from("indices_economicos")
        .upsert(rows, { onConflict: "tipo,fecha" });

      if (error) throw new Error(error.message);
      resultados.icl = { insertados: rows.length, desde, hasta };
    } else {
      resultados.icl = { insertados: 0, advertencia: "La API del BCRA no devolvió datos." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`ICL: ${msg}`);
    resultados.icl = { error: msg };
  }

  /* ── IPC (últimos 24 meses) ── */
  try {
    const valores = await fetchIPC(24);

    if (valores.length > 0) {
      const rows = valores.map((v) => ({
        tipo: "IPC",
        fecha: v.fecha,
        valor: v.valor,
        fuente: "INDEC",
        es_estimado: false,
      }));

      const { error } = await db
        .from("indices_economicos")
        .upsert(rows, { onConflict: "tipo,fecha" });

      if (error) throw new Error(error.message);
      resultados.ipc = { insertados: rows.length };
    } else {
      resultados.ipc = { insertados: 0, advertencia: "La API del INDEC no devolvió datos." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`IPC: ${msg}`);
    resultados.ipc = { error: msg };
  }

  const status = errores.length === 2 ? 500 : 200;
  return NextResponse.json({ ok: errores.length === 0, resultados, errores }, { status });
}
