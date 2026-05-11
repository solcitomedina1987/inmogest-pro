import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";

/** YYYY-MM del mes actual */
export function mesActualYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Suma N meses a una fecha YYYY-MM[-DD] y devuelve YYYY-MM del resultado.
 * Funciona tanto con "2026-01-15" como con "2026-01".
 */
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m] = fechaISO.split("-").map(Number);
  const d = new Date(y, m - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Mes siguiente al proporcionado (YYYY-MM → YYYY-MM). */
export function mesSiguiente(mes: string): string {
  return sumarMeses(mes, 1);
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

// ── Lógica de actualización de precio ────────────────────────────────────────

/**
 * Calcula el mes de la próxima actualización de precio (YYYY-MM).
 * Base = ultima_actualizacion si existe, si no = fecha_inicio.
 */
export function mesProximaActualizacion(
  fechaInicio: string,
  mesesActualizacion: number,
  ultimaActualizacion: string | null,
): string | null {
  const base = ultimaActualizacion ?? fechaInicio;
  if (!base) return null;
  return sumarMeses(base, mesesActualizacion);
}

/**
 * @deprecated Usar contratosConActualizacionEnMes.
 * Calcula el mes de ALERTA (1 mes antes de la actualización).
 */
export function mesAlertaProximaActualizacion(
  fechaInicio: string,
  mesesActualizacion: number,
  ultimaActualizacion: string | null,
): string | null {
  const proximo = mesProximaActualizacion(fechaInicio, mesesActualizacion, ultimaActualizacion);
  if (!proximo) return null;
  // 1 mes antes del mes de actualización
  return sumarMeses(proximo, -1);
}

/**
 * [FLUJO A - DÍA 1]
 * Filtra contratos activos cuya actualización de precio cae en `mes`.
 * El cron del día 1 usa esta función con mesActualYYYYMM().
 */
export function contratosConActualizacionEnMes(
  contratos: ContratoCobranzaRow[],
  mes: string = mesActualYYYYMM(),
): ContratoCobranzaRow[] {
  return contratos.filter((c) => {
    if (!c.is_active) return false;
    const proximo = mesProximaActualizacion(
      c.fecha_inicio,
      c.meses_actualizacion,
      c.ultima_actualizacion,
    );
    return proximo === mes;
  });
}

/**
 * Mantiene compatibilidad con el banner del dashboard.
 * Filtra contratos cuya alerta (mes previo a la actualización) coincide con `mes`.
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

// ── Lógica de vencimiento de contrato ────────────────────────────────────────

/**
 * [FLUJO B - DÍA 2]
 * Filtra contratos activos cuya fecha_vencimiento cae exactamente en el mes
 * que está a `mesesAntes` meses del mes `mesBase`.
 *
 * Ejemplo: mesBase = "2026-04", mesesAntes = 2 → busca contratos con
 * fecha_vencimiento en "2026-06" (junio).
 */
export function contratosConVencimientoEn(
  contratos: ContratoCobranzaRow[],
  mesesAntes: number,
  mesBase: string = mesActualYYYYMM(),
): ContratoCobranzaRow[] {
  const mesObjetivo = sumarMeses(mesBase, mesesAntes); // YYYY-MM
  return contratos.filter((c) => {
    if (!c.is_active) return false;
    // fecha_vencimiento es YYYY-MM-DD; comparamos el prefijo YYYY-MM
    return c.fecha_vencimiento.startsWith(mesObjetivo);
  });
}
