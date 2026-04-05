/**
 * GET /api/cron/notificaciones
 *
 * Cron automático ejecutado el día 5 de cada mes.
 * Maneja dos flujos:
 *
 * FLUJO A (día 5): Contratos cuya actualización de precio cae en el mes actual.
 *   → Envía aviso de ACTUALIZACION al número admin de la Consultora.
 *
 * FLUJO B (día 5): Contratos cuya fecha_vencimiento cae en el mes siguiente.
 *   → Envía aviso de VENCIMIENTO al número admin de la Consultora.
 *
 * Idempotente: verifica notificaciones_enviadas antes de enviar.
 * Para pruebas: GET /api/cron/notificaciones?dia=5
 *
 * Protegido: Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  contratosConActualizacionEnMes,
  contratosConVencimientoEn,
  mesActualYYYYMM,
} from "@/lib/cobranzas/alertas-actualizacion";
import {
  sendWhatsApp,
  mensajeActualizacion,
  mensajeVencimiento,
  normalizarWhatsApp,
  twilioConfigurado,
} from "@/lib/twilio/whatsapp";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";

// ── Config ────────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_WA = process.env.TWILIO_WHATSAPP_ADMIN ?? normalizarWhatsApp("+5492664791345");

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const diaParam = searchParams.get("dia");
  const diaHoy = diaParam ? Number(diaParam) : new Date().getDate();
  const mesActual = mesActualYYYYMM();

  if (diaHoy !== 5) {
    return NextResponse.json({
      ok: true,
      mensaje: `Cron ignorado: hoy es día ${diaHoy}, se ejecuta el día 5.`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const waActivo = twilioConfigurado();
  if (!waActivo) {
    return NextResponse.json({
      ok: false,
      error: "Twilio no configurado. Verificar variables de entorno.",
    });
  }

  // Cargar contratos activos con datos completos
  const { data: contratosRaw, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select(`
      id, fecha_inicio, fecha_vencimiento, monto_mensual,
      meses_actualizacion, indice_actualizacion, ultima_actualizacion, is_active,
      propiedad:propiedades ( nombre, direccion ),
      inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo, telefono )
    `)
    .eq("is_active", true);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // Normalizar
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

  const resultados: Array<{ contratoId: string; tipo: string; resultado: string }> = [];

  // ── FLUJO A: Actualización de precio (mes en curso) ───────────────────────
  const paraActualizar = contratosConActualizacionEnMes(contratos, mesActual);

  for (const c of paraActualizar) {
    const yaEnviado = await notifYaEnviada(supabase, c.id, mesActual, "actualizacion_precio", "whatsapp");
    if (yaEnviado) {
      resultados.push({ contratoId: c.id, tipo: "ACTUALIZACION", resultado: "ya enviado" });
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inq = c.inquilino as any;
    const prop = c.propiedad as { nombre: string; direccion?: string } | null;

    const msg = mensajeActualizacion({
      direccion: prop?.direccion ?? prop?.nombre ?? "sin dirección",
      nombreInquilino: inq?.nombre_completo ?? "Inquilino",
      telefonoInquilino: inq?.telefono ?? null,
      indice: c.indice_actualizacion ?? "ICL",
      montoActual: Number(c.monto_mensual),
    });

    const r = await sendWhatsApp(ADMIN_WA, msg);
    if (r.ok) {
      await registrarNotif(supabase, c.id, mesActual, "actualizacion_precio", "whatsapp", ADMIN_WA);
      resultados.push({ contratoId: c.id, tipo: "ACTUALIZACION", resultado: `✓ enviado (sid: ${r.sid})` });
    } else {
      resultados.push({ contratoId: c.id, tipo: "ACTUALIZACION", resultado: `✗ ERROR: ${r.error}` });
    }
  }

  // ── FLUJO B: Contratos que vencen el mes siguiente ────────────────────────
  const porVencer = contratosConVencimientoEn(contratos, 1, mesActual); // 1 mes desde hoy

  for (const c of porVencer) {
    const yaEnviado = await notifYaEnviada(supabase, c.id, mesActual, "vencimiento_contrato", "whatsapp");
    if (yaEnviado) {
      resultados.push({ contratoId: c.id, tipo: "VENCIMIENTO", resultado: "ya enviado" });
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inq = c.inquilino as any;
    const prop = c.propiedad as { nombre: string; direccion?: string } | null;

    const msg = mensajeVencimiento({
      direccion: prop?.direccion ?? prop?.nombre ?? "sin dirección",
      nombreInquilino: inq?.nombre_completo ?? "Inquilino",
      telefonoInquilino: inq?.telefono ?? null,
      fechaVencimiento: c.fecha_vencimiento,
    });

    const r = await sendWhatsApp(ADMIN_WA, msg);
    if (r.ok) {
      await registrarNotif(supabase, c.id, mesActual, "vencimiento_contrato", "whatsapp", ADMIN_WA);
      resultados.push({ contratoId: c.id, tipo: "VENCIMIENTO", resultado: `✓ enviado (sid: ${r.sid})` });
    } else {
      resultados.push({ contratoId: c.id, tipo: "VENCIMIENTO", resultado: `✗ ERROR: ${r.error}` });
    }
  }

  return NextResponse.json({
    ok: true,
    dia: diaHoy,
    mes: mesActual,
    flujoA: { descripcion: "Actualización precio", procesados: paraActualizar.length },
    flujoB: { descripcion: "Vencimientos próximos (1 mes)", procesados: porVencer.length },
    resultados,
  });
}

// ── Helpers idempotencia ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifYaEnviada(sb: any, contratoId: string, mes: string, tipo: string, canal: string): Promise<boolean> {
  const { data } = await sb.from("notificaciones_enviadas").select("id")
    .eq("contrato_id", contratoId).eq("tipo", tipo)
    .eq("mes_periodo", mes).eq("canal", canal).maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registrarNotif(sb: any, contratoId: string, mes: string, tipo: string, canal: string, destinatario: string) {
  await sb.from("notificaciones_enviadas").insert({ contrato_id: contratoId, tipo, mes_periodo: mes, canal, destinatario });
}
