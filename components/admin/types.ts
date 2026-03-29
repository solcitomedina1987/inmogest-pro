import type { PerfilRolEditable } from "@/lib/roles";

export type PerfilListRow = {
  id: string;
  nombre: string;
  email: string;
  rol: PerfilRolEditable | string;
  created_at: string;
};
