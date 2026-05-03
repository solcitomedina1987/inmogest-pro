import type { SupabaseClient } from "@supabase/supabase-js";
import { etiquetaConceptoSinEmoji } from "@/lib/cobranzas/conceptos-pago";
import {
  aDetalleV2,
  parseDetallePagoDb,
  totalCobrarInquilinoDesdeDetalleV2,
  totalRendirPropietarioDesdeDetalleV2,
} from "@/lib/cobranzas/detalle-pago";
import type {
  InformeRendicionPayloadV3,
  LineaRendicionUnidad,
  UnidadRendicionV3,
} from "@/lib/informes/rendicion-types";

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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyPayload(
  propietarioNombre: string,
  mes_periodo: string,
  comision_porcentaje: number,
): InformeRendicionPayloadV3 {
  return {
    v: 3,
    propietario_nombre: propietarioNombre,
    mes_periodo,
    comision_porcentaje,
    unidades: [],
    suma_inmobiliaria_items: [],
    total_suma_inmobiliaria_conceptos: 0,
    total_alquileres_cobrados: 0,
    comision_monto: 0,
    subtotal_a_rendir_propietario: 0,
    total_a_rendir_propietario: 0,
  };
}

function lineasDesdeDetalle(detalle: ReturnType<typeof aDetalleV2>): LineaRendicionUnidad[] {
  const lineas: LineaRendicionUnidad[] = [
    {
      concepto_key: "alquiler",
      concepto: "Alquiler",
      monto: roundMoney(Number(detalle.monto_alquiler) || 0),
      observaciones: null,
    },
  ];
  for (const ex of detalle.extras) {
    const m = Number(ex.monto) || 0;
    if (m <= 0) continue;
    lineas.push({
      concepto_key: ex.concepto,
      concepto: etiquetaConceptoSinEmoji(ex.concepto),
      monto: roundMoney(m),
      observaciones: ex.observaciones,
    });
  }
  return lineas;
}

export async function computeInformeRendicion(
  supabase: SupabaseClient,
  input: {
    propietario_cliente_id: string;
    mes_periodo: string;
    comision_porcentaje: number;
  },
): Promise<{ ok: true; payload: InformeRendicionPayloadV3 } | { ok: false; error: string }> {
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
    return { ok: true, payload: emptyPayload(propietarioNombre, mes_periodo, comision_porcentaje) };
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
    return { ok: true, payload: emptyPayload(propietarioNombre, mes_periodo, comision_porcentaje) };
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

  const unidades: UnidadRendicionV3[] = [];
  const sumaInmobiliariaItems: InformeRendicionPayloadV3["suma_inmobiliaria_items"] = [];
  let sumaAlquileres = 0;

  for (const raw of pagosRaw ?? []) {
    const p = raw as PagoRow;
    const montoPagado = p.monto_pagado != null ? Number(p.monto_pagado) : 0;
    const prop = propiedadByContrato.get(p.contrato_id);
    const propId = prop?.id ?? "sin-propiedad";
    const etiqueta = prop ? etiquetaPropiedad(prop) : "—";

    const detalleRaw = parseDetallePagoDb(p.detalle_pago);
    const detalle = aDetalleV2(detalleRaw, montoPagado);
    sumaAlquileres += roundMoney(Number(detalle.monto_alquiler) || 0);

    const lineas = lineasDesdeDetalle(detalle);
    const subtotalCobrado = totalCobrarInquilinoDesdeDetalleV2(detalle);
    const netoRecibo = totalRendirPropietarioDesdeDetalleV2(detalle);

    unidades.push({
      contrato_id: p.contrato_id,
      propiedad_id: propId,
      etiqueta,
      pago_id: p.id,
      lineas,
      subtotal_cobrado_inquilino: subtotalCobrado,
      neto_propietario_recibo: netoRecibo,
    });

    for (const ex of detalle.extras) {
      if (ex.monto <= 0) continue;
      if (ex.impacto !== "inmobiliaria") continue;
      sumaInmobiliariaItems.push({
        pago_id: p.id,
        concepto_key: ex.concepto,
        concepto: etiquetaConceptoSinEmoji(ex.concepto),
        monto: roundMoney(Number(ex.monto)),
        observaciones: ex.observaciones,
      });
    }
  }

  unidades.sort((a, b) => {
    const c = a.etiqueta.localeCompare(b.etiqueta, "es");
    return c !== 0 ? c : a.contrato_id.localeCompare(b.contrato_id);
  });
  sumaInmobiliariaItems.sort((a, b) => {
    const c = a.concepto.localeCompare(b.concepto, "es");
    return c !== 0 ? c : a.pago_id.localeCompare(b.pago_id);
  });

  const totalAlquileresCobrados = roundMoney(sumaAlquileres);
  const comisionMonto = roundMoney(totalAlquileresCobrados * (comision_porcentaje / 100));
  const subtotalARendir = roundMoney(unidades.reduce((s, u) => s + u.neto_propietario_recibo, 0));
  const totalARendir = roundMoney(subtotalARendir - comisionMonto);
  const totalSumaInmobConceptos = roundMoney(sumaInmobiliariaItems.reduce((s, r) => s + r.monto, 0));

  return {
    ok: true,
    payload: {
      v: 3,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      unidades,
      suma_inmobiliaria_items: sumaInmobiliariaItems,
      total_suma_inmobiliaria_conceptos: totalSumaInmobConceptos,
      total_alquileres_cobrados: totalAlquileresCobrados,
      comision_monto: comisionMonto,
      subtotal_a_rendir_propietario: subtotalARendir,
      total_a_rendir_propietario: totalARendir,
    },
  };
}
