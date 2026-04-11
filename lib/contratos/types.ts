export type ContratoLocacionListRow = {
  id: string;
  propiedad_id: string;
  propietario_id: string;
  cliente_id: string;
  fecha_firma: string;
  fecha_inicio_contrato: string;
  fecha_fin_contrato: string;
  valor_mensual: number;
  /** Depósito en garantía; null = en PDF se usa valor_mensual. */
  valor_deposito: number | null;
  tipo_ajuste: string;
  caracteristicas_propiedad: string;
  datos_garantes: string;
  estado: string;
  rescindido_at: string | null;
  pdf_storage_path: string | null;
  contratos_cobranza_id: string | null;
  dia_limite_pago: number | null;
  meses_actualizacion: number | null;
  propiedad_direccion: string | null;
  propietario_nombre: string | null;
  propietario_dni: number | null;
  inquilino_nombre: string | null;
  inquilino_dni: number | null;
};
