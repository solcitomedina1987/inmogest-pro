"use server";

import { revalidatePath } from "next/cache";
import { vendorCreateSchema, vendorUpdateSchema } from "@/lib/validations/vendor";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type VendorActionResult = { ok: true } | { ok: false; error: string };

export async function createVendor(input: unknown): Promise<VendorActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  const parsed = vendorCreateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;
  const { error } = await supabase.from("vendors").insert({
    nombre_apellido: v.nombre_apellido,
    telefono: v.telefono,
    profesion: v.profesion,
    notas: v.notas?.trim() ? v.notas.trim() : null,
    is_active: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/proveedores");
  return { ok: true };
}

export async function updateVendor(input: unknown): Promise<VendorActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  const parsed = vendorUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const v = parsed.data;
  const { error } = await supabase
    .from("vendors")
    .update({
      nombre_apellido: v.nombre_apellido,
      telefono: v.telefono,
      profesion: v.profesion,
      notas: v.notas?.trim() ? v.notas.trim() : null,
      is_active: v.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", v.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/proveedores");
  return { ok: true };
}

export async function deactivateVendor(id: string): Promise<VendorActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      error: gate.code === "no-auth" ? "Iniciá sesión para continuar." : "No tenés permisos para esta acción.",
    };
  }
  const { supabase } = gate;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Proveedor inválido." };
  }

  const { error } = await supabase
    .from("vendors")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/proveedores");
  return { ok: true };
}
