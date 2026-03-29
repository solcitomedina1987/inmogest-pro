import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsuariosClient } from "@/components/admin/admin-usuarios-client";
import type { PerfilListRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Usuarios",
};

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
    .select("id, nombre, email, rol, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6">
        <p className="font-medium">No se pudo cargar el listado</p>
        <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as PerfilListRow[];

  return <AdminUsuariosClient initial={rows} currentUserId={user.id} />;
}
