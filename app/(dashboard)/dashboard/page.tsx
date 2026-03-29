import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isStaffRol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/role-label";
import { ExecutiveDashboardPanel } from "@/components/dashboard/executive-dashboard-panel";
import { ExecutiveDashboardSkeleton } from "@/components/dashboard/executive-dashboard-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  searchParams: Promise<{ aviso?: string }>;
};

export const dynamic = "force-dynamic";

export default async function DashboardHomePage({ searchParams }: Props) {
  const { aviso } = await searchParams;
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
  const isStaff = isStaffRol(rol);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      {aviso === "propiedades_staff" ? (
        <Alert variant="destructive">
          <AlertTitle>Propiedades</AlertTitle>
          <AlertDescription>
            Solo personal operativo (administrador, agente u operador) puede gestionar propiedades. Tu rol actual es{" "}
            <strong>{roleLabel(rol)}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}
      {aviso === "cobranzas_staff" ? (
        <Alert variant="destructive">
          <AlertTitle>Cobranzas</AlertTitle>
          <AlertDescription>
            Solo personal operativo puede acceder a cobranzas y contratos de alquiler. Tu rol actual es{" "}
            <strong>{roleLabel(rol)}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}
      {aviso === "proveedores_staff" ? (
        <Alert variant="destructive">
          <AlertTitle>Proveedores</AlertTitle>
          <AlertDescription>
            Solo personal operativo puede gestionar la agenda de proveedores. Tu rol actual es{" "}
            <strong>{roleLabel(rol)}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}
      {aviso === "clientes_staff" ? (
        <Alert variant="destructive">
          <AlertTitle>Clientes</AlertTitle>
          <AlertDescription>
            Solo personal operativo puede gestionar el padrón de clientes. Tu rol actual es{" "}
            <strong>{roleLabel(rol)}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          {isStaff ? (
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

      {isStaff ? (
        <Suspense fallback={<ExecutiveDashboardSkeleton />}>
          <ExecutiveDashboardPanel />
        </Suspense>
      ) : (
        <p className="text-muted-foreground text-sm">
          Si necesitás ayuda, contactá a tu inmobiliaria. Las métricas del negocio solo están disponibles para el
          equipo interno.
        </p>
      )}
    </div>
  );
}
