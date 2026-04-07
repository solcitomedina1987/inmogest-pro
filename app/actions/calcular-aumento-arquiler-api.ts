"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { proximoMesActualizacionPrimerDia } from "@/lib/cobranzas/estado-contrato";
import { calculateRentalIncrease } from "@/lib/indices/calculator";
import { calcularSiguienteActualizacionArquilerApi } from "@/lib/indices/arquiler-icl";
import type { ResultadoICLArquilerContrato } from "@/lib/indices/arquiler-icl";
import type { TipoIndice } from "@/lib/indices/types";
import { fetchArquilerCalculatei, isArquilerApiConfigured } from "@/lib/services/arquiler-api";

/**
 * Calcula el aumento con POST /calculatei (Arquiler API) cuando aplica; si no, serie ICL cacheada o cálculo local.
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

  const indice = (row.indice_actualizacion as string) === "IPC" ? "IPC" : "ICL";
  const montoActual = Number(row.monto_mensual);
  const mesesAct = Number(row.meses_actualizacion);

  const contratoMin = {
    id: row.id as string,
    fecha_inicio: row.fecha_inicio as string,
    fecha_vencimiento: row.fecha_vencimiento as string,
    monto_mensual: montoActual,
    meses_actualizacion: mesesAct,
    indice_actualizacion: indice as TipoIndice,
    ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
  };

  let resultado: ResultadoICLArquilerContrato;

  const mesAjuste = proximoMesActualizacionPrimerDia(
    row.fecha_inicio as string,
    row.fecha_vencimiento as string,
    mesesAct,
    (row.ultima_actualizacion as string) ?? null,
  );

  if (isArquilerApiConfigured() && mesAjuste != null) {
    const rate = indice === "IPC" ? "ipc" : "icl";
    const apiValor = await fetchArquilerCalculatei({
      amount: montoActual,
      date: mesAjuste,
      months: mesesAct,
      rate,
    });
    if (apiValor != null && apiValor > 0) {
      const monto_sugerido = Math.round(apiValor * 100) / 100;
      const coeficiente = montoActual > 0 ? monto_sugerido / montoActual : 0;
      resultado = {
        ok: true,
        monto_actual: montoActual,
        monto_sugerido,
        coeficiente,
        indice_inicial: 0,
        indice_final: 0,
        fecha_icl_inicio: mesAjuste,
        fecha_icl_fin: mesAjuste,
        es_estimado: true,
        desglose_formula: `${montoActual} × (índice actual / índice inicio) — vía Arquiler API /calculatei`,
        detalle: "Resultado de la API Arquiler (valor estimado).",
      };
    } else {
      if (indice === "ICL") {
        resultado = await calcularSiguienteActualizacionArquilerApi(db, contratoMin);
      } else {
        const local = await calculateRentalIncrease(db, contratoMin);
        resultado = local.ok
          ? {
              ok: true,
              monto_actual: local.monto_actual,
              monto_sugerido: local.monto_sugerido,
              coeficiente: local.coeficiente,
              indice_inicial: local.indice_inicial,
              indice_final: local.indice_final,
              fecha_icl_inicio: local.fecha_ref,
              fecha_icl_fin: local.fecha_actualizacion,
              es_estimado: local.es_estimado,
              desglose_formula: local.detalle,
              detalle: local.detalle,
            }
          : { ok: false, error: local.error };
      }
    }
  } else {
    if (indice === "ICL") {
      resultado = await calcularSiguienteActualizacionArquilerApi(db, contratoMin);
    } else {
      const local = await calculateRentalIncrease(db, contratoMin);
      resultado = local.ok
        ? {
            ok: true,
            monto_actual: local.monto_actual,
            monto_sugerido: local.monto_sugerido,
            coeficiente: local.coeficiente,
            indice_inicial: local.indice_inicial,
            indice_final: local.indice_final,
            fecha_icl_inicio: local.fecha_ref,
            fecha_icl_fin: local.fecha_actualizacion,
            es_estimado: local.es_estimado,
            desglose_formula: local.detalle,
            detalle: local.detalle,
          }
        : { ok: false, error: local.error };
    }
  }

  if (resultado.ok) {
    const mesActualizacion = resultado.fecha_icl_fin.slice(0, 7);
    await db.from("aumentos_sugeridos").upsert(
      {
        contrato_id: contratoId,
        mes_actualizacion: mesActualizacion,
        monto_actual: resultado.monto_actual,
        monto_sugerido: resultado.monto_sugerido,
        coeficiente: resultado.coeficiente,
        indice_tipo: indice,
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
