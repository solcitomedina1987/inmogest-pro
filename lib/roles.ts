/** Roles con acceso operativo al panel (excluye `cliente`). */
export const STAFF_ROLES = ["admin", "agente", "operador"] as const;
export type StaffRol = (typeof STAFF_ROLES)[number];

export function isStaffRol(rol: string | undefined | null): rol is StaffRol {
  return rol === "admin" || rol === "agente" || rol === "operador";
}

/** Valores válidos en `public.perfiles.rol` para edición desde administración. */
export const PERFIL_ROLES_EDITABLES = ["admin", "operador", "agente", "cliente"] as const;
export type PerfilRolEditable = (typeof PERFIL_ROLES_EDITABLES)[number];
