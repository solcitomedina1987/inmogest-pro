/**
 * Servicio de Google Calendar via Service Account
 *
 * Requiere en .env.local / Vercel:
 *   GOOGLE_CLIENT_EMAIL  – email de la service account
 *   GOOGLE_PRIVATE_KEY   – clave privada (con \n reales o escapados)
 *   GOOGLE_CALENDAR_ID   – ID del calendario destino (compartirlo con la service account)
 *
 * Configuración rápida:
 *   1. console.cloud.google.com → "APIs y servicios" → habilitar Google Calendar API
 *   2. IAM → Cuentas de servicio → crear una → descargar clave JSON
 *   3. Abrir Google Calendar → Configuración del calendario → Compartir con
 *      el GOOGLE_CLIENT_EMAIL con permiso "Hacer cambios en los eventos"
 *   4. Copiar el "ID del calendario" y pegarlo en GOOGLE_CALENDAR_ID
 */

import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

// ── Cliente autenticado ───────────────────────────────────────────────────────

function getCalendar() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Google Calendar no configurado. Verificar GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY.",
    );
  }

  // Las claves en .env tienen \\n como texto literal; las convertimos a saltos reales
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventoCalendario = {
  id: string;
  titulo: string;
  fecha: string;          // YYYY-MM-DD
  tipo: "vencimiento" | "actualizacion";
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
  htmlLink: string;
};

export type CalendarResult = { ok: true; eventIds: string[] } | { ok: false; error: string };

// ── Helpers de fechas ─────────────────────────────────────────────────────────

/**
 * Devuelve YYYY-MM-01 del mes previo a la fecha de vencimiento.
 * Ej: 2027-12-31 → 2027-11-01
 */
function fechaAlertaVencimiento(fechaVencimiento: string): string {
  const [y, m] = fechaVencimiento.split("-").map(Number);
  // 1 mes antes: new Date(y, m-2, 1) → mes m-2 (0-based)
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Genera las fechas YYYY-MM-01 de cada actualización de precio durante la vigencia.
 * Ej: inicio=2026-01-01, cada 4 meses, vencimiento=2028-01-01
 *   → ["2026-04-01", "2026-08-01", "2026-12-01", "2027-04-01", "2027-08-01", "2027-12-01"]
 */
function fechasActualizacion(
  fechaInicio: string,
  mesesActualizacion: number,
  fechaVencimiento: string,
): string[] {
  const [sy, sm] = fechaInicio.split("-").map(Number);
  const [ey, em] = fechaVencimiento.split("-").map(Number);
  const limiteMs = ey * 12 + em;

  const fechas: string[] = [];
  let y = sy;
  let m = sm + mesesActualizacion;

  // Normalizar meses > 12
  while (m > 12) {
    m -= 12;
    y += 1;
  }

  while (y * 12 + m <= limiteMs) {
    fechas.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m += mesesActualizacion;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
  }

  return fechas;
}

// ── Creación de eventos ───────────────────────────────────────────────────────

type DatosEvento = {
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
};

async function crearEvento(
  titulo: string,
  fecha: string,  // YYYY-MM-DD
  tipo: "vencimiento" | "actualizacion",
  datos: DatosEvento,
): Promise<string> {
  const calendar = getCalendar();
  const tel = datos.telefono ?? "sin teléfono";

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: titulo,
      description:
        `Inquilino: ${datos.inquilino}\n` +
        `Teléfono: ${tel}\n` +
        `Dirección: ${datos.direccion}\n` +
        `Contrato ID: ${datos.contratoId}`,
      start: { date: fecha },
      end: { date: fecha },   // all-day event
      // Metadatos estructurados para recuperar en el widget
      extendedProperties: {
        private: {
          tipo,
          contratoId: datos.contratoId,
          inquilino: datos.inquilino,
          telefono: datos.telefono ?? "",
          direccion: datos.direccion,
        },
      },
      colorId: tipo === "vencimiento" ? "11" : "5", // rojo vs amarillo
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 60 }],
      },
    },
  });

  return response.data.id ?? "";
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Crea todos los eventos de un contrato: un evento de vencimiento +
 * todos los eventos de actualización de precio durante la vigencia.
 */
export async function crearEventosContrato(params: {
  fechaInicio: string;       // YYYY-MM-DD
  fechaVencimiento: string;  // YYYY-MM-DD
  mesesActualizacion: number;
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
}): Promise<CalendarResult> {
  try {
    const {
      fechaInicio, fechaVencimiento, mesesActualizacion,
      direccion, inquilino, telefono, contratoId,
    } = params;

    const datos: DatosEvento = { direccion, inquilino, telefono, contratoId };
    const eventIds: string[] = [];

    // 1. Evento de vencimiento (día 1 del mes anterior a la fecha fin)
    const fechaVenc = fechaAlertaVencimiento(fechaVencimiento);
    const idVenc = await crearEvento(
      `Alerta Vencimiento Contrato: ${direccion}`,
      fechaVenc,
      "vencimiento",
      datos,
    );
    eventIds.push(idVenc);

    // 2. Eventos de actualización de valor (uno por cada ciclo)
    const fechasAct = fechasActualizacion(fechaInicio, mesesActualizacion, fechaVencimiento);
    for (const fecha of fechasAct) {
      const id = await crearEvento(
        `Alerta Actualización de Valor de Alquiler: ${direccion}`,
        fecha,
        "actualizacion",
        datos,
      );
      eventIds.push(id);
    }

    console.log(
      `[Google Calendar] Contrato ${contratoId}: ${eventIds.length} evento(s) creados ` +
      `(1 vencimiento + ${fechasAct.length} actualizaciones)`,
    );

    return { ok: true, eventIds };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Google Calendar] Error al crear eventos:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Obtiene los próximos N eventos del calendario con metadatos de la service account.
 */
export async function obtenerProximosEventos(maxResults = 5): Promise<EventoCalendario[]> {
  const calendar = getCalendar();

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
    fields: "items(id,summary,start,htmlLink,extendedProperties)",
  });

  return mapItems(response.data.items ?? []);
}

/**
 * Obtiene todos los eventos dentro de un rango de fechas (para el calendario completo).
 */
export async function obtenerEventosPorRango(
  start: string, // YYYY-MM-DD
  end: string,   // YYYY-MM-DD
): Promise<EventoCalendario[]> {
  const calendar = getCalendar();

  // timeMin/timeMax requieren ISO 8601 con hora
  const timeMin = new Date(`${start}T00:00:00`).toISOString();
  const timeMax = new Date(`${end}T23:59:59`).toISOString();

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    timeMax,
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
    fields: "items(id,summary,start,htmlLink,extendedProperties)",
  });

  return mapItems(response.data.items ?? []);
}

function mapItems(items: Parameters<typeof mapItem>[0][]): EventoCalendario[] {
  return items.map(mapItem);
}

function mapItem(e: {
  id?: string | null;
  summary?: string | null;
  start?: { date?: string | null; dateTime?: string | null } | null;
  htmlLink?: string | null;
  extendedProperties?: { private?: Record<string, string> | null } | null;
}): EventoCalendario {
  const priv = e.extendedProperties?.private ?? {};
  return {
    id: e.id ?? "",
    titulo: e.summary ?? "",
    fecha: e.start?.date ?? e.start?.dateTime?.slice(0, 10) ?? "",
    tipo: (priv.tipo as "vencimiento" | "actualizacion") ?? "actualizacion",
    direccion: priv.direccion ?? e.summary ?? "",
    inquilino: priv.inquilino ?? "",
    telefono: priv.telefono || null,
    contratoId: priv.contratoId ?? "",
    htmlLink: e.htmlLink ?? "",
  };
}

export function googleCalendarConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}
