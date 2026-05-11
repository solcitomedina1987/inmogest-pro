"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeInformeRendicion } from "@/lib/informes/compute-rendicion";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type InformeActionResult = { ok: true; id: string } | { ok: false; error: string };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const generarSchema = z.object({
  propietario_cliente_id: z.string().uuid(),
  mes_periodo: z.string().regex(/^\d{4}-\d{2}$/),
  comision_porcentaje: z.coerce.number().min(0).max(100),
});

export async function generarInformeRendicion(input: unknown): Promise<InformeActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const { supabase } = gate;

  const parsed = generarSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const comp = await computeInformeRendicion(supabase, parsed.data);
  if (!comp.ok) {
    return { ok: false, error: comp.error };
  }

  const payload = comp.payload;
  const brutoCobrado = round2(
    payload.unidades.reduce((s, u) => s + u.subtotal_cobrado_inquilino, 0) + payload.total_suma_inmobiliaria_conceptos,
  );
  const netoRendir = payload.total_a_rendir_propietario;
  const { data: ins, error } = await supabase
    .from("informes_rendicion")
    .insert({
      propietario_cliente_id: parsed.data.propietario_cliente_id,
      mes_periodo: parsed.data.mes_periodo,
      comision_porcentaje: parsed.data.comision_porcentaje,
      monto_total: brutoCobrado,
      neto_rendir: netoRendir,
      payload,
      deleted_at: null,
    })
    .select("id")
    .single();

  if (error || !ins) {
    return { ok: false, error: error?.message ?? "No se pudo guardar el informe." };
  }

  revalidatePath("/dashboard/informes");
  return { ok: true, id: ins.id as string };
}

const idSchema = z.string().uuid();

export type InformeArchiveResult = { ok: true } | { ok: false; error: string };

/** Archiva el informe (baja lógica). */
export async function archivarInformeRendicion(informeId: unknown): Promise<InformeArchiveResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const parsed = idSchema.safeParse(informeId);
  if (!parsed.success) return { ok: false, error: "Identificador inválido." };

  const { error } = await gate.supabase
    .from("informes_rendicion")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/informes");
  revalidatePath(`/dashboard/informes/${parsed.data}`);
  return { ok: true };
}

/** Restaura un informe archivado. */
export async function restaurarInformeRendicion(informeId: unknown): Promise<InformeArchiveResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const parsed = idSchema.safeParse(informeId);
  if (!parsed.success) return { ok: false, error: "Identificador inválido." };

  const { error } = await gate.supabase
    .from("informes_rendicion")
    .update({ deleted_at: null })
    .eq("id", parsed.data)
    .not("deleted_at", "is", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/informes");
  revalidatePath(`/dashboard/informes/${parsed.data}`);
  return { ok: true };
}

