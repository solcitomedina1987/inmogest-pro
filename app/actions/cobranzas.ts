"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { mesPeriodoActual, mesPeriodoDesdeFecha } from "@/lib/cobranzas/estado-contrato";
import { mesesPeriodoEntreFechasContrato } from "@/lib/cobranzas/meses-contrato";
import { contratoCobranzaSchema } from "@/lib/validations/contrato-cobranza";
import { registroPagoSchema, editarPagoSchema } from "@/lib/validations/registro-pago";
import { updateContratoCobranzaSchema } from "@/lib/validations/update-contrato-cobranza";

export type CobranzaActionResult = { ok: true } | { ok: false; error: string };

export async function createContratoCobranza(input: unknown): Promise<CobranzaActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos.",
    };
  }
  const { supabase } = gate;

  const parsed = contratoCobranzaSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;

  const { data: created, error: insErr } = await supabase
    .from("contratos_cobranza")
    .insert({
      propiedad_id: v.propiedad_id,
      cliente_id: v.cliente_id,
      locador_id: v.locador_id,
      fecha_inicio: v.fecha_inicio,
      fecha_vencimiento: v.fecha_vencimiento,
      monto_mensual: v.monto_mensual,
      dia_limite_pago: v.dia_limite_pago,
      meses_actualizacion: v.meses_actualizacion,
      ultima_actualizacion: null,
      is_active: true,
    })
    .select("id")
    .single();

  if (insErr || !created) {
    return { ok: false, error: insErr?.message ?? "No se pudo crear el contrato." };
  }

  const contratoId = created.id as string;
  const meses = mesesPeriodoEntreFechasContrato(v.fecha_inicio, v.fecha_vencimiento);
  if (meses.length > 0) {
    const pagosRows = meses.map((mes_periodo) => ({
      contrato_id: contratoId,
      mes_periodo,
      monto_esperado: v.monto_mensual,
      estado: "Pendiente" as const,
    }));
    const { error: pagoErr } = await supabase.from("pagos").insert(pagosRows);
    if (pagoErr) {
      return { ok: false, error: pagoErr.message };
    }
  }

  revalidatePath("/dashboard/cobranzas");
  return { ok: true };
}

export async function registrarPagoContrato(input: unknown): Promise<CobranzaActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos.",
    };
  }
  const { supabase } = gate;

  const parsed = registroPagoSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;
  // mes_periodo viene explícito del formulario (fila seleccionada), NO se deriva de fecha_pago
  const { mes_periodo } = v;

  const { data: contrato, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select("id, monto_mensual, is_active")
    .eq("id", v.contrato_id)
    .maybeSingle();

  if (cErr || !contrato || !contrato.is_active) {
    return { ok: false, error: "Contrato no encontrado o inactivo." };
  }

  const montoMensual = Number(contrato.monto_mensual);

  const { data: existente } = await supabase
    .from("pagos")
    .select("id, monto_esperado")
    .eq("contrato_id", v.contrato_id)
    .eq("mes_periodo", mes_periodo)
    .maybeSingle();

  const monto_esperado =
    existente?.monto_esperado != null ? Number(existente.monto_esperado) : montoMensual;
  const estado = v.monto_pagado >= monto_esperado ? "Pagado" : "Pendiente";

  const payload = {
    contrato_id: v.contrato_id,
    mes_periodo,
    monto_esperado,
    monto_pagado: v.monto_pagado,
    fecha_pago_realizado: v.fecha_pago,
    forma_pago: v.forma_pago,
    observaciones: v.observaciones?.trim() || null,
    estado,
  };

  if (existente?.id) {
    const { error: upErr } = await supabase.from("pagos").update(payload).eq("id", existente.id);
    if (upErr) return { ok: false, error: upErr.message };
  } else {
    const { error: insErr } = await supabase.from("pagos").insert(payload);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/dashboard/cobranzas");
  revalidatePath(`/dashboard/cobranzas/${v.contrato_id}`);
  return { ok: true };
}

/** Edita los datos de un pago ya registrado (fecha real, monto, forma, notas). */
export async function editarPago(input: unknown): Promise<CobranzaActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const { supabase } = gate;

  const parsed = editarPagoSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;

  const { data: pago, error: pErr } = await supabase
    .from("pagos")
    .select("id, monto_esperado")
    .eq("id", v.pago_id)
    .maybeSingle();

  if (pErr || !pago) return { ok: false, error: "Pago no encontrado." };

  const monto_esperado = Number(pago.monto_esperado);
  const estado = v.monto_pagado >= monto_esperado ? "Pagado" : "Pendiente";

  const { error: upErr } = await supabase
    .from("pagos")
    .update({
      monto_pagado: v.monto_pagado,
      fecha_pago_realizado: v.fecha_pago,
      forma_pago: v.forma_pago,
      observaciones: v.observaciones?.trim() || null,
      estado,
    })
    .eq("id", v.pago_id);

  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/dashboard/cobranzas");
  revalidatePath(`/dashboard/cobranzas/${v.contrato_id}`);
  return { ok: true };
}

/** Anula un pago: vuelve el período a 'Pendiente' limpiando los datos de cobro. */
export async function anularPago(
  pagoId: string,
  contratoId: string,
): Promise<CobranzaActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const { supabase } = gate;

  if (!pagoId || !contratoId) return { ok: false, error: "Datos inválidos." };

  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "Pendiente",
      monto_pagado: null,
      fecha_pago_realizado: null,
      forma_pago: null,
      observaciones: null,
    })
    .eq("id", pagoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/cobranzas");
  revalidatePath(`/dashboard/cobranzas/${contratoId}`);
  return { ok: true };
}

/**
 * Actualiza un contrato de cobranzas (`contratos_cobranza`).
 * Si cambia el monto mensual, opcionalmente recalcula `monto_esperado` en cuotas pendientes (mes actual y/o futuros).
 */
export async function updateContract(input: unknown): Promise<CobranzaActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos.",
    };
  }
  const { supabase } = gate;

  const parsed = updateContratoCobranzaSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;

  const { data: existente, error: exErr } = await supabase
    .from("contratos_cobranza")
    .select("id, fecha_inicio, monto_mensual")
    .eq("id", v.contrato_id)
    .maybeSingle();

  if (exErr || !existente) {
    return { ok: false, error: "Contrato no encontrado." };
  }

  const fechaInicio = existente.fecha_inicio as string;
  if (v.fecha_vencimiento <= fechaInicio) {
    return {
      ok: false,
      error: "La fecha de vencimiento debe ser posterior a la fecha de inicio original del contrato.",
    };
  }

  const montoAnterior = Number(existente.monto_mensual);
  const montoCambio = Math.abs(montoAnterior - v.monto_mensual) > 0.005;

  const { error: upErr } = await supabase
    .from("contratos_cobranza")
    .update({
      monto_mensual: v.monto_mensual,
      dia_limite_pago: v.dia_limite_pago,
      fecha_vencimiento: v.fecha_vencimiento,
      meses_actualizacion: v.meses_actualizacion,
      is_active: v.is_active,
    })
    .eq("id", v.contrato_id);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  if (montoCambio) {
    const mes = mesPeriodoActual();
    const builder = () =>
      supabase
        .from("pagos")
        .update({ monto_esperado: v.monto_mensual })
        .eq("contrato_id", v.contrato_id)
        .eq("estado", "Pendiente");

    const { error: pErr } = v.actualizar_monto_mes_actual
      ? await builder().gte("mes_periodo", mes)
      : await builder().gt("mes_periodo", mes);

    if (pErr) {
      return { ok: false, error: pErr.message };
    }
  }

  revalidatePath("/dashboard/cobranzas");
  revalidatePath(`/dashboard/cobranzas/${v.contrato_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
