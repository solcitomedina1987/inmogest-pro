/**
 * Lista de períodos YYYY-MM desde el mes de `fechaInicio` hasta el mes de `fecha_vencimiento` (inclusive).
 */
export function mesesPeriodoEntreFechasContrato(fechaInicio: string, fechaVencimiento: string): string[] {
  const inicioMes = fechaInicio.slice(0, 7);
  const finMes = fechaVencimiento.slice(0, 7);
  const [iy, im] = inicioMes.split("-").map(Number);
  const [ey, em] = finMes.split("-").map(Number);
  if (!iy || !im || !ey || !em) {
    return [];
  }
  const out: string[] = [];
  let y = iy;
  let m = im;
  const endKey = ey * 12 + em;
  while (y * 12 + m <= endKey) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
