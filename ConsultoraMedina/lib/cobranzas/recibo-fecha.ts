const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Texto literal para YYYY-MM, ej. "marzo de 2025". */
export function mesPeriodoALiteral(mesPeriodo: string): string {
  const [ys, ms] = mesPeriodo.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) {
    return mesPeriodo;
  }
  return `${MESES[m - 1]} de ${y}`;
}

/** Día, mes y año en español para una fecha local. */
export function fechaEmisionReciboLiteral(fecha: Date): { dia: number; mes: string; anio: number } {
  return {
    dia: fecha.getDate(),
    mes: MESES[fecha.getMonth()],
    anio: fecha.getFullYear(),
  };
}

export function formatoMontoReciboPesos(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}
