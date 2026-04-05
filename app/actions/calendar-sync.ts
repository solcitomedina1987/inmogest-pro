"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { crearEventosContrato, googleCalendarConfigurado } from "@/lib/google/calendar";

export type SyncResult = {
  ok: boolean;
  message: string;
  total: number;
  exitosos: number;
  fallidos: number;
  creadosTotal: number;
  omitidosTotal: number;
  detalles: { contrato: string; ok: boolean; creados?: number; omitidos?: number; error?: string }[];
};

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Sincroniza eventos en Google Calendar para TODOS los contratos activos.
 * Es idempotente: si un evento ya existe (misma eventKey), lo omite sin duplicar.
 */
export async function sincronizarContratosAlCalendario(): Promise<SyncResult> {
  if (!googleCalendarConfigurado()) {
    return {
      ok: false,
      message: "Google Calendar no está configurado. Verificar GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY.",
      total: 0, exitosos: 0, fallidos: 0, creadosTotal: 0, omitidosTotal: 0, detalles: [],
    };
  }

  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      message: "Sin permisos de administrador.",
      total: 0, exitosos: 0, fallidos: 0, creadosTotal: 0, omitidosTotal: 0, detalles: [],
    };
  }
  const { supabase } = gate;

  // Obtener todos los contratos activos con datos relacionados
  const { data: contratos, error } = await supabase
    .from("contratos_cobranza")
    .select(
      `id, fecha_inicio, fecha_vencimiento, meses_actualizacion, monto_mensual, indice_actualizacion,
       propiedad:propiedades!contratos_cobranza_propiedad_id_fkey(nombre, direccion),
       inquilino:clientes!contratos_cobranza_cliente_id_fkey(nombre_completo, telefono)`,
    )
    .eq("is_active", true)
    .order("fecha_inicio", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: `Error al obtener contratos: ${error.message}`,
      total: 0, exitosos: 0, fallidos: 0, creadosTotal: 0, omitidosTotal: 0, detalles: [],
    };
  }

  if (!contratos || contratos.length === 0) {
    return {
      ok: true,
      message: "No hay contratos activos para sincronizar.",
      total: 0, exitosos: 0, fallidos: 0, creadosTotal: 0, omitidosTotal: 0, detalles: [],
    };
  }

  const detalles: SyncResult["detalles"] = [];
  let exitosos = 0;
  let fallidos = 0;
  let creadosTotal = 0;
  let omitidosTotal = 0;

  for (const c of contratos) {
    const row = c as Record<string, unknown>;

    type PropData = { nombre?: string; direccion?: string } | null;
    type InqData = { nombre_completo?: string; telefono?: string } | null;

    const propiedadRaw = unwrapFk(row.propiedad as PropData | PropData[]);
    const inquilinoRaw = unwrapFk(row.inquilino as InqData | InqData[]);

    const direccion =
      propiedadRaw?.nombre ||
      propiedadRaw?.direccion ||
      `Contrato ${row.id as string}`;
    const inquilino = inquilinoRaw?.nombre_completo ?? "Inquilino";
    const telefono = inquilinoRaw?.telefono ?? null;

    const contratoLabel = `${direccion} — ${inquilino}`;

    try {
      const result = await crearEventosContrato({
        fechaInicio: row.fecha_inicio as string,
        fechaVencimiento: row.fecha_vencimiento as string,
        mesesActualizacion: Number(row.meses_actualizacion),
        direccion,
        inquilino,
        telefono,
        contratoId: row.id as string,
        montoMensual: Number(row.monto_mensual),
        indiceActualizacion: (row.indice_actualizacion as string) ?? "ICL",
      });

      if (result.ok) {
        exitosos++;
        creadosTotal += result.creados;
        omitidosTotal += result.omitidos;
        detalles.push({
          contrato: contratoLabel,
          ok: true,
          creados: result.creados,
          omitidos: result.omitidos,
        });
      } else {
        fallidos++;
        detalles.push({ contrato: contratoLabel, ok: false, error: result.error });
      }
    } catch (e) {
      fallidos++;
      detalles.push({
        contrato: contratoLabel,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const total = contratos.length;

  let message: string;
  if (fallidos === 0 && creadosTotal === 0) {
    message = `✅ Todo al día — ${omitidosTotal} evento${omitidosTotal !== 1 ? "s" : ""} ya existían, no se crearon duplicados.`;
  } else if (fallidos === 0) {
    message = `✅ ${creadosTotal} evento${creadosTotal !== 1 ? "s" : ""} creado${creadosTotal !== 1 ? "s" : ""} · ${omitidosTotal} ya existían (sin duplicados).`;
  } else {
    message = `⚠️ ${exitosos} OK / ${fallidos} con error. Creados: ${creadosTotal}, omitidos: ${omitidosTotal}.`;
  }

  return { ok: fallidos === 0, message, total, exitosos, fallidos, creadosTotal, omitidosTotal, detalles };
}
