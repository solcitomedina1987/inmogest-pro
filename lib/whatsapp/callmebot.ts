/**
 * Servicio de WhatsApp via CallMeBot
 * https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Importante: CallMeBot envía al número que REGISTRÓ el API key.
 * Por eso todos los mensajes van al WhatsApp de la Consultora (+5492664791345)
 * con los datos completos del inquilino en el cuerpo del mensaje.
 *
 * Variables de entorno:
 *   CALLMEBOT_API_KEY  – API key obtenida al activar el número en CallMeBot (ej: 9853763)
 *   CALLMEBOT_PHONE    – Número WhatsApp destino (ej: +5492664791345)
 */

const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";

// Destino fijo: el WhatsApp de la Consultora
const PHONE_DESTINO =
  process.env.CALLMEBOT_PHONE ?? "+5492664791345";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WaResult = { ok: boolean; info: string; rawText?: string };

// ── Función principal de envío ────────────────────────────────────────────────

/**
 * Envía un mensaje de texto libre al WhatsApp de la Consultora via CallMeBot.
 * El [phone] en la URL debe ser el mismo número que registró el apikey.
 */
export async function sendWhatsAppAlert(message: string): Promise<WaResult> {
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      info: "CALLMEBOT_API_KEY no configurada en las variables de entorno",
    };
  }

  // Construir URL — el teléfono va SIN el + para evitar problemas de encoding
  const phoneClean = PHONE_DESTINO.replace(/^\+/, "");
  const url = `${CALLMEBOT_URL}?phone=${phoneClean}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      // Sin caché para evitar respuestas obsoletas
      cache: "no-store",
    });

    const rawText = await res.text();

    // CallMeBot responde con texto plano. Éxito si contiene "queued" o "sent".
    const ok =
      res.ok &&
      (rawText.toLowerCase().includes("queued") ||
        rawText.toLowerCase().includes("sent") ||
        rawText.toLowerCase().includes("message"));

    if (!ok) {
      console.error("[CallMeBot] Respuesta inesperada:", rawText);
    }

    return {
      ok,
      info: ok ? `Mensaje enviado a ${PHONE_DESTINO}` : `Error CallMeBot: ${rawText}`,
      rawText,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[CallMeBot] Excepción al enviar:", err);
    return { ok: false, info: err };
  }
}

// ── Mensaje de recordatorio de actualización ─────────────────────────────────

/**
 * Construye el texto del recordatorio según el formato solicitado.
 * Este mensaje llega al WhatsApp de la Consultora con todos los datos del inquilino.
 */
export function mensajeRecordatorioActualizacion(params: {
  direccionPropiedad: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  mesActualizacionHumano: string;
  indice: string;
}): string {
  const telInquilino = params.telefonoInquilino
    ? `, teléfono ${params.telefonoInquilino}`
    : "";

  return (
    `Recordatorio de actualización de contrato para propiedad ` +
    `${params.direccionPropiedad}, ` +
    `inquilino ${params.nombreInquilino}${telInquilino}. ` +
    `Próxima actualización: ${params.mesActualizacionHumano}. ` +
    `Índice: ${params.indice}. ` +
    `Consultas al +54 9 2664791345.`
  );
}

export function callmebotConfigurado(): boolean {
  return Boolean(process.env.CALLMEBOT_API_KEY);
}
