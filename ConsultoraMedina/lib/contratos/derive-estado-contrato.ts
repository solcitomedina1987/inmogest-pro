import { isAfter, parseISO, startOfDay } from "date-fns";

export type ContratoLocacionEstado = "VIGENTE" | "VENCIDO" | "RESCINDIDO";

export type ContratoLocacionEstadoRow = {
  fecha_fin_contrato: string;
  rescindido_at: string | null;
  /** Valor persistido; si es RESCINDIDO tiene prioridad sobre fechas. */
  estado?: string | null;
};

/**
 * VIGENTE / VENCIDO según fecha de fin; RESCINDIDO si hay rescisión manual
 * o si el registro ya está marcado como RESCINDIDO.
 */
export function deriveContratoLocacionEstado(row: ContratoLocacionEstadoRow): ContratoLocacionEstado {
  if (row.rescindido_at || row.estado === "RESCINDIDO") {
    return "RESCINDIDO";
  }
  const fin = startOfDay(parseISO(row.fecha_fin_contrato));
  const hoy = startOfDay(new Date());
  if (isAfter(hoy, fin)) {
    return "VENCIDO";
  }
  return "VIGENTE";
}
