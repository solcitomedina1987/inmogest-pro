"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PERFIL_ROLES_EDITABLES } from "@/lib/roles";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminUsuarioActionResult =
  | { ok: true; signupEmailSent?: boolean }
  | { ok: false; error: string };

const uuid = z.string().uuid();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function emailOcupadoEnPerfiles(
  service: ReturnType<typeof createServiceRoleClient>,
  email: string,
  exceptUserId?: string,
): Promise<boolean> {
  const norm = normalizeEmail(email);
  let q = service.from("perfiles").select("id").eq("email", norm);
  if (exceptUserId) {
    q = q.neq("id", exceptUserId);
  }
  const { data } = await q.maybeSingle();
  return data != null;
}

const updatePerfilSchema = z.object({
  id: uuid,
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(200),
  email: z.string().trim().email("Email inválido"),
  rol: z.enum(PERFIL_ROLES_EDITABLES),
  is_active: z.boolean(),
});

export async function updatePerfilUsuario(input: unknown): Promise<AdminUsuarioActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const parsed = updatePerfilSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }
  const { id, nombre, email, rol, is_active } = parsed.data;

  if (id === gate.user.id && rol !== "admin") {
    return { ok: false, error: "No podés quitarte el rol de administrador a vos mismo." };
  }

  if (id === gate.user.id && !is_active) {
    return { ok: false, error: "No podés desactivar tu propia cuenta." };
  }

  const normEmail = normalizeEmail(email);

  const ocupado = await emailOcupadoEnPerfiles(createServiceRoleClient(), normEmail, id);
  if (ocupado) {
    return { ok: false, error: "Ya existe otro usuario con ese email." };
  }

  let service: ReturnType<typeof createServiceRoleClient>;
  try {
    service = createServiceRoleClient();
  } catch {
    return {
      ok: false,
      error: "Falta SUPABASE_SERVICE_ROLE_KEY para actualizar el email en autenticación.",
    };
  }

  const { error: authErr } = await service.auth.admin.updateUserById(id, {
    email: normEmail,
  });

  if (authErr) {
    return { ok: false, error: authErr.message };
  }

  const deleted_at = is_active ? null : new Date().toISOString();

  const { error } = await gate.supabase
    .from("perfiles")
    .update({
      nombre,
      email: normEmail,
      rol,
      is_active,
      deleted_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin-general");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const toggleActivoSchema = z.object({
  id: uuid,
  is_active: z.boolean(),
});

/** Alterna solo `is_active` / `deleted_at` (sin tocar email ni Auth). */
export async function toggleUsuarioActivo(input: unknown): Promise<AdminUsuarioActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }
  const parsed = toggleActivoSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }
  const { id, is_active } = parsed.data;

  if (id === gate.user.id && !is_active) {
    return { ok: false, error: "No podés desactivar tu propia cuenta." };
  }

  const deleted_at = is_active ? null : new Date().toISOString();

  const { error } = await gate.supabase
    .from("perfiles")
    .update({
      is_active,
      deleted_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin-general");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const nuevoUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre obligatorio").max(200),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(PERFIL_ROLES_EDITABLES),
});

/**
 * Crea usuario en Auth (email sin confirmar) y ajusta `perfiles`.
 * Reenvía email de confirmación tipo alta (signup).
 */
export async function crearUsuarioDesdeAdmin(input: unknown): Promise<AdminUsuarioActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, error: gate.code === "no-auth" ? "Iniciá sesión." : "Sin permisos." };
  }

  const parsed = nuevoUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  let service: ReturnType<typeof createServiceRoleClient>;
  try {
    service = createServiceRoleClient();
  } catch {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para invitar usuarios.",
    };
  }

  const { nombre, email, password, rol } = parsed.data;
  const normEmail = normalizeEmail(email);

  if (await emailOcupadoEnPerfiles(service, normEmail)) {
    return { ok: false, error: "Ya existe un usuario con ese email." };
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: normEmail,
    password,
    email_confirm: false,
    user_metadata: { nombre },
  });

  if (createErr) {
    return { ok: false, error: createErr.message };
  }
  if (!created.user?.id) {
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  const uid = created.user.id;

  const { error: perfilErr } = await service
    .from("perfiles")
    .update({
      nombre,
      rol,
      email: normEmail,
      is_active: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);

  if (perfilErr) {
    return { ok: false, error: `Usuario creado pero error al actualizar perfil: ${perfilErr.message}` };
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const callback = `${site}/auth/callback?${new URLSearchParams({
    next: "/dashboard",
    type: "signup",
  }).toString()}`;

  const { error: resendErr } = await service.auth.resend({
    type: "signup",
    email: normEmail,
    options: {
      emailRedirectTo: callback,
    },
  });

  revalidatePath("/dashboard/admin-general");

  if (resendErr) {
    return { ok: true as const, signupEmailSent: false };
  }

  return { ok: true as const, signupEmailSent: true };
}
