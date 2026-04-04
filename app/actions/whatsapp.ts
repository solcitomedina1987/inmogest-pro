"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendWhatsAppAlert,
  mensajeRecordatorioActualizacion,
  normalizarTelefono,
} from "@/lib/whatsapp/callmebot";
import {
  mesActualYYYYMM,
  mesSiguiente,
  formatMesHumano,
} from "@/lib/cobranzas/alertas-actualizacion";

export type WaActionResult = { ok: boolean; mensaje: string };

/**
 * Envía manualmente el recordatorio de actualización de alquiler
 * al inquilino de un contrato específico via CallMeBot.
 */
export async function enviarRecordatorioWhatsApp(
  contratoId: string,
): Promise<WaActionResult> {
  const supabase = await createClient();

  // Verificar sesión admin
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

  // Cargar datos del contrato
  const { data: contrato, error } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, monto_mensual, indice_actualizacion,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono )
    `)
    .eq("id", contratoId)
    .maybeSingle();

  if (error || !contrato) {
    return { ok: false, mensaje: "Contrato no encontrado" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = contrato as any;
  const propiedad = Array.isArray(c.propiedad) ? c.propiedad[0] : c.propiedad;
  const inquilino = Array.isArray(c.inquilino) ? c.inquilino[0] : c.inquilino;

  const telefono: string | null = inquilino?.telefono ?? null;
  if (!telefono) {
    return { ok: false, mensaje: "El inquilino no tiene teléfono registrado" };
  }

  if (!process.env.CALLMEBOT_API_KEY) {
    return {
      ok: false,
      mensaje: "CALLMEBOT_API_KEY no configurada. Agregala en las variables de entorno de Vercel.",
    };
  }

  const direccion: string = propiedad?.direccion ?? propiedad?.nombre ?? "sin dirección";
  const nombreInquilino: string = inquilino?.nombre_completo ?? "Inquilino";
  const indice: string = c.indice_actualizacion ?? "ICL";

  const mesProximo = mesSiguiente(mesActualYYYYMM());
  const mesHumano = formatMesHumano(mesProximo);

  const mensaje = mensajeRecordatorioActualizacion({
    nombreInquilino,
    direccionPropiedad: direccion,
    mesActualizacionHumano: mesHumano,
    indice,
  });

  const result = await sendWhatsAppAlert(telefono, mensaje);

  if (!result.ok) {
    return { ok: false, mensaje: `Error al enviar: ${result.info}` };
  }

  return {
    ok: true,
    mensaje: `Mensaje enviado a ${normalizarTelefono(telefono)}`,
  };
}
