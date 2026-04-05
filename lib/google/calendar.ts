/**
 * Servicio de Google Calendar via Service Account
 *
 * Requiere en .env.local / Vercel:
 *   GOOGLE_CLIENT_EMAIL  – email de la service account
 *   GOOGLE_PRIVATE_KEY   – clave privada (con \n reales o escapados)
 *   GOOGLE_CALENDAR_ID   – ID del calendario destino (compartirlo con la service account)
 */

import { google } from "googleapis";

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

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Cuatro tipos de evento con semántica distinta y color propio:
 *  - vencimiento_real     → ROJO      — fecha exacta de vencimiento del contrato
 *  - alerta_vencimiento   → AMARILLO  — día 1 del mes anterior al vencimiento
 *  - actualizacion        → AZUL      — día en que corresponde actualizar el alquiler
 *  - alerta_actualizacion → CELESTE   — día 1 del mes anterior a cada actualización
 */
export type TipoEvento =
  | "vencimiento_real"
  | "alerta_vencimiento"
  | "actualizacion"
  | "alerta_actualizacion";

export type EventoCalendario = {
  id: string;
  titulo: string;
  fecha: string;            // YYYY-MM-DD
  tipo: TipoEvento;
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
  htmlLink: string;
  // Metadata extra (extraída de extendedProperties)
  fechaVencimiento?: string;
  montoMensual?: number;
  indice?: string;            // "IPC" | "ICL"
};

export type CalendarResult =
  | { ok: true; eventIds: string[]; creados: number; omitidos: number }
  | { ok: false; error: string; creados: number; omitidos: number };

// ── colorId de Google Calendar por tipo ──────────────────────────────────────
// 11=Tomato(rojo), 5=Banana(amarillo), 9=Blueberry(azul), 7=Peacock(celeste)
const COLOR_ID: Record<TipoEvento, string> = {
  vencimiento_real: "11",
  alerta_vencimiento: "5",
  actualizacion: "9",
  alerta_actualizacion: "7",
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
 * Inserta un evento si no existe ya uno con la misma eventKey.
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

  // ── Verificar si ya existe ────────────────────────────────────────────────
  const existing = await calendar.events.list({
    calendarId: CALENDAR_ID,
    privateExtendedProperty: [`eventKey=${eventKey}`],
    maxResults: 1,
    singleEvents: true,
    showDeleted: false,
  });
  const existingId = existing.data.items?.[0]?.id;
  if (existingId) {
    return { id: existingId, created: false };
  }

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

  const response = await calendar.events.insert({
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

    // 1. VENCIMIENTO — ROJO
    await push(
      `VENCIMIENTO: ${direccion}`,
      fechaVencimiento,
      "vencimiento_real",
      { ...base, fechaVencimiento },
    );

    // 2. VENCIMIENTO PRÓXIMO — AMARILLO
    const fechaAlerta = fechaAlertaVencimiento(fechaVencimiento);
    await push(
      `VENCIMIENTO PRÓXIMO: ${direccion}`,
      fechaAlerta,
      "alerta_vencimiento",
      { ...base, fechaVencimiento },
    );

    // 3. ACTUALIZACIÓN (AZUL) + 4. ACTUALIZACIÓN PRÓXIMA (CELESTE)
    const fechasAct = fechasActualizacion(fechaInicio, mesesActualizacion, fechaVencimiento);
    for (const fecha of fechasAct) {
      const [ay, am] = fecha.split("-").map(Number);
      const prevD = new Date(ay, am - 2, 1);
      const fechaAlertaAct = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}-01`;

      await push(
        `ACTUALIZACIÓN PRÓXIMA: ${direccion}`,
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
  return {
    id: e.id ?? "",
    titulo: e.summary ?? "",
    fecha: e.start?.date ?? e.start?.dateTime?.slice(0, 10) ?? "",
    tipo: (priv.tipo as TipoEvento) ?? "alerta_vencimiento",
    direccion: priv.direccion ?? e.summary ?? "",
    inquilino: priv.inquilino ?? "",
    telefono: priv.telefono || null,
    contratoId: priv.contratoId ?? "",
    htmlLink: e.htmlLink ?? "",
    fechaVencimiento: priv.fechaVencimiento || undefined,
    montoMensual: priv.montoMensual ? Number(priv.montoMensual) : undefined,
    indice: priv.indice || undefined,
  };
}
