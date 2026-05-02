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
 * Formato multipropiedad: desglose por unidad, inmobiliaria informativa, liquidación final en cuatro renglones.
 */
export type InformeRendicionPayloadV3 = {
  v: 3;
  propietario_nombre: string;
  mes_periodo: string;
  comision_porcentaje: number;
  unidades: UnidadRendicionV3[];
  suma_inmobiliaria_items: {
    pago_id: string;
    concepto: string;
    monto: number;
    observaciones: string | null;
  }[];
  /** Suma de montos listados en `suma_inmobiliaria_items` (solo referencia en esa sección). */
  total_suma_inmobiliaria_conceptos: number;
  /** Base de comisión: suma de montos de alquiler imputados en los recibos del período. */
  total_alquileres_cobrados: number;
  comision_monto: number;
  /** Suma del neto por unidad/recibo (impactos por línea ya aplicados), antes de la comisión global. */
  subtotal_a_rendir_propietario: number;
  total_a_rendir_propietario: number;
  /** Conceptos inmobiliaria del período + comisión inmobiliaria. */
  total_inmobiliaria: number;
};

export type InformeRendicionPayload = InformeRendicionPayloadV1 | InformeRendicionPayloadV2 | InformeRendicionPayloadV3;

export type InformeRendicionListRow = {
  id: string;
  propietario_cliente_id: string;
  propietario_nombre: string | null;
  mes_periodo: string;
  comision_porcentaje: number;
  monto_total: number;
  neto_rendir: number;
  fecha_generacion: string;
};
