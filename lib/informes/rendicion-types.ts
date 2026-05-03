import type { ConceptoPagoTipo } from "@/lib/cobranzas/conceptos-pago";

/** Clave de concepto para iconografía en informes (alquiler base + catálogo de extras). */
export type ConceptoRendicionKey = "alquiler" | ConceptoPagoTipo;

/** Snapshot histórico (lógica anterior: comisión descontada del subtotal global). */
export type InformeRendicionPayloadV1 = {
  v: 1;
  propietario_nombre: string;
  mes_periodo: string;
  comision_porcentaje: number;
  alquileres: { propiedad_id: string; etiqueta: string; monto: number }[];
  otros_conceptos: {
    pago_id: string;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  subtotal_ingresos: number;
  total_alquileres: number;
  comision_monto: number;
  neto_a_rendir: number;
};

/**
 * Snapshot actual: alquileres (base de comisión); `otros_conceptos` = suma al propietario (extras);
 * `deducciones_propietario` = resta al propietario; `informativos_conceptos` = suma a inmobiliaria (retenciones).
 * `subtotal_otros_conceptos` = favor − deducciones − inmobiliaria.
 * Neto final = (alquileres − comisión) + subtotal_otros_conceptos.
 */
export type InformeRendicionPayloadV2 = {
  v: 2;
  propietario_nombre: string;
  mes_periodo: string;
  comision_porcentaje: number;
  /** Una fila por recibo: ítem Alquiler (monto_alquiler o total si no hay detalle). */
  alquileres: {
    pago_id: string;
    propiedad_id: string;
    etiqueta: string;
    monto: number;
  }[];
  otros_conceptos: {
    pago_id: string;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  /** Gastos que restan en la liquidación al propietario (impacto resta). */
  deducciones_propietario: {
    pago_id: string;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  /** Retenciones / honorarios a favor de la inmobiliaria (restan del neto a rendir al dueño). */
  informativos_conceptos: {
    pago_id: string;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  total_alquileres_cobrados: number;
  comision_monto: number;
  neto_alquileres: number;
  subtotal_otros_conceptos: number;
  total_neto_a_rendir: number;
};

/** Línea de desglose dentro de una unidad (contrato / recibo del período). */
export type LineaRendicionUnidad = {
  /** Para iconos; informes viejos pueden no tenerlo (se infiere del texto). */
  concepto_key?: ConceptoRendicionKey | null;
  concepto: string;
  monto: number;
  observaciones: string | null;
};

/** Agrupación por contrato con totales cobrados al inquilino y neto al propietario por recibo. */
export type UnidadRendicionV3 = {
  contrato_id: string;
  propiedad_id: string;
  etiqueta: string;
  pago_id: string;
  lineas: LineaRendicionUnidad[];
  subtotal_cobrado_inquilino: number;
  neto_propietario_recibo: number;
};

/**
 * Formato multipropiedad: desglose por unidad, inmobiliaria informativa, liquidación final (resumen al propietario).
 */
export type InformeRendicionPayloadV3 = {
  v: 3;
  propietario_nombre: string;
  mes_periodo: string;
  comision_porcentaje: number;
  unidades: UnidadRendicionV3[];
  suma_inmobiliaria_items: {
    pago_id: string;
    concepto_key?: ConceptoPagoTipo | null;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  /** Suma de montos listados en `suma_inmobiliaria_items` (solo referencia en esa sección). */
  total_suma_inmobiliaria_conceptos: number;
  /** Base de comisión: suma de montos de alquiler imputados en los recibos del período. */
  total_alquileres_cobrados: number;
  comision_monto: number;
  /** Suma del neto por unidad/recibo (alquiler + suma al propietario − restas − inmobiliaria por línea), antes de la comisión global. */
  subtotal_a_rendir_propietario: number;
  total_a_rendir_propietario: number;
  /** @deprecated Informes antiguos; ya no se calcula ni se muestra en el pie. */
  total_inmobiliaria?: number;
};

/** Unidad = un recibo pagado del período; comisión solo sobre alquiler de esa unidad. */
export type UnidadRendicionV4 = {
  contrato_id: string;
  propiedad_id: string;
  pago_id: string;
  /** Dirección o nombre de la propiedad (sin prefijo). */
  direccion_display: string;
  inquilino_nombre: string;
  /** Propiedad: [dirección] | Inquilino: [nombre] */
  titulo_bloque: string;
  /** Alquiler + suma al propietario + resta al propietario (sin rubros inmobiliaria). */
  lineas: LineaRendicionUnidad[];
  subtotal_cobrado_inquilino: number;
  /** Alquiler + conceptos con impacto “Suma al Propietario”. */
  subtotal_bruto: number;
  monto_alquiler: number;
  /** comision_% × solo alquiler de esta unidad. */
  comision_inmobiliaria_unidad: number;
  /** Suma de montos con impacto “Resta al Propietario”. */
  deducciones: number;
  subtotal_neto_unidad: number;
};

export type InmobiliariaUnidadV4 = {
  pago_id: string;
  contrato_id: string;
  propiedad_id: string;
  titulo_bloque: string;
  items: {
    concepto_key?: ConceptoPagoTipo | null;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  subtotal_unidad: number;
};

/**
 * Liquidación por propiedad/unidad: comisión descontada solo del alquiler de cada recibo;
 * inmobiliaria agrupada por unidad con subtotales.
 */
export type InformeRendicionPayloadV4 = {
  v: 4;
  propietario_nombre: string;
  mes_periodo: string;
  comision_porcentaje: number;
  unidades: UnidadRendicionV4[];
  inmobiliaria_por_unidad: InmobiliariaUnidadV4[];
  total_suma_inmobiliaria_conceptos: number;
  total_alquileres_cobrados: number;
  total_comisiones_periodo: number;
  total_deducciones_periodo: number;
  total_subtotal_bruto_periodo: number;
  total_a_rendir_propietario: number;
  /** Debe coincidir con `total_a_rendir_propietario` (bruto − comisiones − deducciones). */
  total_validacion_neto: number;
};

export type InformeRendicionPayload =
  | InformeRendicionPayloadV1
  | InformeRendicionPayloadV2
  | InformeRendicionPayloadV3
  | InformeRendicionPayloadV4;

export type InformeRendicionListRow = {
  id: string;
  propietario_cliente_id: string;
  propietario_nombre: string | null;
  mes_periodo: string;
  comision_porcentaje: number;
  monto_total: number;
  neto_rendir: number;
  fecha_generacion: string;
  /** Baja lógica (papelera). Null = activo. */
  deleted_at: string | null;
};
