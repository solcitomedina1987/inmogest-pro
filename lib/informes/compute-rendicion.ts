import type { SupabaseClient } from "@supabase/supabase-js";
import { etiquetaConceptoSinEmoji } from "@/lib/cobranzas/conceptos-pago";
import {
  aDetalleV2,
  conceptoTipoDesdeExtraV2,
  montosImpactoDesdeDetalleV2,
  parseDetallePagoDb,
  totalCobrarInquilinoDesdeDetalleV2,
} from "@/lib/cobranzas/detalle-pago";
import type { DetallePagoV2 } from "@/lib/cobranzas/detalle-pago";
import type {
  InformeRendicionPayloadV4,
  InmobiliariaUnidadV4,
  LineaRendicionUnidad,
  UnidadRendicionV4,
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
  inquilino: { nombre_completo: string | null } | { nombre_completo: string | null }[] | null;
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

function tituloBloqueRendicion(direccionDisplay: string, inquilinoNombre: string): string {
  const d = direccionDisplay.trim() || "—";
  const i = inquilinoNombre.trim() || "—";
  return `Propiedad: ${d} | Inquilino: ${i}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function nombreInquilinoContrato(c: ContratoMini): string {
  const row = unwrapFk(c.inquilino);
  const n = row?.nombre_completo?.trim();
  return n || "—";
}

function emptyPayload(
  propietarioNombre: string,
  mes_periodo: string,
  comision_porcentaje: number,
): InformeRendicionPayloadV4 {
  return {
    v: 4,
    propietario_nombre: propietarioNombre,
    mes_periodo,
    comision_porcentaje,
    unidades: [],
    inmobiliaria_por_unidad: [],
    total_suma_inmobiliaria_conceptos: 0,
    total_alquileres_cobrados: 0,
    total_comisiones_periodo: 0,
    total_deducciones_periodo: 0,
    total_subtotal_bruto_periodo: 0,
    total_a_rendir_propietario: 0,
    total_validacion_neto: 0,
  };
}

/** Líneas de la sección alquileres: alquiler + suma/resta propietario (sin inmobiliaria). */
function lineasAlquileresSoloPropietario(detalle: DetallePagoV2): LineaRendicionUnidad[] {
  const lineas: LineaRendicionUnidad[] = [
    {
      concepto_key: "alquiler",
      impacto_linea: "alquiler",
      concepto: "Alquiler",
      monto: roundMoney(Number(detalle.monto_alquiler) || 0),
      observaciones: null,
    },
  ];
  for (const ex of detalle.extras) {
    const m = Number(ex.monto) || 0;
    if (m <= 0) continue;
    if (ex.impacto === "inmobiliaria") continue;
    const tipo = conceptoTipoDesdeExtraV2(ex);
    const concepto_key = tipo ?? "otros";
    const impacto_linea = ex.impacto === "propietario_resta" ? "propietario_resta" : "propietario_suma";
    lineas.push({
      concepto_key,
      impacto_linea,
      concepto: ex.concepto_label?.trim() || (tipo ? etiquetaConceptoSinEmoji(tipo) : "Concepto"),
      monto: roundMoney(m),
      observaciones: ex.observaciones,
    });
  }
  return lineas;
}

function inmobiliariaUnidadDesdeDetalle(
  pagoId: string,
  contratoId: string,
  propiedadId: string,
  titulo_bloque: string,
  detalle: DetallePagoV2,
): InmobiliariaUnidadV4 | null {
  const items: InmobiliariaUnidadV4["items"] = [];
  for (const ex of detalle.extras) {
    const m = Number(ex.monto) || 0;
    if (m <= 0) continue;
    if (ex.impacto !== "inmobiliaria") continue;
    const tipo = conceptoTipoDesdeExtraV2(ex);
    items.push({
      concepto_key: tipo ?? "otros",
      concepto: ex.concepto_label?.trim() || (tipo ? etiquetaConceptoSinEmoji(tipo) : "Inmobiliaria"),
      monto: roundMoney(m),
      observaciones: ex.observaciones,
    });
  }
  if (items.length === 0) return null;
  const subtotal_unidad = roundMoney(items.reduce((s, it) => s + it.monto, 0));
  return {
    pago_id: pagoId,
    contrato_id: contratoId,
    propiedad_id: propiedadId,
    titulo_bloque,
    items,
    subtotal_unidad,
  };
}

export async function computeInformeRendicion(
  supabase: SupabaseClient,
  input: {
    propietario_cliente_id: string;
    mes_periodo: string;
    comision_porcentaje: number;
  },
): Promise<{ ok: true; payload: InformeRendicionPayloadV4 } | { ok: false; error: string }> {
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
      "id, propiedad_id, propiedad:propiedades!contratos_cobranza_propiedad_id_fkey ( id, direccion, nombre ), " +
        "inquilino:clientes!contratos_cobranza_cliente_id_fkey ( nombre_completo )",
    )
    .in("propiedad_id", propIds)
    .is("deleted_at", null);

  if (cErr) {
    return { ok: false, error: cErr.message };
  }

  const contratos = (contratosRaw ?? []) as unknown as ContratoMini[];
  const contratoIds = contratos.map((c) => c.id);
  if (contratoIds.length === 0) {
    return { ok: true, payload: emptyPayload(propietarioNombre, mes_periodo, comision_porcentaje) };
  }

  const contratoById = new Map<string, ContratoMini>();
  const propiedadByContrato = new Map<string, { id: string; direccion: string | null; nombre: string }>();
  for (const c of contratos) {
    contratoById.set(c.id, c);
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

  const unidades: UnidadRendicionV4[] = [];
  const inmobiliariaPorUnidad: InmobiliariaUnidadV4[] = [];
  let sumaAlquileres = 0;

  for (const raw of pagosRaw ?? []) {
    const p = raw as PagoRow;
    const montoPagado = p.monto_pagado != null ? Number(p.monto_pagado) : 0;
    const c = contratoById.get(p.contrato_id);
    const prop = propiedadByContrato.get(p.contrato_id);
    const propId = prop?.id ?? "sin-propiedad";
    const direccionDisplay = prop ? etiquetaPropiedad(prop) : "—";
    const inquilinoNombre = c ? nombreInquilinoContrato(c) : "—";
    const titulo = tituloBloqueRendicion(direccionDisplay, inquilinoNombre);

    const detalleRaw = parseDetallePagoDb(p.detalle_pago);
    const detalle = aDetalleV2(detalleRaw, montoPagado);
    const montoAlquiler = roundMoney(Number(detalle.monto_alquiler) || 0);
    sumaAlquileres += montoAlquiler;

    const { sumaPropietario, restaPropietario } = montosImpactoDesdeDetalleV2(detalle);
    const subtotalBruto = roundMoney(sumaPropietario);
    const deducciones = roundMoney(restaPropietario);
    const comisionUnidad = roundMoney(montoAlquiler * (comision_porcentaje / 100));
    const subtotalNetoUnidad = roundMoney(subtotalBruto - comisionUnidad - deducciones);

    unidades.push({
      contrato_id: p.contrato_id,
      propiedad_id: propId,
      pago_id: p.id,
      direccion_display: direccionDisplay,
      inquilino_nombre: inquilinoNombre,
      titulo_bloque: titulo,
      lineas: lineasAlquileresSoloPropietario(detalle),
      subtotal_cobrado_inquilino: totalCobrarInquilinoDesdeDetalleV2(detalle),
      subtotal_bruto: subtotalBruto,
      monto_alquiler: montoAlquiler,
      comision_inmobiliaria_unidad: comisionUnidad,
      deducciones,
      subtotal_neto_unidad: subtotalNetoUnidad,
    });

    const bloqueIm = inmobiliariaUnidadDesdeDetalle(p.id, p.contrato_id, propId, titulo, detalle);
    if (bloqueIm) inmobiliariaPorUnidad.push(bloqueIm);
  }

  const sortKey = (a: { titulo_bloque: string; contrato_id: string; pago_id: string }) =>
    `${a.titulo_bloque}\0${a.contrato_id}\0${a.pago_id}`;
  unidades.sort((a, b) => sortKey(a).localeCompare(sortKey(b), "es"));
  inmobiliariaPorUnidad.sort((a, b) => sortKey(a).localeCompare(sortKey(b), "es"));

  const totalAlquileresCobrados = roundMoney(sumaAlquileres);
  const totalComisionesPeriodo = roundMoney(unidades.reduce((s, u) => s + u.comision_inmobiliaria_unidad, 0));
  const totalDeduccionesPeriodo = roundMoney(unidades.reduce((s, u) => s + u.deducciones, 0));
  const totalSubtotalBrutoPeriodo = roundMoney(unidades.reduce((s, u) => s + u.subtotal_bruto, 0));
  const totalARendir = roundMoney(unidades.reduce((s, u) => s + u.subtotal_neto_unidad, 0));
  const totalSumaInmobConceptos = roundMoney(inmobiliariaPorUnidad.reduce((s, b) => s + b.subtotal_unidad, 0));
  const totalValidacionNeto = roundMoney(totalSubtotalBrutoPeriodo - totalComisionesPeriodo - totalDeduccionesPeriodo);

  return {
    ok: true,
    payload: {
      v: 4,
      propietario_nombre: propietarioNombre,
      mes_periodo,
      comision_porcentaje,
      unidades,
      inmobiliaria_por_unidad: inmobiliariaPorUnidad,
      total_suma_inmobiliaria_conceptos: totalSumaInmobConceptos,
      total_alquileres_cobrados: totalAlquileresCobrados,
      total_comisiones_periodo: totalComisionesPeriodo,
      total_deducciones_periodo: totalDeduccionesPeriodo,
      total_subtotal_bruto_periodo: totalSubtotalBrutoPeriodo,
      total_a_rendir_propietario: totalARendir,
      total_validacion_neto: totalValidacionNeto,
    },
  };
}
