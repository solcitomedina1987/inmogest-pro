"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendWhatsAppAlert,
  mensajeActualizacionPrecio,
} from "@/lib/whatsapp/callmebot";

export type WaActionResult = { ok: boolean; mensaje: string };

/**
 * Envía manualmente el recordatorio de actualización al WhatsApp de la Consultora.
 * El mensaje hace referencia al MES EN CURSO (no al próximo mes).
 * El destino siempre es CALLMEBOT_PHONE (número que registró el API key).
 */
export async function enviarRecordatorioWhatsApp(
  contratoId: string,
): Promise<WaActionResult> {
  const supabase = await createClient();

  // 1. Verificar sesión admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No autenticado" };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.rol !== "admin") {
    return { ok: false, mensaje: "Solo los administradores pueden enviar mensajes" };
  }

  // 2. Verificar configuración
  if (!process.env.CALLMEBOT_API_KEY) {
    return {
      ok: false,
      mensaje: "CALLMEBOT_API_KEY no configurada. Agregala en .env.local y en las variables de entorno de Vercel.",
    };
  }

  // 3. Cargar datos del contrato
  const { data: contrato, error } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, indice_actualizacion,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono )
    `)
    .eq("id", contratoId)
    .maybeSingle();

  if (error || !contrato) {
    return { ok: false, mensaje: `Contrato no encontrado: ${error?.message ?? "sin datos"}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = contrato as any;
  const propiedad = Array.isArray(c.propiedad) ? c.propiedad[0] : c.propiedad;
  const inquilino = Array.isArray(c.inquilino) ? c.inquilino[0] : c.inquilino;

  const direccion: string = propiedad?.direccion ?? propiedad?.nombre ?? "sin dirección";
  const nombreInquilino: string = inquilino?.nombre_completo ?? "Inquilino";
  const telefonoInquilino: string | null = inquilino?.telefono ?? null;
  const indice: string = c.indice_actualizacion ?? "ICL";

  // 4. Construir mensaje con referencia al MES EN CURSO
  const mensaje = mensajeActualizacionPrecio({
    direccionPropiedad: direccion,
    nombreInquilino,
    telefonoInquilino,
    indice,
  });

  // 5. Enviar al WhatsApp de la Consultora via CallMeBot
  const result = await sendWhatsAppAlert(mensaje);

  if (!result.ok) {
    return { ok: false, mensaje: `Error al enviar: ${result.info}` };
  }

  return {
    ok: true,
    mensaje: `✅ Recordatorio de actualización enviado para ${nombreInquilino} — ${direccion}`,
  };
}
