import type { DetallePagoParsed } from "@/lib/cobranzas/detalle-pago";

export type EstadoPagoCobranza = "Pendiente" | "Pagado" | "Atrasado";

export type IndiceActualizacion = "IPC" | "ICL";

export type ContratoCobranzaRow = {
  id: string;
  propiedad_id: string;
  cliente_id: string;
  locador_id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_mensual: number;
  dia_limite_pago: number;
  meses_actualizacion: number;
  indice_actualizacion: IndiceActualizacion;
  ultima_actualizacion: string | null;
  is_active: boolean;
  /** Baja lógica: si no es null, el contrato está eliminado. */
  deleted_at: string | null;
  propiedad?: {
    nombre: string;
    direccion?: string | null;
    nis_electricidad?: string | null;
    cliente_gas?: string | null;
    padron_municipal?: string | null;
    cliente_internet?: string | null;
  } | null;
  inquilino?: {
    nombre_completo: string;
    dni?: number | string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
  locador?: { nombre_completo: string } | null;
  /** Contrato de locación legal (`contratos`) vinculado a esta cobranza, si existe. */
  contrato_legal?: {
    id: string;
    pdf_storage_path: string | null;
    adjunto_storage_path: string | null;
    adjunto_mime: string | null;
  } | null;
};

export type PagoRow = {
  id: string;
  contrato_id: string;
  propiedad_id?: string | null;
  mes_periodo: string;
  monto_esperado: number;
  monto_pagado: number | null;
  fecha_pago_realizado: string | null;
  estado: EstadoPagoCobranza;
  forma_pago?: string | null;
  observaciones?: string | null;
  /** Desglose multiconcepto (JSONB). */
  detalle_pago?: DetallePagoParsed | null;
  created_at?: string;
};
