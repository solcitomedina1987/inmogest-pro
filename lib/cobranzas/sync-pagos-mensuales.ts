import type { SupabaseClient } from "@supabase/supabase-js";
import { mesesPeriodoEntreFechasContrato } from "@/lib/cobranzas/meses-contrato";

/**
 * Garantiza una fila `pagos` Pendiente por cada mes entre inicio y vencimiento del contrato (idempotente).
 */
export async function ensurePagosMensualesExistentes(
  supabase: SupabaseClient,
  contratoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: contrato, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select("fecha_inicio, fecha_vencimiento, monto_mensual")
    .eq("id", contratoId)
    .maybeSingle();

  if (cErr || !contrato) {
    return { ok: false, error: cErr?.message ?? "Contrato no encontrado." };
  }

  const fi = contrato.fecha_inicio as string;
  const fv = contrato.fecha_vencimiento as string;
  const meses = mesesPeriodoEntreFechasContrato(fi, fv);

  const { data: pagosRows, error: pErr } = await supabase
    .from("pagos")
    .select("mes_periodo")
    .eq("contrato_id", contratoId);

  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  const existing = new Set((pagosRows ?? []).map((r) => r.mes_periodo as string));
  const faltantes = meses.filter((mes) => !existing.has(mes));

  if (faltantes.length === 0) {
    return { ok: true };
  }

  const monto = Number(contrato.monto_mensual);
  const insertRows = faltantes.map((mes_periodo) => ({
    contrato_id: contratoId,
    mes_periodo,
    monto_esperado: monto,
    estado: "Pendiente" as const,
  }));

  const { error: insErr } = await supabase.from("pagos").insert(insertRows);

  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  return { ok: true };
}
