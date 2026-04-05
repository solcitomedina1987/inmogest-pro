import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerEventosPorRango, googleCalendarConfigurado } from "@/lib/google/calendar";

export async function GET(req: NextRequest) {
  // Verificar sesión activa
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!googleCalendarConfigurado()) {
    return NextResponse.json({ events: [], configured: false });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Parámetros 'start' y 'end' requeridos (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const events = await obtenerEventosPorRango(start, end);
    return NextResponse.json({ events, configured: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al obtener eventos";
    return NextResponse.json({ error: msg, events: [] }, { status: 500 });
  }
}
