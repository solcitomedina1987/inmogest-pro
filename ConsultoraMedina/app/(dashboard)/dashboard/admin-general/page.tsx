import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import { AdminGeneralClient } from "@/components/admin/admin-general-client";
import type { NombreCatalogoRow } from "@/components/admin/nombre-catalogo-admin-client";
import { mapPerfilListRow } from "@/lib/admin/perfil-list-map";

export const metadata: Metadata = {
  title: "ADMIN General",
};

const ALLOWED_TABS = new Set(["conceptos", "tipos", "estados", "usuarios"]);

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminGeneralPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") redirect("/dashboard");

  const { tab } = await searchParams;
  const defaultTab = tab && ALLOWED_TABS.has(tab) ? tab : "conceptos";

  const [conceptosRes, tiposRes, estadosRes, perfilesRes] = await Promise.all([
    supabase.from("conceptos_pago").select("id, nombre, impacto, icono, slug, deleted_at").order("nombre", { ascending: true }),
    supabase.from("tipos_propiedad").select("id, nombre, deleted_at").order("nombre", { ascending: true }),
    supabase.from("estados_propiedad").select("id, nombre, deleted_at").order("nombre", { ascending: true }),
    supabase.from("perfiles").select("id, nombre, email, rol, created_at, is_active, deleted_at, cliente_id").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminGeneralClient
      defaultTab={defaultTab}
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
      usuarios={{
        rows: (perfilesRes.data ?? []).map((r) => mapPerfilListRow(r as Record<string, unknown>)),
        error: perfilesRes.error?.message ?? null,
      }}
      currentUserId={user.id}
    />
  );
}
