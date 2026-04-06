/**
 * POST /api/indices/sync
 * IPC: últimos 12 meses desde datos.gob.ar (serie INVAR).
 * ICL: scraping tabla Principales Variables BCRA (mes corriente AR).
 * Persistencia: public.historico_indices (caché local).
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sincronizarTodo } from "@/lib/indices/historico-indices";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Sin autorización." }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const errores: string[] = [];

  const { ipc, icl } = await sincronizarTodo(db, 12);

  if (!ipc.ok && ipc.error) errores.push(`IPC: ${ipc.error}`);
  if (!icl.ok && icl.error) errores.push(`ICL: ${icl.error}`);

  const ok = ipc.ok && icl.ok;
  const status = !ipc.ok && !icl.ok ? 500 : 200;

  return NextResponse.json(
    {
      ok,
      resultados: {
        ipc: { registros: ipc.registros, ok: ipc.ok, error: ipc.error },
        icl: { fecha: icl.fecha, ok: icl.ok, error: icl.error },
      },
      errores,
    },
    { status },
  );
}
