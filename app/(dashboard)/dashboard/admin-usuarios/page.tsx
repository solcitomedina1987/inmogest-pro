import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsuariosClient } from "@/components/admin/admin-usuarios-client";
import type { PerfilListRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Usuarios",
};

function mapRow(r: Record<string, unknown>): PerfilListRow {
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

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (miPerfil?.rol !== "admin") {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, created_at, is_active, deleted_at, cliente_id")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6">
        <p className="font-medium">No se pudo cargar el listado</p>
        <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Ejecutá la migración con rol propietario e is_active en perfiles si aún no está aplicada.
        </p>
      </div>
    );
  }

  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));

  return <AdminUsuariosClient initial={rows} currentUserId={user.id} />;
}
