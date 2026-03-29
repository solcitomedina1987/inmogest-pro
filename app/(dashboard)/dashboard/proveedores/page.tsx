import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorsClient } from "@/components/vendors/vendors-client";
import { PROFESIONES_VENDOR, type ProfesionVendor } from "@/lib/constants/vendors";
import type { VendorRow } from "@/components/vendors/types";

function isProfesionVendor(v: string): v is ProfesionVendor {
  return (PROFESIONES_VENDOR as readonly string[]).includes(v);
}

export default async function DashboardProveedoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  const miRol = miPerfil?.rol as string | undefined;
  if (miRol !== "admin" && miRol !== "agente") {
    redirect("/dashboard?aviso=proveedores_staff");
  }

  const { data: raw, error } = await supabase
    .from("vendors")
    .select("id, nombre_apellido, telefono, profesion, is_active, notas")
    .order("nombre_apellido", { ascending: true })
    .limit(500);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar proveedores</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <p className="text-muted-foreground mt-2">
          Ejecutá la migración{" "}
          <code className="rounded bg-muted px-1">supabase/migrations/20250329120000_vendors_agenda.sql</code> en
          Supabase.
        </p>
      </div>
    );
  }

  const rows: VendorRow[] = (raw ?? []).map((r) => {
    const prof = String(r.profesion);
    return {
      id: r.id as string,
      nombre_apellido: r.nombre_apellido as string,
      telefono: r.telefono as string,
      profesion: isProfesionVendor(prof) ? prof : "Otro",
      is_active: Boolean(r.is_active),
      notas: (r.notas as string) ?? null,
    };
  });

  return <VendorsClient rows={rows} />;
}
