"use server";

import { z } from "zod";
import { parseInformeRendicionPayload } from "@/lib/informes/parse-informe-payload";
import {
  exportInformeRendicionV4ToGoogleSheets,
  googleSheetsRendicionExportConfigurado,
} from "@/lib/informes/sheets-rendicion-export";
import { requireAdmin } from "@/lib/supabase/require-admin";

const idSchema = z.string().uuid();

export type SincronizarSheetsResult =
  | { ok: true; sheetTitle: string }
  | { ok: false; error: string };

/** Exporta el informe a la pestaña YYYY-MM del spreadsheet configurado (upsert por Propiedad + Inquilino). */
export async function sincronizarInformeRendicionGoogleSheets(informeId: unknown): Promise<SincronizarSheetsResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  if (!googleSheetsRendicionExportConfigurado()) {
    return {
      ok: false,
      error: "Google no está configurado. Revisá GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY en el servidor.",
    };
  }

  const parsed = idSchema.safeParse(informeId);
  if (!parsed.success) return { ok: false, error: "Identificador inválido." };

  const { data: row, error } = await gate.supabase
    .from("informes_rendicion")
    .select("id, payload, deleted_at")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !row?.payload) {
    return { ok: false, error: "Informe no encontrado." };
  }
  if (row.deleted_at) {
    return { ok: false, error: "No se puede exportar un informe archivado." };
  }

  const payload = parseInformeRendicionPayload(row.payload);
  if (!payload || payload.v !== 4) {
    return { ok: false, error: "Solo se exportan informes en formato actual (v4)." };
  }

  return exportInformeRendicionV4ToGoogleSheets(payload);
}
