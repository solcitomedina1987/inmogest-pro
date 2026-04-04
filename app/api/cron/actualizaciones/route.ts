/**
 * GET /api/cron/actualizaciones
 *
 * Cron job que detecta contratos con actualización de precio próxima y envía
 * notificaciones por email (Resend) y WhatsApp (CallMeBot).
 *
 * Programación Vercel (vercel.json): "0 9 11 * *" → día 11 de cada mes a las 9 AM UTC.
 * Protegido: Authorization: Bearer <CRON_SECRET>
 * Idempotente: tabla notificaciones_enviadas con UNIQUE (contrato_id, tipo, mes_periodo, canal).
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  mesActualYYYYMM,
  mesAlertaProximaActualizacion,
  mesSiguiente,
  formatMesHumano,
} from "@/lib/cobranzas/alertas-actualizacion";
import { htmlEmailInquilino, htmlEmailAdmin } from "@/lib/email/templates-actualizacion";
import {
  sendWhatsAppAlert,
  mensajeRecordatorioActualizacion,
  callmebotConfigurado,
} from "@/lib/whatsapp/callmebot";
import { BRAND_NAME } from "@/lib/constants/branding";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";

// ── Config ────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "no-reply@consultoramedina.com.ar";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // 1. Autenticación (Vercel Cron envía el header automáticamente)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // El cron corre el día 11 → calculamos alerta para el mes actual (mes anterior a la actualización)
  const mesAlerta = mesActualYYYYMM();
  const mesActualizacion = mesSiguiente(mesAlerta);
  const mesActualizacionHumano = formatMesHumano(mesActualizacion);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 2. Cargar contratos activos con datos de inquilino y propiedad
  const { data: contratosRaw, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, fecha_inicio, monto_mensual,
      meses_actualizacion, indice_actualizacion, ultima_actualizacion, is_active,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, email, telefono )
    `)
    .eq("is_active", true);

  if (cErr) {
    console.error("[CRON] Error al cargar contratos:", cErr.message);
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // 3. Emails de admins
  const { data: admins } = await supabase
    .from("perfiles")
    .select("email")
    .eq("rol", "admin");

  const emailsAdmins: string[] = (admins ?? [])
    .map((a: { email: string }) => a.email)
    .filter(Boolean);

  // 4. Filtrar contratos con alerta este mes (día 11 del mes anterior a la actualización)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contratosPendientes = (contratosRaw ?? []).filter((row: any) => {
    const c = row as ContratoCobranzaRow;
    const mesAlertaContrato = mesAlertaProximaActualizacion(
      c.fecha_inicio,
      c.meses_actualizacion,
      c.ultima_actualizacion,
    );
    return mesAlertaContrato === mesAlerta;
  });

  if (contratosPendientes.length === 0) {
    return NextResponse.json({
      ok: true,
      procesados: 0,
      mensaje: "Sin contratos para notificar este mes.",
    });
  }

  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
  const waActivo = callmebotConfigurado();
  const resultados: Array<{ contratoId: string; acciones: string[] }> = [];

  for (const row of contratosPendientes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = row as any;
    const acciones: string[] = [];

    const propiedad = Array.isArray(c.propiedad) ? c.propiedad[0] : c.propiedad;
    const inquilino = Array.isArray(c.inquilino) ? c.inquilino[0] : c.inquilino;

    const direccion: string = propiedad?.direccion ?? propiedad?.nombre ?? "sin dirección";
    const nombreInquilino: string = inquilino?.nombre_completo ?? "Inquilino";
    const emailInquilino: string | null = inquilino?.email ?? null;
    const telefonoInquilino: string | null = inquilino?.telefono ?? null;
    const indice: string = c.indice_actualizacion ?? "ICL";
    const montoActual: number = Number(c.monto_mensual);

    const datosTpl = {
      direccionPropiedad: direccion,
      nombreInquilino,
      emailInquilino,
      mesActualizacion,
      mesActualizacionHumano,
      indice,
      montoActual,
    };

    // ── a) Email al inquilino ────────────────────────────────────────────────
    if (emailInquilino && resend) {
      const yaEnviado = await notificacionYaEnviada(supabase, c.id, mesAlerta, "email_inquilino");
      if (!yaEnviado) {
        try {
          await resend.emails.send({
            from: `${BRAND_NAME} <${EMAIL_FROM}>`,
            to: [emailInquilino],
            subject: `Recordatorio: actualización de alquiler — ${mesActualizacionHumano}`,
            html: htmlEmailInquilino(datosTpl),
          });
          await registrarNotificacion(supabase, c.id, mesAlerta, "email_inquilino", emailInquilino);
          acciones.push(`✓ email_inquilino → ${emailInquilino}`);
        } catch (e) {
          acciones.push(`✗ email_inquilino ERROR: ${String(e)}`);
        }
      } else {
        acciones.push("— email_inquilino ya enviado");
      }
    }

    // ── b) Email a admins ────────────────────────────────────────────────────
    if (emailsAdmins.length > 0 && resend) {
      const yaEnviado = await notificacionYaEnviada(supabase, c.id, mesAlerta, "email_admin");
      if (!yaEnviado) {
        try {
          await resend.emails.send({
            from: `${BRAND_NAME} <${EMAIL_FROM}>`,
            to: emailsAdmins,
            subject: `[Admin] Actualización pendiente — ${direccion}`,
            html: htmlEmailAdmin(datosTpl),
          });
          await registrarNotificacion(supabase, c.id, mesAlerta, "email_admin", emailsAdmins.join(", "));
          acciones.push(`✓ email_admin → ${emailsAdmins.join(", ")}`);
        } catch (e) {
          acciones.push(`✗ email_admin ERROR: ${String(e)}`);
        }
      } else {
        acciones.push("— email_admin ya enviado");
      }
    }

    // ── c) WhatsApp via CallMeBot ────────────────────────────────────────────
    // El mensaje va al WhatsApp de la Consultora con los datos del inquilino
    const yaEnviadoWa = await notificacionYaEnviada(supabase, c.id, mesAlerta, "whatsapp");
    if (!yaEnviadoWa) {
      if (waActivo) {
        const mensaje = mensajeRecordatorioActualizacion({
          direccionPropiedad: direccion,
          nombreInquilino,
          telefonoInquilino,
          mesActualizacionHumano,
          indice,
        });
        const result = await sendWhatsAppAlert(mensaje);
        if (result.ok) {
          await registrarNotificacion(supabase, c.id, mesAlerta, "whatsapp", "consultora");
          acciones.push(`✓ whatsapp → consultora (+5492664791345)`);
        } else {
          acciones.push(`✗ whatsapp ERROR: ${result.info}`);
        }
      } else {
        acciones.push("⚠ whatsapp: CALLMEBOT_API_KEY no configurada");
      }
    } else {
      acciones.push("— whatsapp ya enviado");
    }

    resultados.push({ contratoId: c.id, acciones });
  }

  const advertencias: string[] = [];
  if (!resend) advertencias.push("RESEND_API_KEY no configurada — emails no enviados");
  if (!waActivo) advertencias.push("CALLMEBOT_API_KEY no configurada — WhatsApp no enviado");

  return NextResponse.json({
    ok: true,
    mes: mesAlerta,
    procesados: contratosPendientes.length,
    resultados,
    ...(advertencias.length > 0 ? { advertencias } : {}),
  });
}

// ── Helpers de idempotencia ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notificacionYaEnviada(supabase: any, contratoId: string, mes: string, canal: string): Promise<boolean> {
  const { data } = await supabase
    .from("notificaciones_enviadas")
    .select("id")
    .eq("contrato_id", contratoId)
    .eq("tipo", "actualizacion_alquiler")
    .eq("mes_periodo", mes)
    .eq("canal", canal)
    .maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registrarNotificacion(supabase: any, contratoId: string, mes: string, canal: string, destinatario: string) {
  await supabase.from("notificaciones_enviadas").insert({
    contrato_id: contratoId,
    tipo: "actualizacion_alquiler",
    mes_periodo: mes,
    canal,
    destinatario,
  });
}
