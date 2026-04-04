/**
 * Servicio de WhatsApp via CallMeBot
 * https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Sin costo, sin aprobación de templates — texto libre.
 *
 * ⚠️  NOTA: CallMeBot requiere que el destinatario haya activado su número
 * enviando "I allow callmebot to send me messages" al +34 644 44 71 74 en WA.
 * Para uso interno (admin → admin) funciona de inmediato.
 * Para enviar a inquilinos, cada inquilino debe activar su número una sola vez.
 *
 * Variable de entorno requerida:
 *   CALLMEBOT_API_KEY  – API key obtenida al activar el número
 *
 * Si querés enviar a múltiples destinatarios con claves distintas,
 * guardá la api_key por cliente en la tabla `clientes`.
 */

const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";
const CONTACTO_FIJO = "+54 9 2664791345";

// ── Normalización de teléfonos argentinos ────────────────────────────────────

/**
 * Convierte cualquier formato de número argentino al formato E.164 sin '+'.
 * CallMeBot espera, por ejemplo: 5492664791345
 *
 * Acepta: +54 9 2664 791345 | 02664 79xxxx | 549266... | 266...
 */
export function normalizarTelefono(tel: string): string {
  let digits = tel.replace(/\D/g, "");

  // 0266... → 54266...
  if (digits.startsWith("0")) {
    digits = "54" + digits.slice(1);
  }

  // 54266... (sin 9 de celular) → 549266...
  if (digits.startsWith("54") && !digits.startsWith("549")) {
    digits = "549" + digits.slice(2);
  }

  // Sin código de país → 549...
  if (!digits.startsWith("54")) {
    digits = "549" + digits;
  }

  return digits;
}

// ── Envío de mensaje ──────────────────────────────────────────────────────────

export type WaResult = { ok: boolean; info: string; rawText?: string };

/**
 * Envía un mensaje de WhatsApp via CallMeBot.
 * @param phone   Número del destinatario (cualquier formato argentino)
 * @param message Texto a enviar (se codifica automáticamente)
 * @param apiKey  API key del destinatario (o CALLMEBOT_API_KEY global)
 */
export async function sendWhatsAppAlert(
  phone: string,
  message: string,
  apiKey?: string,
): Promise<WaResult> {
  const key = apiKey ?? process.env.CALLMEBOT_API_KEY;

  if (!key) {
    return {
      ok: false,
      info: "CALLMEBOT_API_KEY no configurada en las variables de entorno",
    };
  }

  const to = normalizarTelefono(phone);
  const url =
    `${CALLMEBOT_URL}?phone=${to}&text=${encodeURIComponent(message)}&apikey=${key}`;

  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();

    // CallMeBot devuelve texto, no JSON.
    // Respuesta exitosa contiene "Message queued" o "Message sent".
    const ok = res.ok && !text.toLowerCase().includes("error");

    return { ok, info: ok ? `Enviado a ${to}` : `Error CallMeBot: ${text}`, rawText: text };
  } catch (e) {
    return {
      ok: false,
      info: e instanceof Error ? e.message : String(e),
    };
  }
}

// ── Mensaje de recordatorio de actualización ─────────────────────────────────

export function mensajeRecordatorioActualizacion(params: {
  nombreInquilino: string;
  direccionPropiedad: string;
  mesActualizacionHumano: string;
  indice: string;
}): string {
  return (
    `Hola ${params.nombreInquilino}! 👋 ` +
    `Le recordamos desde Consultora Medina & Asociados que el próximo mes ` +
    `(${params.mesActualizacionHumano}) corresponde la actualización del valor ` +
    `de su alquiler en ${params.direccionPropiedad}. ` +
    `Índice: ${params.indice}. ` +
    `Consultas al ${CONTACTO_FIJO}.`
  );
}

export function callmebotConfigurado(): boolean {
  return Boolean(process.env.CALLMEBOT_API_KEY);
}
