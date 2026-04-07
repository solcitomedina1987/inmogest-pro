"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { calcularSiguienteActualizacionArquilerApi } from "@/lib/indices/arquiler-icl";
import type { ResultadoICLArquilerContrato } from "@/lib/indices/arquiler-icl";

/**
 * Calcula el aumento con la serie ICL de Arquiler API (RapidAPI) y persiste en aumentos_sugeridos.
 */
export async function calcularAumentoArquilerApi(
  contratoId: string,
): Promise<ResultadoICLArquilerContrato> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { ok: false, error: "Sin autorización." };
  }

  const db = createServiceRoleClient();

  const { data: row, error: cErr } = await db
    .from("contratos_cobranza")
    .select(
      "id, fecha_inicio, fecha_vencimiento, monto_mensual, meses_actualizacion, indice_actualizacion, ultima_actualizacion",
    )
    .eq("id", contratoId)
    .maybeSingle();

  if (cErr || !row) {
    return { ok: false, error: "Contrato no encontrado." };
  }

  if ((row.indice_actualizacion as string) !== "ICL") {
    return {
      ok: false,
      error: "Arquiler API aplica solo a contratos con índice ICL.",
    };
  }

  const resultado = await calcularSiguienteActualizacionArquilerApi(db, {
    fecha_inicio: row.fecha_inicio as string,
    fecha_vencimiento: row.fecha_vencimiento as string,
    monto_mensual: Number(row.monto_mensual),
    meses_actualizacion: Number(row.meses_actualizacion),
    ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
  });

  if (resultado.ok) {
    const mesActualizacion = resultado.fecha_icl_fin.slice(0, 7);
    await db.from("aumentos_sugeridos").upsert(
      {
        contrato_id: contratoId,
        mes_actualizacion: mesActualizacion,
        monto_actual: resultado.monto_actual,
        monto_sugerido: resultado.monto_sugerido,
        coeficiente: resultado.coeficiente,
        indice_tipo: "ICL",
        indice_inicial: resultado.indice_inicial,
        indice_final: resultado.indice_final,
        es_estimado: resultado.es_estimado,
        calculado_at: new Date().toISOString(),
      },
      { onConflict: "contrato_id,mes_actualizacion" },
    );
  }

  return resultado;
}
