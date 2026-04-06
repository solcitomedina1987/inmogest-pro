"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { calculateRentalIncrease } from "@/lib/indices/calculator";
import type { ResultadoCalculo, TipoIndice } from "@/lib/indices/types";

/**
 * Calcula el aumento de alquiler para un contrato dado.
 * Guarda el resultado en aumentos_sugeridos (upsert por contrato+mes).
 */
export async function calcularAumento(contratoId: string): Promise<ResultadoCalculo> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { ok: false, error: "Sin autorización." };
  }

  const db = createServiceRoleClient();

  // Cargar contrato
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

  const contrato = {
    id: row.id as string,
    fecha_inicio: row.fecha_inicio as string,
    fecha_vencimiento: row.fecha_vencimiento as string,
    monto_mensual: Number(row.monto_mensual),
    meses_actualizacion: Number(row.meses_actualizacion),
    indice_actualizacion: (row.indice_actualizacion as TipoIndice) ?? "ICL",
    ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
  };

  const resultado = await calculateRentalIncrease(db, contrato);

  if (resultado.ok) {
    // Calcular el mes_actualizacion
    const mesActualizacion = resultado.fecha_actualizacion.slice(0, 7);

    await db.from("aumentos_sugeridos").upsert(
      {
        contrato_id: contratoId,
        mes_actualizacion: mesActualizacion,
        monto_actual: resultado.monto_actual,
        monto_sugerido: resultado.monto_sugerido,
        coeficiente: resultado.coeficiente,
        indice_tipo: resultado.indice_tipo,
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

/**
 * Pre-calcula aumentos para TODOS los contratos activos que tienen actualización este mes.
 * Llamado por el cron job el día 1 de cada mes.
 */
export async function precalcularAumentosMes(): Promise<{
  procesados: number;
  exitosos: number;
  errores: string[];
}> {
  const db = createServiceRoleClient();

  const { data: contratos, error } = await db
    .from("contratos_cobranza")
    .select(
      "id, fecha_inicio, fecha_vencimiento, monto_mensual, meses_actualizacion, indice_actualizacion, ultima_actualizacion",
    )
    .eq("is_active", true);

  if (error || !contratos) {
    return { procesados: 0, exitosos: 0, errores: [error?.message ?? "Error cargando contratos"] };
  }

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  let exitosos = 0;
  const errores: string[] = [];

  for (const row of contratos) {
    const contrato = {
      id: row.id as string,
      fecha_inicio: row.fecha_inicio as string,
      fecha_vencimiento: row.fecha_vencimiento as string,
      monto_mensual: Number(row.monto_mensual),
      meses_actualizacion: Number(row.meses_actualizacion),
      indice_actualizacion: (row.indice_actualizacion as TipoIndice) ?? "ICL",
      ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
    };

    const resultado = await calculateRentalIncrease(db, contrato);

    if (resultado.ok) {
      const mesCal = resultado.fecha_actualizacion.slice(0, 7);
      if (mesCal !== mesActual) continue; // solo mes actual

      await db.from("aumentos_sugeridos").upsert(
        {
          contrato_id: contrato.id,
          mes_actualizacion: mesCal,
          monto_actual: resultado.monto_actual,
          monto_sugerido: resultado.monto_sugerido,
          coeficiente: resultado.coeficiente,
          indice_tipo: resultado.indice_tipo,
          indice_inicial: resultado.indice_inicial,
          indice_final: resultado.indice_final,
          es_estimado: resultado.es_estimado,
          calculado_at: new Date().toISOString(),
        },
        { onConflict: "contrato_id,mes_actualizacion" },
      );
      exitosos++;
    }
  }

  return { procesados: contratos.length, exitosos, errores };
}
