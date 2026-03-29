"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/supabase/require-staff";
import { clienteFormSchema, toClienteInsertPayload } from "@/lib/validations/cliente";

export type ClienteActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();

export async function createCliente(input: unknown): Promise<ClienteActionResult> {
  const gate = await requireStaff();
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
  const gate = await requireStaff();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const schema = z.object({ id: idSchema }).and(clienteFormSchema);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }
  const { id, ...rest } = parsed.data;
  const row = toClienteInsertPayload(rest);
  const { error } = await gate.supabase
    .from("clientes")
    .update({
      ...row,
      dni: Number(row.dni),
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

export async function deactivateCliente(id: unknown): Promise<ClienteActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const pid = idSchema.safeParse(id);
  if (!pid.success) {
    return { ok: false, error: "Cliente inválido" };
  }
  const { error } = await gate.supabase.from("clientes").update({ is_active: false }).eq("id", pid.data);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/propiedades");
  revalidatePath("/dashboard/cobranzas");
  return { ok: true };
}
