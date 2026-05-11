import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

/**
 * POST /api/calendar/test-event
 *
 * Crea un evento "TEST CONEXIÓN" en el calendario configurado y devuelve
 * el htmlLink directo para confirmar en qué calendario se insertó.
 * El evento se programa para mañana (all-day) y se elimina automáticamente
 * si ya existe uno con el mismo título en esa fecha.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const calId = process.env.GOOGLE_CALENDAR_ID;

  if (!email || !rawKey) {
    return NextResponse.json({
      ok: false,
      error: "Google Calendar no configurado. Verificar GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY.",
    });
  }

  const CALENDAR_ID = calId && calId !== "primary" ? calId : "primary";
  const usingPrimary = !calId || calId === "primary";

  const privateKey = rawKey
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    // Obtener nombre del calendario
    const calData = await calendar.calendars.get({ calendarId: CALENDAR_ID });
    const calendarName = calData.data.summary ?? CALENDAR_ID;
    const calendarOwnerId = (calData.data as { id?: string }).id ?? "";

    // Fecha para mañana
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fechaISO = mañana.toISOString().slice(0, 10);
    const titulo = "TEST CONEXIÓN — Consultora Medina";

    // Eliminar eventos de prueba anteriores con el mismo título en esa fecha
    const existing = await calendar.events.list({
      calendarId: CALENDAR_ID,
      q: titulo,
      timeMin: new Date(`${fechaISO}T00:00:00`).toISOString(),
      timeMax: new Date(`${fechaISO}T23:59:59`).toISOString(),
      singleEvents: true,
    });
    for (const ev of existing.data.items ?? []) {
      if (ev.summary === titulo && ev.id) {
        await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: ev.id });
      }
    }

    // Insertar el evento de prueba
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: titulo,
        description:
          `Evento de prueba creado por Consultora Medina & Asociados.\n` +
          `Calendario: ${calendarName}\n` +
          `Service Account: ${email}\n` +
          `Si ves este evento en tu Google Calendar, la integración está correctamente configurada.\n` +
          `Podés eliminarlo cuando quieras.`,
        start: { date: fechaISO },
        end: { date: fechaISO },
        colorId: "2", // Sage/verde
        reminders: { useDefault: false },
      },
    });

    const htmlLink = response.data.htmlLink ?? "";
    const eventId = response.data.id ?? "";
    const status = response.data.status ?? "";

    console.info(
      `[Google Calendar] TEST EVENT creado — id: ${eventId}, status: ${status}, ` +
      `calendar: "${calendarName}" (${CALENDAR_ID}), link: ${htmlLink}`,
    );

    return NextResponse.json({
      ok: true,
      eventId,
      htmlLink,
      calendarName,
      calendarId: CALENDAR_ID,
      calendarOwnerId,
      usingPrimary,
      fecha: fechaISO,
      status,
      warning: usingPrimary
        ? `El evento fue creado en el calendario PRIVADO de la Service Account (primary). ` +
          `NO aparecerá en tu Google Calendar. Para solucionarlo: compartí tu calendario ` +
          `con "${email}" y actualizá GOOGLE_CALENDAR_ID.`
        : null,
    });
  } catch (e) {
    const err = e as Error & { response?: { data?: unknown; status?: number } };
    const httpStatus = err.response?.status;
    const apiError = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;

    console.error(
      `[Google Calendar] TEST EVENT falló — HTTP ${httpStatus ?? "?"}:`,
      apiError,
    );

    return NextResponse.json(
      {
        ok: false,
        error: apiError,
        httpStatus,
        hint:
          httpStatus === 403
            ? `Sin permisos. Compartí el calendario "${CALENDAR_ID}" con "${email}" (permiso: Realizar cambios en los eventos).`
            : httpStatus === 404
              ? `Calendario "${CALENDAR_ID}" no encontrado. Verificar GOOGLE_CALENDAR_ID.`
              : undefined,
      },
      { status: 500 },
    );
  }
}
