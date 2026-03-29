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

const updatePerfilSchema = z.object({
  id: uuid,
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(200),
  rol: z.enum(PERFIL_ROLES_EDITABLES),
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
  const { id, nombre, rol } = parsed.data;

  if (id === gate.user.id && rol !== "admin") {
    return { ok: false, error: "No podés quitarte el rol de administrador a vos mismo." };
  }

  const { error } = await gate.supabase
    .from("perfiles")
    .update({
      nombre,
      rol,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin-usuarios");
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

  let service;
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

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
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
      email,
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
    email,
    options: {
      emailRedirectTo: callback,
    },
  });

  revalidatePath("/dashboard/admin-usuarios");

  if (resendErr) {
    return { ok: true as const, signupEmailSent: false };
  }

  return { ok: true as const, signupEmailSent: true };
}
