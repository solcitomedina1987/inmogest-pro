import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import { AdminGeneralClient } from "@/components/admin/admin-general-client";
import type { NombreCatalogoRow } from "@/components/admin/nombre-catalogo-admin-client";

export const metadata: Metadata = {
  title: "ADMIN General",
};

export default async function AdminGeneralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") redirect("/dashboard");

  const [conceptosRes, tiposRes, estadosRes] = await Promise.all([
    supabase.from("conceptos_pago").select("id, nombre, impacto, icono, slug, deleted_at").order("nombre", { ascending: true }),
    supabase.from("tipos_propiedad").select("id, nombre, deleted_at").order("nombre", { ascending: true }),
    supabase.from("estados_propiedad").select("id, nombre, deleted_at").order("nombre", { ascending: true }),
  ]);

  return (
    <AdminGeneralClient
      conceptos={{
        rows: (conceptosRes.data ?? []) as ConceptoPagoCatalogoRow[],
        error: conceptosRes.error?.message ?? null,
      }}
      tipos={{
        rows: (tiposRes.data ?? []) as NombreCatalogoRow[],
        error: tiposRes.error?.message ?? null,
      }}
      estados={{
        rows: (estadosRes.data ?? []) as NombreCatalogoRow[],
        error: estadosRes.error?.message ?? null,
      }}
    />
  );
}
