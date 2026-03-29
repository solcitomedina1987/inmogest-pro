"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { ERROR_CONTRATO_VIGENTE_INQUILINO, type DeactivateClienteResult } from "@/lib/clientes/deactivate-cliente";
import { clienteFormSchema, toClienteInsertPayload } from "@/lib/validations/cliente";

export type ClienteActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

const deactivateOptionsSchema = z.object({
  cascadePropiedades: z.boolean().optional(),
});

function fechaHoyBuenosAires(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

export async function createCliente(input: unknown): Promise<ClienteActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const parsed = clienteFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }
  const row = toClienteInsertPayload(parsed.data);
  const { error } = await gate.supabase.from("clientes").insert({
    ...row,
    dni: Number(row.dni),
    is_active: true,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard/cobranzas");
  return { ok: true };
}

export async function updateCliente(input: unknown): Promise<ClienteActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const schema = z.object({ id: idSchema }).and(clienteFormSchema);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }
  const { id, is_active, ...rest } = parsed.data;
  const row = toClienteInsertPayload({ ...rest, is_active });
  const { error } = await gate.supabase
    .from("clientes")
    .update({
      ...row,
      dni: Number(row.dni),
      is_active,
    })
    .eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard");
  return { ok: true };
}

async function tieneContratoVigenteComoInquilino(
  supabase: SupabaseClient,
  clienteId: string,
  hoy: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("contratos_cobranza")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("is_active", true)
    .gt("fecha_vencimiento", hoy)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data != null;
}

async function countPropiedadesActivasPropietario(
  supabase: SupabaseClient,
  propietarioId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("propiedades")
    .select("id", { count: "exact", head: true })
    .eq("propietario_id", propietarioId)
    .eq("is_active", true);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function deactivateCliente(
  id: unknown,
  options?: unknown,
): Promise<DeactivateClienteResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const pid = idSchema.safeParse(id);
  if (!pid.success) {
    return { ok: false, error: "Cliente inválido" };
  }
  const opts = deactivateOptionsSchema.safeParse(options ?? {});
  const cascadePropiedades = opts.success ? Boolean(opts.data.cascadePropiedades) : false;

  const hoy = fechaHoyBuenosAires();

  const { data: cliente, error: fetchErr } = await gate.supabase
    .from("clientes")
    .select("id, tipo_cliente, is_active")
    .eq("id", pid.data)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }
  if (!cliente) {
    return { ok: false, error: "Cliente no encontrado" };
  }
  if (!cliente.is_active) {
    return { ok: true };
  }

  const tipo = cliente.tipo_cliente as string;
  const rolInquilino = tipo === "Inquilino" || tipo === "Ambos";
  const rolPropietario = tipo === "Propietario" || tipo === "Ambos";

  try {
    if (rolInquilino) {
      const bloqueado = await tieneContratoVigenteComoInquilino(gate.supabase, pid.data, hoy);
      if (bloqueado) {
        return { ok: false, code: "CONTRATO_VIGENTE", error: ERROR_CONTRATO_VIGENTE_INQUILINO };
      }
    }

    if (rolPropietario) {
      const n = await countPropiedadesActivasPropietario(gate.supabase, pid.data);
      if (n > 0 && !cascadePropiedades) {
        return { ok: false, code: "CASCADE_REQUIRED", activeProperties: n };
      }
      if (n > 0 && cascadePropiedades) {
        const { error: propErr } = await gate.supabase
          .from("propiedades")
          .update({ is_active: false })
          .eq("propietario_id", pid.data)
          .eq("is_active", true);
        if (propErr) {
          return { ok: false, error: propErr.message };
        }
      }
    }

    const { error: upErr } = await gate.supabase
      .from("clientes")
      .update({ is_active: false })
      .eq("id", pid.data);
    if (upErr) {
      return { ok: false, error: upErr.message };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al procesar la baja" };
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard/cobranzas");
  revalidatePath("/dashboard");
  return { ok: true };
}
