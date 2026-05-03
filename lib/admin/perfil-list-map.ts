import type { PerfilListRow } from "@/components/admin/types";

export function mapPerfilListRow(r: Record<string, unknown>): PerfilListRow {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    email: r.email as string,
    rol: r.rol as string,
    created_at: r.created_at as string,
    is_active: r.is_active !== false,
    deleted_at: (r.deleted_at as string | null) ?? null,
    cliente_id: (r.cliente_id as string | null) ?? null,
  };
}
