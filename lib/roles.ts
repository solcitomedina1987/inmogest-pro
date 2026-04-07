/** Valores de `public.perfiles.rol`. */
export const PERFIL_ROLES = ["admin", "cliente", "propietario"] as const;
export type PerfilRol = (typeof PERFIL_ROLES)[number];

/** Roles que puede asignar o editar el administrador en Usuarios. */
export const PERFIL_ROLES_EDITABLES = PERFIL_ROLES;

export function isAdminRol(rol: string | undefined | null): boolean {
  return rol === "admin";
}

export function isClienteRol(rol: string | undefined | null): boolean {
  return rol === "cliente";
}

export function isPropietarioRol(rol: string | undefined | null): boolean {
  return rol === "propietario";
}
