import type { SupabaseClient } from "@supabase/supabase-js";
import { impactoDbToImpactoPago } from "@/lib/config-global/impacto-catalogo";
import type { ExtraInputConstruirDetalle } from "@/lib/cobranzas/detalle-pago";

export type ExtraFormConceptoPago = {
  concepto_pago_id: number;
  monto: number;
  observaciones?: string | null;
};

/**
 * Resuelve cada fila extra contra `conceptos_pago` (activo) y arma el input para `construirDetallePagoV2`.
 * Una sola consulta por lote de ids.
 */
export async function extrasConstruirDetalleDesdeCatalogo(
  supabase: SupabaseClient,
  extras: ExtraFormConceptoPago[],
): Promise<{ ok: false; error: string } | { ok: true; extras: ExtraInputConstruirDetalle[] }> {
  const filtrados = extras.filter((e) => Number(e.monto) > 0);
  if (filtrados.length === 0) {
    return { ok: true, extras: [] };
  }

  for (const e of filtrados) {
    const id = Number(e.concepto_pago_id);
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: "Cada concepto adicional debe tener un concepto válido seleccionado." };
    }
  }

  const ids = [...new Set(filtrados.map((e) => Number(e.concepto_pago_id)))];

  const { data: rows, error } = await supabase
    .from("conceptos_pago")
    .select("id,nombre,impacto,slug,deleted_at")
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  const byId = new Map(
    (rows ?? []).map((r) => {
      const row = r as {
        id: number;
        nombre: string;
        impacto: string;
        slug: string | null;
        deleted_at: string | null;
      };
      return [row.id, row] as const;
    }),
  );

  const out: ExtraInputConstruirDetalle[] = [];
  for (const e of filtrados) {
    const id = Number(e.concepto_pago_id);
    const row = byId.get(id);
    if (!row) {
      return { ok: false, error: `Concepto de pago inválido (id ${id}).` };
    }
    if (row.deleted_at) {
      return {
        ok: false,
        error: `El concepto "${row.nombre.trim()}" fue dado de baja. Elegí otro concepto o quitá esa fila.`,
      };
    }
    out.push({
      concepto_pago_id: row.id,
      concepto_label: row.nombre.trim(),
      slug: row.slug,
      monto: e.monto,
      observaciones: e.observaciones ?? null,
      impacto: impactoDbToImpactoPago(row.impacto),
    });
  }
  return { ok: true, extras: out };
}
