import type { SupabaseClient } from "@supabase/supabase-js";
import { etiquetaConceptoConEmoji } from "@/lib/cobranzas/conceptos-pago";
import { aDetalleV2 } from "@/lib/cobranzas/detalle-pago";
import { parseDetallePagoDb } from "@/lib/cobranzas/detalle-pago";
import type { InformeRendicionPayloadV2 } from "@/lib/informes/rendicion-types";

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
): InformeRendicionPayloadV2 {
  return {
    v: 2,
    propietario_nombre: propietarioNombre,
    mes_periodo,
    comision_porcentaje,
    alquileres: [],
    otros_conceptos: [],
    deducciones_propietario: [],
    informativos_conceptos: [],
    total_alquileres_cobrados: 0,
    comision_monto: 0,
    neto_alquileres: 0,
    subtotal_otros_conceptos: 0,
    total_neto_a_rendir: 0,
  };
}

export async function computeInformeRendicion(
  supabase: SupabaseClient,
  input: {
    propietario_cliente_id: string;
    mes_periodo: string;
    comision_porcentaje: number;
  },
): Promise<{ ok: true; payload: InformeRendicionPayloadV2 } | { ok: false; error: string }> {
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

  const alquileres: InformeRendicionPayloadV2["alquileres"] = [];
  const otros: InformeRendicionPayloadV2["otros_conceptos"] = [];
  const deducciones: InformeRendicionPayloadV2["deducciones_propietario"] = [];
  const informativos: InformeRendicionPayloadV2["informativos_conceptos"] = [];

  for (const raw of pagosRaw ?? []) {
    const p = raw as PagoRow;
    const montoPagado = p.monto_pagado != null ? Number(p.monto_pagado) : 0;
    const prop = propiedadByContrato.get(p.contrato_id);
    const propId = prop?.id ?? "sin-propiedad";
    const etiqueta = prop ? etiquetaPropiedad(prop) : "—";

    const detalleRaw = parseDetallePagoDb(p.detalle_pago);
    const detalle = aDetalleV2(detalleRaw, montoPagado);
    const montoAlquilerLinea = detalleRaw != null ? detalle.monto_alquiler : montoPagado;

    if (montoAlquilerLinea > 0) {
      alquileres.push({
        pago_id: p.id,
        propiedad_id: propId,
        etiqueta,
        monto: roundMoney(montoAlquilerLinea),
      });
    }

    for (const ex of detalle.extras) {
      if (ex.monto <= 0) continue;
      const row = {
        pago_id: p.id,
        concepto: etiquetaConceptoConEmoji(ex.concepto),
        monto: roundMoney(Number(ex.monto)),
        observaciones: ex.observaciones,
      };
      if (ex.impacto === "propietario_resta") deducciones.push(row);
      else if (ex.impacto === "inmobiliaria") informativos.push(row);
      else otros.push(row);
    }
  }

  alquileres.sort((a, b) => {
    const c = a.etiqueta.localeCompare(b.etiqueta, "es");
    return c !== 0 ? c : a.pago_id.localeCompare(b.pago_id);
  });
  otros.sort((a, b) => {
    const c = a.concepto.localeCompare(b.concepto, "es");
    return c !== 0 ? c : a.pago_id.localeCompare(b.pago_id);
  });
  deducciones.sort((a, b) => {
    const c = a.concepto.localeCompare(b.concepto, "es");
    return c !== 0 ? c : a.pago_id.localeCompare(b.pago_id);
  });
  informativos.sort((a, b) => {
    const c = a.concepto.localeCompare(b.concepto, "es");
    return c !== 0 ? c : a.pago_id.localeCompare(b.pago_id);
  });

  const totalAlquileresCobrados = roundMoney(alquileres.reduce((s, r) => s + r.monto, 0));
  const sumaOtros = otros.reduce((s, r) => s + r.monto, 0);
  const sumaDed = deducciones.reduce((s, r) => s + r.monto, 0);
  const sumaInf = informativos.reduce((s, r) => s + r.monto, 0);
  const subtotalOtrosConceptos = roundMoney(sumaOtros - sumaDed - sumaInf);

  const comisionMonto = roundMoney(totalAlquileresCobrados * (comision_porcentaje / 100));
  const netoAlquileres = roundMoney(totalAlquileresCobrados - comisionMonto);
  const totalNetoARendir = roundMoney(netoAlquileres + subtotalOtrosConceptos);

  return {
    ok: true,
    payload: {
      v: 2,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      alquileres,
      otros_conceptos: otros,
      deducciones_propietario: deducciones,
      informativos_conceptos: informativos,
      total_alquileres_cobrados: totalAlquileresCobrados,
      comision_monto: comisionMonto,
      neto_alquileres: netoAlquileres,
      subtotal_otros_conceptos: subtotalOtrosConceptos,
      total_neto_a_rendir: totalNetoARendir,
    },
  };
}
