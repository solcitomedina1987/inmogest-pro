"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import type { TipoCliente } from "@/lib/constants/clientes";

type Result =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

/**
 * Crea o restablece acceso al portal de propietarios.
 * Usuario = email del cliente; contraseña = DNI (como string).
 * Actualiza `perfiles` (rol propietario, cliente_id) y marca el cliente.
 */
export async function crearAccesoPortalPropietario(clienteId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { ok: false, error: "Sin autorización." };
  }

  const { data: cliente, error: cErr } = await auth.supabase
    .from("clientes")
    .select("id, email, dni, nombre_completo, tipo_cliente")
    .eq("id", clienteId)
    .maybeSingle();

  if (cErr || !cliente) {
    return { ok: false, error: "Cliente no encontrado." };
  }

  const tipo = cliente.tipo_cliente as TipoCliente;
  if (tipo !== "Propietario" && tipo !== "Ambos") {
    return { ok: false, error: "Solo aplica a clientes tipo Propietario o Ambos." };
  }

  if (!cliente.email) {
    return { ok: false, error: "El propietario no tiene email registrado." };
  }
  if (cliente.dni == null || String(cliente.dni).trim() === "") {
    return { ok: false, error: "El propietario no tiene DNI registrado." };
  }

  const email = String(cliente.email).trim().toLowerCase();
  const password = String(cliente.dni);

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return { ok: false, error: "Falta configuración del servidor (service role)." };
  }

  const { data: perfilAuth } = await admin
    .from("perfiles")
    .select("id, rol, cliente_id")
    .eq("email", email)
    .maybeSingle();

  let userIdExistente: string | null = perfilAuth?.id ?? null;

  if (userIdExistente) {
    if (perfilAuth?.rol === "admin") {
      return { ok: false, error: "Ese email pertenece a un administrador." };
    }
    if (perfilAuth?.cliente_id != null && perfilAuth.cliente_id !== clienteId) {
      return {
        ok: false,
        error: "Ese email ya está vinculado a otro propietario en el portal.",
      };
    }

    const { error: upErr } = await admin.auth.admin.updateUserById(userIdExistente, {
      password,
      email_confirm: true,
    });
    if (upErr) {
      return { ok: false, error: `No se pudo actualizar la cuenta: ${upErr.message}` };
    }

    const { error: pErr } = await admin
      .from("perfiles")
      .update({
        nombre: cliente.nombre_completo as string,
        email,
        rol: "propietario",
        cliente_id: clienteId,
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userIdExistente);

    if (pErr) {
      return { ok: false, error: pErr.message };
    }
  } else {
    const { data: created, error: crErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: cliente.nombre_completo },
    });

    if (crErr || !created.user?.id) {
      return { ok: false, error: crErr?.message ?? "No se pudo crear el usuario." };
    }

    const uid = created.user.id;

    const { error: pErr } = await admin
      .from("perfiles")
      .update({
        nombre: cliente.nombre_completo as string,
        email,
        rol: "propietario",
        cliente_id: clienteId,
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);

    if (pErr) {
      return { ok: false, error: `Usuario creado pero error al actualizar perfil: ${pErr.message}` };
    }
  }

  const { error: cliErr } = await admin
    .from("clientes")
    .update({ portal_propietario_habilitado: true })
    .eq("id", clienteId);

  if (cliErr) {
    return { ok: false, error: `Acceso listo pero no se pudo marcar el cliente: ${cliErr.message}` };
  }

  revalidatePath("/dashboard/clientes");

  return { ok: true, created: !userIdExistente };
}
