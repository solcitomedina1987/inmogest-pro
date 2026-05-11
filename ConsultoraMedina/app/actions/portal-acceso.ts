"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Result =
  | { ok: true; created: boolean } // created=true → nuevo usuario; false → contraseña actualizada
  | { ok: false; error: string };

/**
 * Crea (o restablece) el acceso al Portal de Inquilinos para un cliente.
 * - email   → campo `email` del cliente
 * - password → DNI del cliente (convertido a string)
 * Solo ejecutable por admins.
 */
export async function crearAccesoPortal(clienteId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { ok: false, error: "Sin autorización." };
  }

  /* Obtener datos del cliente */
  const { data: cliente, error: cErr } = await auth.supabase
    .from("clientes")
    .select("id, email, dni, tipo_cliente")
    .eq("id", clienteId)
    .maybeSingle();

  if (cErr || !cliente) {
    return { ok: false, error: "Cliente no encontrado." };
  }

  if (!cliente.email) {
    return { ok: false, error: "El cliente no tiene email registrado. Agregalo primero." };
  }

  if (!cliente.dni) {
    return { ok: false, error: "El cliente no tiene DNI registrado. Agregalo primero." };
  }

  const password = String(cliente.dni);
  const admin = createServiceRoleClient();

  /* Verificar si ya existe un usuario con ese email */
  const { data: existentes } = await admin.auth.admin.listUsers();
  const yaExiste = existentes?.users?.find((u) => u.email === cliente.email);

  if (yaExiste) {
    /* Actualizar contraseña al DNI actual */
    const { error: upErr } = await admin.auth.admin.updateUserById(yaExiste.id, { password });
    if (upErr) {
      return { ok: false, error: `No se pudo actualizar la contraseña: ${upErr.message}` };
    }
    return { ok: true, created: false };
  }

  /* Crear usuario nuevo */
  const { error: crErr } = await admin.auth.admin.createUser({
    email: cliente.email,
    password,
    email_confirm: true,
  });

  if (crErr) {
    return { ok: false, error: `No se pudo crear el acceso: ${crErr.message}` };
  }

  return { ok: true, created: true };
}
