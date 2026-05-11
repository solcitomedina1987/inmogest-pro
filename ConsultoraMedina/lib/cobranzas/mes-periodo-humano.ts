/** YYYY-MM → "abril de 2026" (es-AR, primera letra mayúscula). */
export function formatMesPeriodoHumano(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const raw = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
