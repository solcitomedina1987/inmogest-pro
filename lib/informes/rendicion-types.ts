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
 * Snapshot actual: Bloque A solo Alquiler (base de comisión), Bloque B informativo,
 * neto final = (alquileres − comisión) + otros conceptos.
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
  total_alquileres_cobrados: number;
  comision_monto: number;
  neto_alquileres: number;
  subtotal_otros_conceptos: number;
  total_neto_a_rendir: number;
};

export type InformeRendicionPayload = InformeRendicionPayloadV1 | InformeRendicionPayloadV2;

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
