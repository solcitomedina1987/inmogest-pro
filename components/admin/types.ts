import type { PerfilRol } from "@/lib/roles";

export type PerfilListRow = {
  id: string;
  nombre: string;
  email: string;
  rol: PerfilRol | string;
  created_at: string;
};
