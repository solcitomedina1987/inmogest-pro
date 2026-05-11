import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  rellenarPlantillaContratoLocacion,
  type VariablesContratoLocacion,
} from "@/lib/contratos/contrato-locacion-plantilla";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export type ContratoLocacionPdfData = {
  /** Texto completo del contrato con variables sustituidas (PDF e impresión HTML). */
  bodyText: string;
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
  valor_deposito?: number | null;
  tipo_ajuste: string;
  caracteristicas_propiedad: string;
  datos_garantes: string;
  inquilino_nombre: string;
  inquilino_dni: number | string;
  propietario_nombre: string;
  propietario_dni: number | string;
  propiedad_direccion: string;
}): ContratoLocacionPdfData {
  const depNum = input.valor_deposito != null ? Number(input.valor_deposito) : NaN;
  const deposito =
    input.valor_deposito != null && !Number.isNaN(depNum) && depNum > 0 ? depNum : Number(input.valor_mensual);

  const vars: VariablesContratoLocacion = {
    fecha_contrato: formatFechaContrato(input.fecha_firma),
    propietario: `${input.propietario_nombre.trim()}, DNI: ${input.propietario_dni}`,
    inquilino: `${input.inquilino_nombre.trim()}, DNI: ${input.inquilino_dni}`,
    propiedad: input.propiedad_direccion.trim() || "—",
    caracteristicas_propiedad: input.caracteristicas_propiedad.trim() || "—",
    fecha_inicio_contrato: formatFechaContrato(input.fecha_inicio_contrato),
    fecha_fin_contrato: formatFechaContrato(input.fecha_fin_contrato),
    valor_mensual: precioFmt.format(Number(input.valor_mensual)),
    tipo_ajuste: input.tipo_ajuste.trim() || "—",
    datos_garantes: input.datos_garantes.trim() || "—",
    valor_contrato: precioFmt.format(deposito),
  };

  return {
    bodyText: rellenarPlantillaContratoLocacion(vars),
  };
}
