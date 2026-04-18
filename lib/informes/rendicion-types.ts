/** Snapshot inmutable guardado en `informes_rendicion.payload`. */
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
