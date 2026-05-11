import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

/**
 * GET /api/calendar/test
 * Diagnostica paso a paso la conexión con Google Calendar.
 *
 * Pasos:
 *  1. Variables de entorno presentes
 *  2. Formato correcto de la clave privada
 *  3. Autenticación OAuth2 OK
 *  4. Acceso al calendario configurado
 *  5. ⚠️ Visibilidad: detecta si GOOGLE_CALENDAR_ID='primary' (invisible para humanos)
 *  6. Lectura de eventos (conteo)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const steps: { label: string; ok: boolean; detail: string; warn?: boolean }[] = [];

  // ── Paso 1: Variables de entorno ────────────────────────────────────────────
  const email = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const calId = process.env.GOOGLE_CALENDAR_ID ?? "";

  const usingPrimary = !calId || calId === "primary";

  steps.push({
    label: "Variables de entorno",
    ok: Boolean(email && rawKey),
    detail: email
      ? `GOOGLE_CLIENT_EMAIL: ${email} | GOOGLE_CALENDAR_ID: ${calId || "(no configurado — usando 'primary')"}`
      : "Faltan GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY",
  });
  if (!email || !rawKey) return NextResponse.json({ ok: false, steps });

  // ── Paso 2: Formato de la clave privada ─────────────────────────────────────
  const privateKey = rawKey
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n");
  const hasBegin = privateKey.includes("-----BEGIN PRIVATE KEY-----");
  const hasEnd = privateKey.includes("-----END PRIVATE KEY-----");
  const newlineCount = (privateKey.match(/\n/g) ?? []).length;
  steps.push({
    label: "Formato de la clave privada",
    ok: hasBegin && hasEnd && newlineCount >= 25,
    detail:
      !hasBegin || !hasEnd
        ? "Clave inválida — no contiene BEGIN/END PRIVATE KEY."
        : newlineCount < 25
          ? `Clave sin saltos de línea correctos (${newlineCount} encontrados, se esperan ≥25).`
          : `Clave válida — ${privateKey.length} caracteres, ${newlineCount} líneas.`,
  });
  if (!hasBegin || !hasEnd || newlineCount < 25) return NextResponse.json({ ok: false, steps });

  // ── Paso 3 y 4: Autenticación y acceso al calendario ────────────────────────
  const CALENDAR_ID = usingPrimary ? "primary" : calId;

  let calendarSummary = "";
  let calendarOwner = "";

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    await auth.getAccessToken();
    steps.push({
      label: "Autenticación Google OAuth2",
      ok: true,
      detail: `Token obtenido correctamente para ${email}`,
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Paso 4: Acceder al calendario
    try {
      const cal = await calendar.calendars.get({ calendarId: CALENDAR_ID });
      calendarSummary = cal.data.summary ?? CALENDAR_ID;
      calendarOwner = (cal.data as { id?: string }).id ?? CALENDAR_ID;
      steps.push({
        label: "Acceso al calendario",
        ok: true,
        detail: `Calendario: "${calendarSummary}" (ID: ${calendarOwner})`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = msg.includes("404")
        ? `Calendario "${CALENDAR_ID}" no encontrado. Verificar GOOGLE_CALENDAR_ID y que esté compartido con ${email}.`
        : msg.includes("403")
          ? `Sin permisos. Compartir "${CALENDAR_ID}" con "${email}" con permiso "Realizar cambios en los eventos".`
          : `Error: ${msg}`;
      steps.push({ label: "Acceso al calendario", ok: false, detail: hint });
      return NextResponse.json({ ok: false, steps });
    }

    // ── Paso 5: VISIBILIDAD — advertencia si usa 'primary' ─────────────────────
    // Cuando GOOGLE_CALENDAR_ID='primary', los eventos van al calendario privado
    // de la Service Account — ese calendario NO aparece en Google Calendar web/móvil.
    if (usingPrimary) {
      steps.push({
        label: "Visibilidad del calendario ⚠️",
        ok: false,
        warn: true,
        detail:
          `GOOGLE_CALENDAR_ID='primary' apunta al calendario PRIVADO de la Service Account ` +
          `(${email}). Ese calendario NO es visible en Google Calendar web ni móvil. ` +
          `Para ver los eventos, debés: (1) abrir calendar.google.com, (2) ir a Configuración ` +
          `del calendario que querés usar, (3) copiar el "ID del calendario", ` +
          `(4) compartirlo con "${email}" (permiso: Realizar cambios en los eventos), ` +
          `(5) actualizar GOOGLE_CALENDAR_ID en .env.local y en Vercel con ese ID.`,
      });
    } else {
      // Verificar si el owner del calendario coincide con la SA o con una cuenta humana
      const isProbablySACalendar = calendarOwner.includes("iam.gserviceaccount.com");
      if (isProbablySACalendar) {
        steps.push({
          label: "Visibilidad del calendario ⚠️",
          ok: false,
          warn: true,
          detail:
            `El calendario "${calendarSummary}" parece pertenecer a la Service Account. ` +
            `Los calendarios de SA no son visibles en la interfaz web. ` +
            `Usá el ID de un calendario personal o de Google Workspace y compartilo con "${email}".`,
        });
      } else {
        steps.push({
          label: "Visibilidad del calendario",
          ok: true,
          detail: `El calendario "${calendarSummary}" (${calendarOwner}) es un calendario humano/organización — los eventos serán visibles en Google Calendar.`,
        });
      }
    }

    // ── Paso 6: Lectura de eventos ──────────────────────────────────────────────
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
    });
    const count = res.data.items?.length ?? 0;
    const firstEvent = res.data.items?.[0];
    steps.push({
      label: "Lectura de eventos",
      ok: true,
      detail: count > 0
        ? `${count} próximo(s) evento(s). Primero: "${firstEvent?.summary ?? "?"}" el ${firstEvent?.start?.date ?? firstEvent?.start?.dateTime?.slice(0, 10) ?? "?"}`
        : "Sin eventos futuros — usá 'Sincronizar contratos' o 'Evento de prueba'.",
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    steps.push({ label: "Autenticación Google OAuth2", ok: false, detail: msg });
    return NextResponse.json({ ok: false, steps });
  }

  const allCriticalOk = steps.filter((s) => !s.warn).every((s) => s.ok);
  return NextResponse.json({ ok: allCriticalOk, steps, usingPrimary });
}
