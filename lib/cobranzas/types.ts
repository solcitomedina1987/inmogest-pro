export type EstadoPagoCobranza = "Pendiente" | "Pagado" | "Atrasado";

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
  ultima_actualizacion: string | null;
  is_active: boolean;
  propiedad?: { nombre: string } | null;
  inquilino?: { nombre: string } | null;
  locador?: { nombre: string } | null;
};

export type PagoRow = {
  id: string;
  contrato_id: string;
  mes_periodo: string;
  monto_esperado: number;
  monto_pagado: number | null;
  fecha_pago_realizado: string | null;
  estado: EstadoPagoCobranza;
  forma_pago?: string | null;
  observaciones?: string | null;
  created_at?: string;
};
