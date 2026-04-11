import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export type ContratoLocacionPdfData = {
  fechaContratoFmt: string;
  inquilinoLine: string;
  propietarioLine: string;
  propiedadDireccion: string;
  caracteristicas: string;
  datosGarantes: string;
  fechaInicioFmt: string;
  fechaFinFmt: string;
  valorMensualFmt: string;
  tipoAjuste: string;
};

export function formatFechaContrato(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return isoDate;
  }
}

export function buildContratoLocacionPdfData(input: {
  fecha_firma: string;
  fecha_inicio_contrato: string;
  fecha_fin_contrato: string;
  valor_mensual: number;
  tipo_ajuste: string;
  caracteristicas_propiedad: string;
  datos_garantes: string;
  inquilino_nombre: string;
  inquilino_dni: number | string;
  propietario_nombre: string;
  propietario_dni: number | string;
  propiedad_direccion: string;
}): ContratoLocacionPdfData {
  return {
    fechaContratoFmt: formatFechaContrato(input.fecha_firma),
    inquilinoLine: `${input.inquilino_nombre}, DNI: ${input.inquilino_dni}`,
    propietarioLine: `${input.propietario_nombre}, DNI: ${input.propietario_dni}`,
    propiedadDireccion: input.propiedad_direccion.trim() || "—",
    caracteristicas: input.caracteristicas_propiedad.trim() || "—",
    datosGarantes: input.datos_garantes.trim() || "—",
    fechaInicioFmt: formatFechaContrato(input.fecha_inicio_contrato),
    fechaFinFmt: formatFechaContrato(input.fecha_fin_contrato),
    valorMensualFmt: precioFmt.format(Number(input.valor_mensual)),
    tipoAjuste: input.tipo_ajuste.trim() || "—",
  };
}
