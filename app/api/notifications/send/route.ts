/**
 * POST /api/notifications/send
 *
 * Envía una notificación WhatsApp manualmente para un contrato.
 * Solo accesible por admins autenticados.
 *
 * Body: {
 *   contratoId: string,
 *   tipo: "VENCIMIENTO" | "ACTUALIZACION"
 * }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendWhatsApp,
  mensajeActualizacion,
  mensajeVencimiento,
  normalizarWhatsApp,
  twilioConfigurado,
  type TipoAlerta,
} from "@/lib/twilio/whatsapp";

export async function POST(request: Request) {
  // 1. Verificar sesión admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.rol !== "admin") {
    return NextResponse.json({ error: "Acceso restringido a admins" }, { status: 403 });
  }

  // 2. Parsear body
  let body: { contratoId?: string; tipo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { contratoId, tipo } = body;
  if (!contratoId || !tipo) {
    return NextResponse.json({ error: "contratoId y tipo son requeridos" }, { status: 400 });
  }
  if (tipo !== "VENCIMIENTO" && tipo !== "ACTUALIZACION") {
    return NextResponse.json({ error: "tipo debe ser VENCIMIENTO o ACTUALIZACION" }, { status: 400 });
  }

  // 3. Verificar configuración Twilio
  if (!twilioConfigurado()) {
    return NextResponse.json(
      { error: "Twilio no configurado. Verificar TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_FROM." },
      { status: 503 },
    );
  }

  // 4. Cargar datos del contrato
  const { data: contrato, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, monto_mensual, fecha_vencimiento, indice_actualizacion,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono )
    `)
    .eq("id", contratoId)
    .maybeSingle();

  if (cErr || !contrato) {
    return NextResponse.json({ error: `Contrato no encontrado: ${cErr?.message ?? "sin datos"}` }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = contrato as any;
  const propiedad = Array.isArray(c.propiedad) ? c.propiedad[0] : c.propiedad;
  const inquilino = Array.isArray(c.inquilino) ? c.inquilino[0] : c.inquilino;

  const direccion: string = propiedad?.direccion ?? propiedad?.nombre ?? "sin dirección";
  const nombreInquilino: string = inquilino?.nombre_completo ?? "Inquilino";
  const telefonoInquilino: string | null = inquilino?.telefono ?? null;
  const indice: string = c.indice_actualizacion ?? "ICL";
  const montoActual: number = Number(c.monto_mensual);
  const fechaVencimiento: string = c.fecha_vencimiento;

  // 5. El destinatario es siempre el admin de la consultora
  const destinatario = process.env.TWILIO_WHATSAPP_ADMIN ?? normalizarWhatsApp("+5492664791345");

  // 6. Construir mensaje según tipo
  const mensaje =
    (tipo as TipoAlerta) === "ACTUALIZACION"
      ? mensajeActualizacion({ direccion, nombreInquilino, telefonoInquilino, indice, montoActual })
      : mensajeVencimiento({ direccion, nombreInquilino, telefonoInquilino, fechaVencimiento });

  // 7. Enviar via Twilio
  const result = await sendWhatsApp(destinatario, mensaje);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sid: result.sid,
    tipo,
    destinatario,
    contrato: contratoId,
  });
}
