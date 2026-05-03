import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import { ConceptosPagoAdminClient } from "@/components/admin/conceptos-pago-admin-client";

export const metadata: Metadata = {
  title: "Conceptos de pago",
};

export default async function AdminConceptosPagoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("conceptos_pago")
    .select("id, nombre, impacto, icono, slug, deleted_at")
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
        <p className="font-medium">No se pudo cargar el catálogo</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as ConceptoPagoCatalogoRow[];
  return <ConceptosPagoAdminClient initialRows={rows} />;
}
