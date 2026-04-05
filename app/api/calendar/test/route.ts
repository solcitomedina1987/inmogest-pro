import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

/**
 * GET /api/calendar/test
 * Diagnostica paso a paso la conexión con Google Calendar.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const steps: { label: string; ok: boolean; detail: string }[] = [];

  // ── Paso 1: Variables de entorno ────────────────────────────────────────────
  const email = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const calId = process.env.GOOGLE_CALENDAR_ID ?? "(no configurado)";

  steps.push({
    label: "Variables de entorno",
    ok: Boolean(email && rawKey),
    detail: email
      ? `GOOGLE_CLIENT_EMAIL: ${email} | GOOGLE_CALENDAR_ID: ${calId}`
      : "Faltan GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY",
  });
  if (!email || !rawKey) return NextResponse.json({ ok: false, steps });

  // ── Paso 2: Formato de la clave privada ─────────────────────────────────────
  // Normalizar independientemente de cómo Next.js cargó los \n
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
          ? `Clave sin saltos de línea correctos (${newlineCount} encontrados, se esperan ≥25). Verificar el valor en .env.local o Vercel.`
          : `Clave válida — ${privateKey.length} caracteres, ${newlineCount} líneas.`,
  });
  if (!hasBegin || !hasEnd || newlineCount < 25) return NextResponse.json({ ok: false, steps });

  // ── Paso 3: Autenticación y acceso al calendario ─────────────────────────────
  const CALENDAR_ID = calId === "(no configurado)" ? "primary" : calId;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    await auth.getAccessToken();
    steps.push({ label: "Autenticación Google OAuth2", ok: true, detail: "Token obtenido correctamente" });

    const calendar = google.calendar({ version: "v3", auth });

    // Paso 4: Acceder al calendario
    try {
      const cal = await calendar.calendars.get({ calendarId: CALENDAR_ID });
      steps.push({
        label: "Acceso al calendario",
        ok: true,
        detail: `Calendario: "${cal.data.summary ?? CALENDAR_ID}"`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = msg.includes("404")
        ? `Calendario "${CALENDAR_ID}" no encontrado. Verificar GOOGLE_CALENDAR_ID y que esté compartido con ${email}.`
        : msg.includes("403")
          ? `Sin permisos. Compartir "${CALENDAR_ID}" con "${email}" (permiso "Realizar cambios en los eventos").`
          : msg;
      steps.push({ label: "Acceso al calendario", ok: false, detail: hint });
      return NextResponse.json({ ok: false, steps });
    }

    // Paso 5: Listar eventos
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
    });
    const count = res.data.items?.length ?? 0;
    steps.push({
      label: "Lectura de eventos",
      ok: true,
      detail: count > 0
        ? `${count} próximo(s) evento(s) encontrado(s)`
        : "Conexión OK pero no hay eventos futuros — usar 'Sincronizar contratos' para crearlos",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    steps.push({ label: "Autenticación Google OAuth2", ok: false, detail: msg });
    return NextResponse.json({ ok: false, steps });
  }

  return NextResponse.json({ ok: true, steps });
}
