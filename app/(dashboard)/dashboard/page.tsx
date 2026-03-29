import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/role-label";
import { ExecutiveDashboardPanel } from "@/components/dashboard/executive-dashboard-panel";
import { ExecutiveDashboardSkeleton } from "@/components/dashboard/executive-dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .maybeSingle();

  const nombre = perfil?.nombre?.trim() || user.email?.split("@")[0] || "Usuario";
  const rol = perfil?.rol ?? "cliente";
  const mostrarMetricas = rol === "admin" || rol === "cliente";

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          {mostrarMetricas ? (
            <p className="text-muted-foreground text-sm">Métricas clave y cobros atrasados</p>
          ) : (
            <p className="text-muted-foreground text-sm">Resumen de tu cuenta en InmoGest Pro</p>
          )}
        </div>
        <p className="text-muted-foreground shrink-0 text-xs tracking-wide sm:text-right">
          <span className="font-medium text-foreground/80">Usuario:</span> {nombre}{" "}
          <span className="text-muted-foreground/70">|</span>{" "}
          <span className="font-medium text-foreground/80">Rol:</span> {roleLabel(rol)}
        </p>
      </header>

      {mostrarMetricas ? (
        <Suspense fallback={<ExecutiveDashboardSkeleton />}>
          <ExecutiveDashboardPanel showAdminLinks={rol === "admin"} />
        </Suspense>
      ) : (
        <p className="text-muted-foreground text-sm">No hay métricas disponibles para tu rol.</p>
      )}
    </div>
  );
}
