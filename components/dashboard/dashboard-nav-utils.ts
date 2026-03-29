/** Misma sección del menú lateral (incluye subrutas, excepto Inicio = solo `/dashboard`). */
export function isDashboardSameSection(pathname: string, href: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/dashboard") {
    return p === "/dashboard";
  }
  return p === h || p.startsWith(`${h}/`);
}
