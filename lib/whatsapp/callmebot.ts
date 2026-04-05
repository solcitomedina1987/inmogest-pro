/**
 * Servicio de WhatsApp via CallMeBot
 * https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Importante: CallMeBot envía al número que REGISTRÓ el API key.
 * Todos los mensajes van al WhatsApp de la Consultora (+5492664791345)
 * con los datos completos del inquilino en el cuerpo del mensaje.
 *
 * Variables de entorno:
 *   CALLMEBOT_API_KEY  – API key obtenida al activar el número en CallMeBot (ej: 9853763)
 *   CALLMEBOT_PHONE    – Número WhatsApp destino (ej: +5492664791345)
 */

const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";
const PHONE_DESTINO = process.env.CALLMEBOT_PHONE ?? "+5492664791345";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WaResult = { ok: boolean; info: string; rawText?: string };

// ── Normalización de teléfono ─────────────────────────────────────────────────

/**
 * Limpia el número de teléfono: elimina espacios, guiones, paréntesis y el '+' inicial.
 * CallMeBot espera el número como dígitos puros, ej: 5492664791345
 */
function limpiarTelefono(tel: string): string {
  return tel.replace(/[\s\-().+]/g, "");
}

// ── Función principal de envío ────────────────────────────────────────────────

/**
 * Envía un mensaje de texto libre al WhatsApp de la Consultora via CallMeBot.
 * El `phone` de la URL DEBE ser el número que registró el API key (CALLMEBOT_PHONE).
 */
export async function sendWhatsAppAlert(message: string): Promise<WaResult> {
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      info: "CALLMEBOT_API_KEY no configurada en las variables de entorno",
    };
  }

  const phoneClean = limpiarTelefono(PHONE_DESTINO);
  const url =
    `${CALLMEBOT_URL}?phone=${phoneClean}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const rawText = await res.text();

    // CallMeBot responde con texto plano. Éxito si no contiene "error".
    const ok = res.ok && !rawText.toLowerCase().includes("error");

    if (!ok) {
      console.error("[CallMeBot] Respuesta:", rawText, "| URL:", url);
    }

    return {
      ok,
      info: ok ? `Mensaje enviado a ${PHONE_DESTINO}` : `Error CallMeBot: ${rawText}`,
      rawText,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[CallMeBot] Excepción:", err);
    return { ok: false, info: err };
  }
}

// ── Mensajes ──────────────────────────────────────────────────────────────────

/**
 * [FLUJO A - BOTÓN MANUAL Y CRON DÍA 1]
 * Recordatorio de actualización de precio — mes EN CURSO.
 */
export function mensajeActualizacionPrecio(params: {
  direccionPropiedad: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  indice: string;
}): string {
  const tel = params.telefonoInquilino
    ? `. Enviar recordatorio/mensaje alteléfono ${params.telefonoInquilino}`
    : "";

  return (
    `⚠️ Recordatorio de ACTUALIZACIÓN DE VALOR mensual del alquiler en ` +
    `${params.direccionPropiedad}. ` +
    `Inquilino: ${params.nombreInquilino}${tel}. ` +
    `Índice: ${params.indice}. `
  );
}

/**
 * [FLUJO B - CRON DÍA 2]
 * Aviso de vencimiento de contrato próximo (en 2 meses).
 */
export function mensajeVencimientoContrato(params: {
  direccionPropiedad: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  fechaVencimiento: string;
}): string {
  const tel = params.telefonoInquilino ?? "sin teléfono";

  return (
    `⚠️ Recordatorio de VENCIMIENTO DE CONTRATO para la propiedad ` +
    `${params.direccionPropiedad}. ` +
    `Inquilino: ${params.nombreInquilino}, ` +
    `Enviar recordatorio al teléfono: ${tel}. ` +
    `Para posible renovación de contrato. ` +
    `Fecha de vencimiento: ${params.fechaVencimiento}.`
  );
}

/** @deprecated Usar mensajeActualizacionPrecio */
export function mensajeRecordatorioActualizacion(params: {
  direccionPropiedad: string;
  nombreInquilino: string;
  telefonoInquilino: string | null;
  mesActualizacionHumano: string;
  indice: string;
}): string {
  return mensajeActualizacionPrecio(params);
}

export function callmebotConfigurado(): boolean {
  return Boolean(process.env.CALLMEBOT_API_KEY);
}
