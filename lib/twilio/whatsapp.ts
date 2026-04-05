/**
 * Servicio de WhatsApp via Twilio
 *
 * Requiere en .env.local / Vercel:
 *   TWILIO_ACCOUNT_SID    – Account SID de Twilio
 *   TWILIO_AUTH_TOKEN     – Auth Token de Twilio
 *   TWILIO_WHATSAPP_FROM  – Número origen (ej: whatsapp:+14155238886 para Sandbox)
 *   TWILIO_WHATSAPP_ADMIN – Número de la Consultora (destinatario de avisos internos)
 *
 * ⚠️ Sandbox: el destinatario debe haberse unido enviando "join <código>"
 *    al número del Sandbox antes de recibir mensajes.
 * ✅ Producción: usar número verificado de WhatsApp Business en Twilio Console.
 */

import twilio from "twilio";
import { BRAND_NAME } from "@/lib/constants/branding";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TwilioResult = {
  ok: boolean;
  sid?: string;
  error?: string;
};

export type TipoAlerta = "VENCIMIENTO" | "ACTUALIZACION";

// ── Normalización de teléfono ─────────────────────────────────────────────────

/**
 * Convierte un teléfono argentino al formato Twilio WhatsApp: whatsapp:+549XXXXXXXXX
 * Elimina espacios, guiones, paréntesis y el prefijo 0 nacional.
 */
export function normalizarWhatsApp(tel: string): string {
  // Eliminar todo excepto dígitos
  let digits = tel.replace(/\D/g, "");

  // 0266... → 549266...
  if (digits.startsWith("0")) {
    digits = "54" + digits.slice(1);
  }

  // 54266... (sin el 9 de celular) → 549266...
  if (digits.startsWith("54") && !digits.startsWith("549")) {
    digits = "549" + digits.slice(2);
  }

  // Sin código de país → 549...
  if (!digits.startsWith("54")) {
    digits = "549" + digits;
  }

  return `whatsapp:+${digits}`;
}

/** Verifica que el número tenga el formato correcto para Twilio. */
export function validarFormatoWhatsApp(numero: string): boolean {
  return /^whatsapp:\+\d{10,15}$/.test(numero);
}

// ── Cliente Twilio ────────────────────────────────────────────────────────────

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados");
  }
  return twilio(sid, token);
}

// ── Envío base ────────────────────────────────────────────────────────────────

/**
 * Envía un mensaje de WhatsApp vía Twilio.
 * @param to   Número destino normalizado (whatsapp:+549...)
 * @param body Texto del mensaje
 */
export async function sendWhatsApp(to: string, body: string): Promise<TwilioResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!from) {
    return { ok: false, error: "TWILIO_WHATSAPP_FROM no configurado" };
  }

  if (!validarFormatoWhatsApp(to)) {
    return { ok: false, error: `Número inválido para WhatsApp: ${to}` };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({ from, to, body });
    return { ok: true, sid: message.sid };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[Twilio] Error al enviar WhatsApp:", err);
    return { ok: false, error: err };
  }
}

// ── Mensajes predefinidos ─────────────────────────────────────────────────────

/**
 * Mensaje de aviso de actualización de precio (mes en curso).
 * Se envía al número del ADMIN de la consultora con datos del inquilino.
 */
export function mensajeActualizacion(params: {
  direccion: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  indice: string;
  montoActual: number;
}): string {
  const precioFmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const tel = params.telefonoInquilino ? `, Tel: ${params.telefonoInquilino}` : "";
  return (
    `📢 *${BRAND_NAME}*\n` +
    `*Aviso de Actualización de Alquiler*\n\n` +
    `🏠 Propiedad: ${params.direccion}\n` +
    `👤 Inquilino: ${params.nombreInquilino}${tel}\n` +
    `💰 Monto actual: ${precioFmt.format(params.montoActual)}\n` +
    `📊 Índice: ${params.indice}\n\n` +
    `Este mes corresponde actualizar el valor del alquiler.\n` +
    `Consultas: +54 9 2664791345`
  );
}

/**
 * Mensaje de aviso de vencimiento de contrato próximo.
 * Se envía al número del ADMIN de la consultora con datos del inquilino.
 */
export function mensajeVencimiento(params: {
  direccion: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  fechaVencimiento: string;
}): string {
  const tel = params.telefonoInquilino ? `, Tel: ${params.telefonoInquilino}` : "";
  // Formatear fecha DD/MM/YYYY
  const [y, m, d] = params.fechaVencimiento.split("-");
  const fechaHumana = `${d}/${m}/${y}`;
  return (
    `⚠️ *${BRAND_NAME}*\n` +
    `*Aviso de Vencimiento de Contrato*\n\n` +
    `🏠 Propiedad: ${params.direccion}\n` +
    `👤 Inquilino: ${params.nombreInquilino}${tel}\n` +
    `📅 Fecha de vencimiento: ${fechaHumana}\n\n` +
    `El contrato vence próximamente. Recordar gestionar renovación o finalización.\n` +
    `Consultas: +54 9 2664791345`
  );
}

export function twilioConfigurado(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM,
  );
}
