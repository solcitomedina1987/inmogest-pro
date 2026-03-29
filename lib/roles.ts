/** Valores de `public.perfiles.rol` tras simplificación a dos roles. */
export const PERFIL_ROLES = ["admin", "cliente"] as const;
export type PerfilRol = (typeof PERFIL_ROLES)[number];

/** Alias para formularios de administración de usuarios (mismo conjunto). */
export const PERFIL_ROLES_EDITABLES = PERFIL_ROLES;

export function isAdminRol(rol: string | undefined | null): boolean {
  return rol === "admin";
}

export function isClienteRol(rol: string | undefined | null): boolean {
  return rol === "cliente";
}
