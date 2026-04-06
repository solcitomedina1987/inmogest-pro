export type TipoIndice = "ICL" | "IPC";

export type IndiceRow = {
  tipo: TipoIndice;
  fecha: string;   // YYYY-MM-DD
  valor: number;
  fuente: string;
  es_estimado: boolean;
};

export type ResultadoCalculo = {
  ok: true;
  monto_actual: number;
  monto_sugerido: number;
  coeficiente: number;
  indice_tipo: TipoIndice;
  indice_inicial: number;
  indice_final: number;
  fecha_ref: string;
  fecha_actualizacion: string;
  es_estimado: boolean;
  detalle: string; // Descripción humana del cálculo
} | {
  ok: false;
  error: string;
  es_estimado?: boolean;
};
