"use server";

import { requireAdmin } from "@/lib/supabase/require-admin";
import { crearEventosContrato, googleCalendarConfigurado } from "@/lib/google/calendar";

export type SyncResult = {
  ok: boolean;
  message: string;
  total: number;
  exitosos: number;
  fallidos: number;
  detalles: { contrato: string; ok: boolean; error?: string }[];
};

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Crea eventos en Google Calendar para TODOS los contratos activos.
 * Útil la primera vez o cuando los contratos fueron creados antes de la integración.
 * ⚠️  Si los contratos ya tienen eventos, se crearán duplicados.
 */
export async function sincronizarContratosAlCalendario(): Promise<SyncResult> {
  if (!googleCalendarConfigurado()) {
    return {
      ok: false,
      message: "Google Calendar no está configurado. Verificar GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY.",
      total: 0,
      exitosos: 0,
      fallidos: 0,
      detalles: [],
    };
  }

  const gate = await requireAdmin();
  if (!gate.ok) {
    return {
      ok: false,
      message: "Sin permisos de administrador.",
      total: 0,
      exitosos: 0,
      fallidos: 0,
      detalles: [],
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
      total: 0,
      exitosos: 0,
      fallidos: 0,
      detalles: [],
    };
  }

  if (!contratos || contratos.length === 0) {
    return {
      ok: true,
      message: "No hay contratos activos para sincronizar.",
      total: 0,
      exitosos: 0,
      fallidos: 0,
      detalles: [],
    };
  }

  const detalles: SyncResult["detalles"] = [];
  let exitosos = 0;
  let fallidos = 0;

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
        detalles.push({ contrato: contratoLabel, ok: true });
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
  return {
    ok: fallidos === 0,
    message:
      fallidos === 0
        ? `✅ ${exitosos} contrato${exitosos !== 1 ? "s" : ""} sincronizado${exitosos !== 1 ? "s" : ""} correctamente.`
        : `⚠️ ${exitosos} OK / ${fallidos} con error de ${total} contratos.`,
    total,
    exitosos,
    fallidos,
    detalles,
  };
}
