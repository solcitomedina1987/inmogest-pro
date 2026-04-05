/**
 * GET /api/cron/actualizaciones
 *
 * Maneja dos flujos automáticos según el día del mes:
 *
 * FLUJO A — Día 1 de cada mes (0 9 1 * *)
 *   Detecta contratos cuyo mes de actualización de precio ES el mes actual
 *   y envía WhatsApp + email al WhatsApp de la Consultora.
 *
 * FLUJO B — Día 2 de cada mes (0 9 2 * *)
 *   Detecta contratos cuya fecha_vencimiento cae en exactamente 2 meses
 *   y envía aviso de vencimiento próximo.
 *
 * Ambos flujos son idempotentes via tabla notificaciones_enviadas.
 * Para forzar un flujo en pruebas: GET /api/cron/actualizaciones?dia=1 o ?dia=2
 *
 * Protegido: Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  mesActualYYYYMM,
  contratosConActualizacionEnMes,
  contratosConVencimientoEn,
  formatMesHumano,
} from "@/lib/cobranzas/alertas-actualizacion";
import { htmlEmailInquilino, htmlEmailAdmin } from "@/lib/email/templates-actualizacion";
import {
  sendWhatsAppAlert,
  mensajeActualizacionPrecio,
  mensajeVencimientoContrato,
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

// ── Handler principal ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Autenticación
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detectar día del mes (permite override via ?dia=1 o ?dia=2 para pruebas)
  const { searchParams } = new URL(request.url);
  const diaParam = searchParams.get("dia");
  const diaHoy = diaParam ? Number(diaParam) : new Date().getDate();

  const mesActual = mesActualYYYYMM();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Cargar todos los contratos activos con datos completos (una sola query para ambos flujos)
  const { data: contratosRaw, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, fecha_inicio, fecha_vencimiento, monto_mensual,
      meses_actualizacion, indice_actualizacion, ultima_actualizacion, is_active,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, email, telefono )
    `)
    .eq("is_active", true);

  if (cErr) {
    console.error("[CRON] Error al cargar contratos:", cErr.message);
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // Normalizar contratos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contratos: ContratoCobranzaRow[] = (contratosRaw ?? []).map((r: any) => ({
    id: r.id,
    propiedad_id: r.propiedad_id ?? "",
    cliente_id: r.cliente_id ?? "",
    locador_id: r.locador_id ?? "",
    fecha_inicio: r.fecha_inicio,
    fecha_vencimiento: r.fecha_vencimiento,
    monto_mensual: Number(r.monto_mensual),
    dia_limite_pago: Number(r.dia_limite_pago ?? 10),
    meses_actualizacion: Number(r.meses_actualizacion),
    indice_actualizacion: r.indice_actualizacion ?? "ICL",
    ultima_actualizacion: r.ultima_actualizacion ?? null,
    is_active: true,
    propiedad: Array.isArray(r.propiedad) ? r.propiedad[0] : r.propiedad,
    inquilino: Array.isArray(r.inquilino) ? r.inquilino[0] : r.inquilino,
  }));

  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
  const waActivo = callmebotConfigurado();

  const { data: admins } = await supabase
    .from("perfiles")
    .select("email")
    .eq("rol", "admin");
  const emailsAdmins: string[] = (admins ?? [])
    .map((a: { email: string }) => a.email)
    .filter(Boolean);

  const resultados: Record<string, unknown> = { dia: diaHoy, mes: mesActual };
  const advertencias: string[] = [];
  if (!resend) advertencias.push("RESEND_API_KEY no configurada");
  if (!waActivo) advertencias.push("CALLMEBOT_API_KEY no configurada");

  // ── FLUJO A: Día 1 — Actualización de precio ─────────────────────────────
  if (diaHoy === 1) {
    const paraActualizar = contratosConActualizacionEnMes(contratos, mesActual);
    const flujoa: Array<{ contratoId: string; acciones: string[] }> = [];

    for (const c of paraActualizar) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inq = c.inquilino as any;
      const prop = c.propiedad as { nombre: string; direccion?: string } | null;

      const direccion = prop?.direccion ?? prop?.nombre ?? "sin dirección";
      const nombreInquilino = inq?.nombre_completo ?? "Inquilino";
      const emailInquilino: string | null = inq?.email ?? null;
      const telefonoInquilino: string | null = inq?.telefono ?? null;
      const indice = c.indice_actualizacion ?? "ICL";
      const mesHumano = formatMesHumano(mesActual);
      const acciones: string[] = [];

      // WhatsApp
      const yaWa = await notificacionYaEnviada(supabase, c.id, mesActual, "whatsapp", "actualizacion_precio");
      if (!yaWa) {
        if (waActivo) {
          const msg = mensajeActualizacionPrecio({ direccionPropiedad: direccion, nombreInquilino, telefonoInquilino, indice });
          const r = await sendWhatsAppAlert(msg);
          if (r.ok) {
            await registrarNotificacion(supabase, c.id, mesActual, "whatsapp", "actualizacion_precio", "consultora");
            acciones.push("✓ whatsapp enviado");
          } else {
            acciones.push(`✗ whatsapp ERROR: ${r.info}`);
          }
        } else {
          acciones.push("⚠ whatsapp no configurado");
        }
      } else {
        acciones.push("— whatsapp ya enviado");
      }

      // Email inquilino
      if (emailInquilino && resend) {
        const yaEmail = await notificacionYaEnviada(supabase, c.id, mesActual, "email_inquilino", "actualizacion_precio");
        if (!yaEmail) {
          try {
            await resend.emails.send({
              from: `${BRAND_NAME} <${EMAIL_FROM}>`,
              to: [emailInquilino],
              subject: `Actualización de alquiler — ${mesHumano}`,
              html: htmlEmailInquilino({ direccionPropiedad: direccion, nombreInquilino, emailInquilino, mesActualizacion: mesActual, mesActualizacionHumano: mesHumano, indice, montoActual: Number(c.monto_mensual) }),
            });
            await registrarNotificacion(supabase, c.id, mesActual, "email_inquilino", "actualizacion_precio", emailInquilino);
            acciones.push(`✓ email → ${emailInquilino}`);
          } catch (e) {
            acciones.push(`✗ email ERROR: ${String(e)}`);
          }
        } else {
          acciones.push("— email ya enviado");
        }
      }

      // Email admins
      if (emailsAdmins.length > 0 && resend) {
        const yaAdmin = await notificacionYaEnviada(supabase, c.id, mesActual, "email_admin", "actualizacion_precio");
        if (!yaAdmin) {
          try {
            await resend.emails.send({
              from: `${BRAND_NAME} <${EMAIL_FROM}>`,
              to: emailsAdmins,
              subject: `[Admin] Actualización de alquiler — ${direccion}`,
              html: htmlEmailAdmin({ direccionPropiedad: direccion, nombreInquilino, emailInquilino, mesActualizacion: mesActual, mesActualizacionHumano: mesHumano, indice, montoActual: Number(c.monto_mensual) }),
            });
            await registrarNotificacion(supabase, c.id, mesActual, "email_admin", "actualizacion_precio", emailsAdmins.join(", "));
            acciones.push(`✓ email_admin → ${emailsAdmins.join(", ")}`);
          } catch (e) {
            acciones.push(`✗ email_admin ERROR: ${String(e)}`);
          }
        } else {
          acciones.push("— email_admin ya enviado");
        }
      }

      flujoa.push({ contratoId: c.id, acciones });
    }

    resultados.flujoA = {
      descripcion: "Actualización de precio",
      procesados: paraActualizar.length,
      detalles: flujoa,
    };
  }

  // ── FLUJO B: Día 2 — Vencimientos en 2 meses ─────────────────────────────
  if (diaHoy === 2) {
    const porVencer = contratosConVencimientoEn(contratos, 2, mesActual);
    const flujob: Array<{ contratoId: string; acciones: string[] }> = [];

    for (const c of porVencer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inq = c.inquilino as any;
      const prop = c.propiedad as { nombre: string; direccion?: string } | null;

      const direccion = prop?.direccion ?? prop?.nombre ?? "sin dirección";
      const nombreInquilino = inq?.nombre_completo ?? "Inquilino";
      const telefonoInquilino: string | null = inq?.telefono ?? null;
      const acciones: string[] = [];

      // Formatear fecha de vencimiento legible
      const [yv, mv, dv] = c.fecha_vencimiento.split("-");
      const fechaVencHumana = `${dv}/${mv}/${yv}`;

      // WhatsApp
      const yaWa = await notificacionYaEnviada(supabase, c.id, mesActual, "whatsapp", "vencimiento_contrato");
      if (!yaWa) {
        if (waActivo) {
          const msg = mensajeVencimientoContrato({
            direccionPropiedad: direccion,
            nombreInquilino,
            telefonoInquilino,
            fechaVencimiento: fechaVencHumana,
          });
          const r = await sendWhatsAppAlert(msg);
          if (r.ok) {
            await registrarNotificacion(supabase, c.id, mesActual, "whatsapp", "vencimiento_contrato", "consultora");
            acciones.push(`✓ whatsapp vencimiento enviado (vence ${fechaVencHumana})`);
          } else {
            acciones.push(`✗ whatsapp ERROR: ${r.info}`);
          }
        } else {
          acciones.push("⚠ whatsapp no configurado");
        }
      } else {
        acciones.push("— whatsapp vencimiento ya enviado");
      }

      flujob.push({ contratoId: c.id, acciones });
    }

    resultados.flujoB = {
      descripcion: "Vencimientos en 2 meses",
      procesados: porVencer.length,
      detalles: flujob,
    };
  }

  if (advertencias.length > 0) resultados.advertencias = advertencias;

  return NextResponse.json({ ok: true, ...resultados });
}

// ── Helpers de idempotencia ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notificacionYaEnviada(supabase: any, contratoId: string, mes: string, canal: string, tipo: string): Promise<boolean> {
  const { data } = await supabase
    .from("notificaciones_enviadas")
    .select("id")
    .eq("contrato_id", contratoId)
    .eq("tipo", tipo)
    .eq("mes_periodo", mes)
    .eq("canal", canal)
    .maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registrarNotificacion(supabase: any, contratoId: string, mes: string, canal: string, tipo: string, destinatario: string) {
  await supabase.from("notificaciones_enviadas").insert({
    contrato_id: contratoId,
    tipo,
    mes_periodo: mes,
    canal,
    destinatario,
  });
}
