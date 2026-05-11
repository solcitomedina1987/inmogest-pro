/** Etiquetas para `public.perfiles.rol` */
export function roleLabel(rol: string): string {
  const map: Record<string, string> = {
    admin: "Administrador",
    cliente: "Cliente",
    propietario: "Propietario",
  };
  return map[rol] ?? rol;
}
