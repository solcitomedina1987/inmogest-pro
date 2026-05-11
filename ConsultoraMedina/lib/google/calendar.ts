/**
 * Servicio de Google Calendar via Service Account
 *
 * Requiere en .env.local / Vercel:
 *   GOOGLE_CLIENT_EMAIL  – email de la service account
 *   GOOGLE_PRIVATE_KEY   – clave privada (con \n reales o escapados)
 *   GOOGLE_CALENDAR_ID   – ID del calendario destino (compartirlo con la service account)
 */

import { google } from "googleapis";
import { LABEL_TIPO_EVENTO } from "./calendar-types";
import type { TipoEvento, TipoEventoPersonalizado, EventoCalendario } from "./calendar-types";

// Re-export for consumers
export type { TipoEvento, TipoEventoPersonalizado, EventoCalendario };
export { esEventoPersonalizado, LABEL_TIPO_EVENTO, TIPOS_EVENTO_PERSONALIZADO } from "./calendar-types";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

// ── Cliente autenticado ───────────────────────────────────────────────────────

/**
 * Normaliza la clave privada independientemente de cómo la cargó Next.js:
 *  - Si dotenv ya convirtió \n → saltos reales: ningún cambio
 *  - Si quedaron como literal \n  (backslash + n): los convierte
 *  - Si quedaron como literal \\n (doble-backslash + n): los convierte primero
 */
function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\\\n/g, "\n")  // \\n → newline real (doble-escapado)
    .replace(/\\n/g, "\n");   // \n  → newline real (simple-escapado)
}

function getCalendar() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Google Calendar no configurado. Verificar GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY.",
    );
  }

  const privateKey = normalizePrivateKey(rawKey);

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// ── Tipos (re-exportados desde calendar-types.ts) ─────────────────────────────

export type CalendarResult =
  | { ok: true; eventIds: string[]; creados: number; omitidos: number }
  | { ok: false; error: string; creados: number; omitidos: number };

// ── colorId de Google Calendar por tipo ──────────────────────────────────────
// 11=Tomato(rojo), 5=Banana(amarillo), 9=Blueberry(azul), 7=Peacock(celeste), 2=Sage(verde)
const COLOR_ID: Record<TipoEvento, string> = {
  vencimiento_real: "11",
  alerta_vencimiento: "5",
  actualizacion: "9",
  alerta_actualizacion: "7",
  visita_inquilino: "2",
  visita_propietario: "2",
  muestra_propiedad: "2",
  tramite: "2",
};

// ── Helpers de fechas ─────────────────────────────────────────────────────────

/** Devuelve YYYY-MM-01 del mes previo al vencimiento. Ej: 2027-12-31 → 2027-11-01 */
function fechaAlertaVencimiento(fechaVencimiento: string): string {
  const [y, m] = fechaVencimiento.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Genera fechas YYYY-MM-01 de cada ciclo de actualización de precio.
 * Ej: inicio=2026-01-01, cada 4 meses → 2026-04-01, 2026-08-01, …
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
  while (m > 12) { m -= 12; y += 1; }

  while (y * 12 + m <= limiteMs) {
    fechas.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m += mesesActualizacion;
    while (m > 12) { m -= 12; y += 1; }
  }
  return fechas;
}

// ── Creación interna de un evento ─────────────────────────────────────────────

type DatosEvento = {
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
  fechaVencimiento?: string;
  montoMensual?: number;
  indice?: string;
};

/**
 * Clave única que identifica un evento de forma inequívoca.
 * Formato: {contratoId}_{tipo}_{fecha}
 * Permite detectar duplicados antes de insertar.
 */
function buildEventKey(contratoId: string, tipo: TipoEvento, fecha: string): string {
  return `${contratoId}_${tipo}_${fecha}`;
}

/**
 * Inserta un evento si no existe ya uno con la misma eventKey O con el mismo título y fecha.
 * Retorna { id, created: true } si fue creado, o { id, created: false } si ya existía.
 */
async function upsertEvento(
  titulo: string,
  fecha: string,
  tipo: TipoEvento,
  datos: DatosEvento,
): Promise<{ id: string; created: boolean }> {
  const calendar = getCalendar();
  const eventKey = buildEventKey(datos.contratoId, tipo, fecha);
  const tel = datos.telefono ?? "sin teléfono";

  // ── Verificar por eventKey (método primario) ──────────────────────────────
  const byKey = await calendar.events.list({
    calendarId: CALENDAR_ID,
    privateExtendedProperty: [`eventKey=${eventKey}`],
    maxResults: 1,
    singleEvents: true,
    showDeleted: false,
  });
  const existingId = byKey.data.items?.[0]?.id;
  if (existingId) return { id: existingId, created: false };

  // ── Verificar por título + fecha (fallback para eventos sin eventKey) ─────
  const timeMin = new Date(`${fecha}T00:00:00`).toISOString();
  const timeMax = new Date(`${fecha}T23:59:59`).toISOString();
  const byTitle = await calendar.events.list({
    calendarId: CALENDAR_ID,
    q: titulo,
    timeMin,
    timeMax,
    maxResults: 5,
    singleEvents: true,
    showDeleted: false,
  });
  const titleMatch = byTitle.data.items?.find((ev) => ev.summary === titulo);
  if (titleMatch?.id) return { id: titleMatch.id, created: false };

  // ── Insertar nuevo evento ─────────────────────────────────────────────────
  const extended: Record<string, string> = {
    eventKey,
    tipo,
    contratoId: datos.contratoId,
    inquilino: datos.inquilino,
    telefono: datos.telefono ?? "",
    direccion: datos.direccion,
  };
  if (datos.fechaVencimiento) extended.fechaVencimiento = datos.fechaVencimiento;
  if (datos.montoMensual != null) extended.montoMensual = String(datos.montoMensual);
  if (datos.indice) extended.indice = datos.indice;

  const lines = [
    `Inquilino: ${datos.inquilino}`,
    `Teléfono: ${tel}`,
    `Dirección: ${datos.direccion}`,
    datos.fechaVencimiento ? `Vencimiento: ${datos.fechaVencimiento}` : null,
    datos.montoMensual != null ? `Monto mensual: $${datos.montoMensual.toLocaleString("es-AR")}` : null,
    datos.indice ? `Índice: ${datos.indice}` : null,
  ].filter(Boolean).join("\n");

  let response;
  try {
    response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: titulo,
        description: lines,
        start: { date: fecha },
        end: { date: fecha },
        colorId: COLOR_ID[tipo],
        extendedProperties: { private: extended },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 60 }],
        },
      },
    });
  } catch (e) {
    const err = e as Error & { response?: { data?: unknown; status?: number } };
    const httpStatus = err.response?.status;
    const apiError = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    console.error(
      `[Google Calendar] upsertEvento INSERT falló — HTTP ${httpStatus ?? "?"} — ` +
      `titulo="${titulo}", fecha="${fecha}", calendarId="${CALENDAR_ID}": ${apiError}`,
    );
    throw e;
  }

  console.info(
    `[Google Calendar] Evento creado — id: ${response.data.id}, ` +
    `titulo: "${titulo}", fecha: ${fecha}, calendarId: ${CALENDAR_ID}, ` +
    `status: ${response.data.status ?? "?"}`,
  );

  return { id: response.data.id ?? "", created: true };
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Sincroniza los 4 tipos de eventos para un contrato (idempotente).
 * Si un evento ya existe (misma eventKey), lo omite sin duplicar.
 *
 *   1. VENCIMIENTO          (ROJO)    — fecha exacta de vencimiento
 *   2. VENCIMIENTO PRÓXIMO  (AMARILLO)— día 1 del mes anterior al vencimiento
 *   3. ACTUALIZACIÓN        (AZUL)    — día exacto de revisión del precio
 *   4. ACTUALIZACIÓN PRÓXIMA(CELESTE) — día 1 del mes anterior a la revisión
 */
export async function crearEventosContrato(params: {
  fechaInicio: string;
  fechaVencimiento: string;
  mesesActualizacion: number;
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
  montoMensual?: number;
  indiceActualizacion?: string;
}): Promise<CalendarResult & { creados: number; omitidos: number }> {
  try {
    const {
      fechaInicio, fechaVencimiento, mesesActualizacion,
      direccion, inquilino, telefono, contratoId,
      montoMensual, indiceActualizacion,
    } = params;

    const base: DatosEvento = { direccion, inquilino, telefono, contratoId };
    const eventIds: string[] = [];
    let creados = 0;
    let omitidos = 0;

    async function push(titulo: string, fecha: string, tipo: TipoEvento, datos: DatosEvento) {
      const result = await upsertEvento(titulo, fecha, tipo, datos);
      eventIds.push(result.id);
      if (result.created) creados++; else omitidos++;
    }

    // 1. VENCIMIENTO — ROJO (fecha exacta)
    await push(
      `VENCIMIENTO: ${direccion}`,
      fechaVencimiento,
      "vencimiento_real",
      { ...base, fechaVencimiento },
    );

    // 2. VENCIMIENTO — AMARILLO (mes previo al vencimiento)
    const fechaAlerta = fechaAlertaVencimiento(fechaVencimiento);
    await push(
      `VENCIMIENTO: ${direccion}`,
      fechaAlerta,
      "alerta_vencimiento",
      { ...base, fechaVencimiento },
    );

    // 3. ACTUALIZACIÓN (AZUL) + 4. ACTUALIZACIÓN (CELESTE, mes previo)
    const fechasAct = fechasActualizacion(fechaInicio, mesesActualizacion, fechaVencimiento);
    for (const fecha of fechasAct) {
      const [ay, am] = fecha.split("-").map(Number);
      const prevD = new Date(ay, am - 2, 1);
      const fechaAlertaAct = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}-01`;

      await push(
        `ACTUALIZACIÓN: ${direccion}`,
        fechaAlertaAct,
        "alerta_actualizacion",
        { ...base, fechaVencimiento, montoMensual, indice: indiceActualizacion },
      );
      await push(
        `ACTUALIZACIÓN: ${direccion}`,
        fecha,
        "actualizacion",
        { ...base, fechaVencimiento, montoMensual, indice: indiceActualizacion },
      );
    }

    console.log(
      `[Google Calendar] Contrato ${contratoId}: creados=${creados}, omitidos=${omitidos}`,
    );

    return { ok: true, eventIds, creados, omitidos };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Google Calendar] Error al crear eventos:", msg);
    return { ok: false, error: msg, creados: 0, omitidos: 0 };
  }
}

/** Obtiene los próximos N eventos del calendario. */
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

/** Obtiene todos los eventos en un rango YYYY-MM-DD → YYYY-MM-DD. */
export async function obtenerEventosPorRango(
  start: string,
  end: string,
): Promise<EventoCalendario[]> {
  const calendar = getCalendar();
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

export function googleCalendarConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

// ── Helpers internos ──────────────────────────────────────────────────────────

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
  const startDT = e.start?.dateTime;
  const hora = startDT ? startDT.slice(11, 16) : undefined;
  return {
    id: e.id ?? "",
    titulo: e.summary ?? "",
    fecha: e.start?.date ?? startDT?.slice(0, 10) ?? "",
    hora,
    tipo: (priv.tipo as TipoEvento) ?? "alerta_vencimiento",
    direccion: priv.direccion ?? e.summary ?? "",
    inquilino: priv.inquilino ?? "",
    telefono: priv.telefono || null,
    contratoId: priv.contratoId ?? "",
    htmlLink: e.htmlLink ?? "",
    fechaVencimiento: priv.fechaVencimiento || undefined,
    montoMensual: priv.montoMensual ? Number(priv.montoMensual) : undefined,
    indice: priv.indice || undefined,
    notas: priv.notas || undefined,
    nombreInteresado: priv.nombreInteresado || undefined,
    telefonoInteresado: priv.telefonoInteresado || undefined,
  };
}

// ── Crear evento personalizado (VERDE) ────────────────────────────────────────

export type DatosEventoPersonalizado = {
  tipo: TipoEventoPersonalizado;
  fecha: string;             // YYYY-MM-DD
  hora?: string;             // HH:MM
  notas?: string;
  nombreCliente?: string;
  telefonoCliente?: string;
  nombrePropiedad?: string;
  nombreInteresado?: string;
  telefonoInteresado?: string;
};

export async function crearEventoPersonalizado(
  datos: DatosEventoPersonalizado,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const calendar = getCalendar();
    const label = LABEL_TIPO_EVENTO[datos.tipo];

    // Armar start/end: si hay hora, usar dateTime; si no, all-day
    let startObj: { date?: string; dateTime?: string; timeZone?: string };
    let endObj: { date?: string; dateTime?: string; timeZone?: string };
    if (datos.hora) {
      const tz = "America/Argentina/Buenos_Aires";
      startObj = { dateTime: `${datos.fecha}T${datos.hora}:00`, timeZone: tz };
      const [hh, mm] = datos.hora.split(":").map(Number);
      const endH = String(hh + 1).padStart(2, "0");
      endObj = { dateTime: `${datos.fecha}T${endH}:${String(mm).padStart(2, "0")}:00`, timeZone: tz };
    } else {
      startObj = { date: datos.fecha };
      endObj = { date: datos.fecha };
    }

    const priv: Record<string, string> = {
      tipo: datos.tipo,
      ...(datos.notas ? { notas: datos.notas } : {}),
      ...(datos.nombreCliente ? { inquilino: datos.nombreCliente } : {}),
      ...(datos.telefonoCliente ? { telefono: datos.telefonoCliente } : {}),
      ...(datos.nombrePropiedad ? { direccion: datos.nombrePropiedad } : {}),
      ...(datos.nombreInteresado ? { nombreInteresado: datos.nombreInteresado } : {}),
      ...(datos.telefonoInteresado ? { telefonoInteresado: datos.telefonoInteresado } : {}),
    };

    const summaryParts = [label];
    if (datos.nombrePropiedad) summaryParts.push(datos.nombrePropiedad);
    else if (datos.nombreCliente) summaryParts.push(datos.nombreCliente);

    let res;
    try {
      res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: summaryParts.join(": "),
          start: startObj,
          end: endObj,
          colorId: COLOR_ID[datos.tipo],
          extendedProperties: { private: priv },
          description: datos.notas ?? undefined,
        },
      });
    } catch (insertErr) {
      const err = insertErr as Error & { response?: { data?: unknown; status?: number } };
      const httpStatus = err.response?.status;
      const apiError = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(
        `[Google Calendar] crearEventoPersonalizado INSERT falló — HTTP ${httpStatus ?? "?"} — ` +
        `tipo="${datos.tipo}", fecha="${datos.fecha}", calendarId="${CALENDAR_ID}": ${apiError}`,
      );
      return { ok: false, error: `HTTP ${httpStatus ?? "?"}: ${apiError}` };
    }

    console.info(
      `[Google Calendar] Evento personalizado creado — id: ${res.data.id}, ` +
      `tipo: "${datos.tipo}", fecha: ${datos.fecha}, calendarId: ${CALENDAR_ID}, ` +
      `status: ${res.data.status ?? "?"}`,
    );
    return { ok: true, id: res.data.id ?? undefined };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[Google Calendar] Error inesperado al crear evento personalizado:", err);
    return { ok: false, error: err };
  }
}

// ── Eliminar evento ───────────────────────────────────────────────────────────

export async function eliminarEvento(
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const calendar = getCalendar();
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[Google Calendar] Error al eliminar evento:", err);
    return { ok: false, error: err };
  }
}
