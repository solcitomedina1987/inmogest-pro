import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createEstadoPropiedad,
  restoreEstadoPropiedad,
  softDeleteEstadoPropiedad,
  updateEstadoPropiedad,
} from "@/app/actions/config-catalogos";
import { NombreCatalogoAdminClient } from "@/components/admin/nombre-catalogo-admin-client";

export const metadata: Metadata = {
  title: "Estados de propiedad",
};

export default async function AdminEstadosPropiedadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("estados_propiedad")
    .select("id, nombre, deleted_at")
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
        <p className="font-medium">No se pudo cargar el catálogo</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <NombreCatalogoAdminClient
      title="Estados de propiedad"
      description="Valores disponibles para el estado comercial de cada propiedad."
      initialRows={(data ?? []) as { id: number; nombre: string; deleted_at: string | null }[]}
      onCreate={(nombre) => createEstadoPropiedad(nombre)}
      onUpdate={(id, nombre) => updateEstadoPropiedad(id, nombre)}
      onSoftDelete={(id) => softDeleteEstadoPropiedad(id)}
      onRestore={(id) => restoreEstadoPropiedad(id)}
    />
  );
}
