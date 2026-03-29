/** Etiquetas para `public.perfiles.rol` */
export function roleLabel(rol: string): string {
  const map: Record<string, string> = {
    admin: "Administrador",
    agente: "Agente",
    cliente: "Cliente",
  };
  return map[rol] ?? rol;
}
