import type { SupabaseClient } from "@supabase/supabase-js";
import { etiquetaConceptoConEmoji } from "@/lib/cobranzas/conceptos-pago";
import { parseDetallePagoDb } from "@/lib/cobranzas/detalle-pago";
import type { InformeRendicionPayloadV1 } from "@/lib/informes/rendicion-types";

type PagoRow = {
  id: string;
  monto_pagado: number | string | null;
  detalle_pago: unknown;
  mes_periodo: string;
  contrato_id: string;
};

type ContratoMini = {
  id: string;
  propiedad_id: string;
  propiedad: { id: string; direccion: string | null; nombre: string } | { id: string; direccion: string | null; nombre: string }[] | null;
};

function unwrapFk<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function etiquetaPropiedad(p: { direccion?: string | null; nombre?: string | null }): string {
  const d = p.direccion?.trim();
  if (d) return d;
  return p.nombre?.trim() || "—";
}

export async function computeInformeRendicion(
  supabase: SupabaseClient,
  input: {
    propietario_cliente_id: string;
    mes_periodo: string;
    comision_porcentaje: number;
  },
): Promise<{ ok: true; payload: InformeRendicionPayloadV1 } | { ok: false; error: string }> {
  const { propietario_cliente_id, mes_periodo, comision_porcentaje } = input;

  const { data: propRow, error: pErr } = await supabase
    .from("clientes")
    .select("id, nombre_completo, tipo_cliente")
    .eq("id", propietario_cliente_id)
    .maybeSingle();

  if (pErr || !propRow) {
    return { ok: false, error: "Propietario no encontrado." };
  }
  const tipo = (propRow as { tipo_cliente?: string }).tipo_cliente;
  if (tipo !== "Propietario" && tipo !== "Ambos") {
    return { ok: false, error: "El cliente seleccionado no es propietario." };
  }

  const propietarioNombre = String((propRow as { nombre_completo?: string }).nombre_completo ?? "").trim() || "—";

  const { data: props, error: prErr } = await supabase
    .from("propiedades")
    .select("id, direccion, nombre")
    .eq("propietario_id", propietario_cliente_id)
    .eq("is_active", true);

  if (prErr) {
    return { ok: false, error: prErr.message };
  }

  const propIds = (props ?? []).map((r) => (r as { id: string }).id);
  if (propIds.length === 0) {
    const empty: InformeRendicionPayloadV1 = {
      v: 1,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      alquileres: [],
      otros_conceptos: [],
      subtotal_ingresos: 0,
      total_alquileres: 0,
      comision_monto: 0,
      neto_a_rendir: 0,
    };
    return { ok: true, payload: empty };
  }

  const { data: contratosRaw, error: cErr } = await supabase
    .from("contratos_cobranza")
    .select(
      "id, propiedad_id, propiedad:propiedades!contratos_cobranza_propiedad_id_fkey ( id, direccion, nombre )",
    )
    .in("propiedad_id", propIds)
    .is("deleted_at", null);

  if (cErr) {
    return { ok: false, error: cErr.message };
  }

  const contratos = (contratosRaw ?? []) as ContratoMini[];
  const contratoIds = contratos.map((c) => c.id);
  if (contratoIds.length === 0) {
    const empty: InformeRendicionPayloadV1 = {
      v: 1,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      alquileres: [],
      otros_conceptos: [],
      subtotal_ingresos: 0,
      total_alquileres: 0,
      comision_monto: 0,
      neto_a_rendir: 0,
    };
    return { ok: true, payload: empty };
  }

  const propiedadByContrato = new Map<string, { id: string; direccion: string | null; nombre: string }>();
  for (const c of contratos) {
    const pr = unwrapFk(c.propiedad);
    if (pr) {
      propiedadByContrato.set(c.id, pr as { id: string; direccion: string | null; nombre: string });
    }
  }

  const { data: pagosRaw, error: pgErr } = await supabase
    .from("pagos")
    .select("id, monto_pagado, detalle_pago, mes_periodo, contrato_id, estado")
    .in("contrato_id", contratoIds)
    .eq("estado", "Pagado")
    .eq("mes_periodo", mes_periodo);

  if (pgErr) {
    return { ok: false, error: pgErr.message };
  }

  const alquilerPorPropiedad = new Map<string, number>();
  const otros: InformeRendicionPayloadV1["otros_conceptos"] = [];
  let subtotal = 0;
  let totalAlquileres = 0;

  for (const raw of pagosRaw ?? []) {
    const p = raw as PagoRow;
    const montoPagado = p.monto_pagado != null ? Number(p.monto_pagado) : 0;
    subtotal += montoPagado;

    const prop = propiedadByContrato.get(p.contrato_id);
    const propId = prop?.id ?? "sin-propiedad";

    const detalle = parseDetallePagoDb(p.detalle_pago);
    const alq = detalle ? detalle.monto_alquiler : montoPagado;
    totalAlquileres += alq;
    alquilerPorPropiedad.set(propId, (alquilerPorPropiedad.get(propId) ?? 0) + alq);

    if (detalle) {
      for (const ex of detalle.extras) {
        if (ex.monto <= 0) continue;
        otros.push({
          pago_id: p.id,
          concepto: etiquetaConceptoConEmoji(ex.concepto),
          monto: ex.monto,
          observaciones: ex.observaciones,
        });
      }
    }
  }

  const alquileres: InformeRendicionPayloadV1["alquileres"] = [];
  for (const [propiedad_id, monto] of alquilerPorPropiedad) {
    const pr = (props ?? []).find((x) => (x as { id: string }).id === propiedad_id) as
      | { id: string; direccion: string | null; nombre: string }
      | undefined;
    alquileres.push({
      propiedad_id,
      etiqueta: pr ? etiquetaPropiedad(pr) : etiquetaPropiedad({ direccion: null, nombre: "—" }),
      monto,
    });
  }
  alquileres.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

  const comisionMonto = Math.round(totalAlquileres * (comision_porcentaje / 100) * 100) / 100;
  const neto = Math.round((subtotal - comisionMonto) * 100) / 100;

  return {
    ok: true,
    payload: {
      v: 1,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      alquileres,
      otros_conceptos: otros,
      subtotal_ingresos: Math.round(subtotal * 100) / 100,
      total_alquileres: Math.round(totalAlquileres * 100) / 100,
      comision_monto: comisionMonto,
      neto_a_rendir: neto,
    },
  };
}
