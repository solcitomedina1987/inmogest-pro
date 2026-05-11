/**
 * Tipos y constantes compartidos entre servidor y cliente.
 * Este archivo NO importa googleapis ni módulos de Node.js.
 */

export type TipoEvento =
  | "vencimiento_real"
  | "alerta_vencimiento"
  | "actualizacion"
  | "alerta_actualizacion"
  | "visita_inquilino"
  | "visita_propietario"
  | "muestra_propiedad"
  | "tramite";

export const TIPOS_EVENTO_PERSONALIZADO = [
  "visita_inquilino",
  "visita_propietario",
  "muestra_propiedad",
  "tramite",
] as const;
export type TipoEventoPersonalizado = (typeof TIPOS_EVENTO_PERSONALIZADO)[number];

export function esEventoPersonalizado(tipo: TipoEvento): tipo is TipoEventoPersonalizado {
  return (TIPOS_EVENTO_PERSONALIZADO as readonly string[]).includes(tipo);
}

export const LABEL_TIPO_EVENTO: Record<TipoEventoPersonalizado, string> = {
  visita_inquilino: "Visita a Inquilino",
  visita_propietario: "Visita a Propietario",
  muestra_propiedad: "Muestra de Propiedad",
  tramite: "Trámite",
};

export type EventoCalendario = {
  id: string;
  titulo: string;
  fecha: string;
  hora?: string;
  tipo: TipoEvento;
  direccion: string;
  inquilino: string;
  telefono: string | null;
  contratoId: string;
  htmlLink: string;
  fechaVencimiento?: string;
  montoMensual?: number;
  indice?: string;
  notas?: string;
  nombreInteresado?: string;
  telefonoInteresado?: string;
};
