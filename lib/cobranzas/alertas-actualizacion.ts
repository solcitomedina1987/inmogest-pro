import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";

/** YYYY-MM del mes actual */
export function mesActualYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Suma N meses a una fecha YYYY-MM-DD y devuelve YYYY-MM del resultado.
 */
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m] = fechaISO.split("-").map(Number);
  const d = new Date(y, m - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calcula el mes en que debe enviarse la alerta (mes previo a la actualización).
 *
 * Ejemplo: contrato inicio 2026-01-01, actualización cada 6 meses.
 * - Próxima actualización: 2026-07-01 → mes alerta: 2026-06
 * - Siguiente: 2027-01-01 → mes alerta: 2026-12
 */
export function mesAlertaProximaActualizacion(
  fechaInicio: string,
  mesesActualizacion: number,
  ultimaActualizacion: string | null,
): string | null {
  const base = ultimaActualizacion ?? fechaInicio;
  if (!base) return null;
  const proximaActualizacionMes = sumarMeses(base, mesesActualizacion);
  // Alerta = 1 mes antes de la actualización
  const [y, m] = proximaActualizacionMes.split("-").map(Number);
  const alertaDate = new Date(y, m - 2, 1); // m-2 porque getMonth() es 0-based y queremos -1 mes
  return `${alertaDate.getFullYear()}-${String(alertaDate.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Filtra contratos activos cuya alerta de actualización corresponde al mes indicado.
 * Útil tanto para el banner del dashboard como para el cron job.
 */
export function contratosConAlertaEnMes(
  contratos: ContratoCobranzaRow[],
  mes: string = mesActualYYYYMM(),
): ContratoCobranzaRow[] {
  return contratos.filter((c) => {
    if (!c.is_active) return false;
    const mesAlerta = mesAlertaProximaActualizacion(
      c.fecha_inicio,
      c.meses_actualizacion,
      c.ultima_actualizacion,
    );
    return mesAlerta === mes;
  });
}

/** Texto del mes en español para los emails/mensajes. */
export function formatMesHumano(mesYYYYMM: string): string {
  const [y, m] = mesYYYYMM.split("-");
  const nombres = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${nombres[Number(m) - 1]} de ${y}`;
}

/** Mes siguiente al proporcionado (YYYY-MM → YYYY-MM). */
export function mesSiguiente(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 1); // m sin -1 = next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
