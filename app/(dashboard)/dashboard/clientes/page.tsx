import { redirect } from "next/navigation";
import { isStaffRol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ClientesClient } from "@/components/clientes/clientes-client";
import type { ClienteListRow } from "@/components/clientes/types";
import type { TipoCliente } from "@/lib/constants/clientes";

function mapRow(r: Record<string, unknown>): ClienteListRow {
  return {
    id: r.id as string,
    nombre_completo: r.nombre_completo as string,
    dni: Number(r.dni),
    domicilio_real: r.domicilio_real as string,
    tipo_cliente: r.tipo_cliente as TipoCliente,
    telefono: r.telefono as string,
    email: (r.email as string) ?? null,
    fecha_nacimiento: (r.fecha_nacimiento as string) ?? null,
    notas: (r.notas as string) ?? null,
    is_active: Boolean(r.is_active),
  };
}

export default async function DashboardClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: miPerfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  const miRol = miPerfil?.rol as string | undefined;
  if (!isStaffRol(miRol)) {
    redirect("/dashboard?aviso=clientes_staff");
  }

  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nombre_completo, dni, domicilio_real, tipo_cliente, telefono, email, fecha_nacimiento, notas, is_active",
    )
    .order("nombre_completo", { ascending: true });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">Error al cargar clientes</p>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <p className="text-muted-foreground mt-2">
          Ejecutá la migración{" "}
          <code className="rounded bg-muted px-1">supabase/migrations/20250330120000_clientes_unificados.sql</code>.
        </p>
      </div>
    );
  }

  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));

  return <ClientesClient initial={rows} />;
}
