import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/role-label";
import { BRAND_NAME } from "@/lib/constants/branding";
import { contratosConAlertaEnMes } from "@/lib/cobranzas/alertas-actualizacion";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";
import { ExecutiveDashboardPanel } from "@/components/dashboard/executive-dashboard-panel";
import { ExecutiveDashboardSkeleton } from "@/components/dashboard/executive-dashboard-skeleton";
import { FirstLoginWelcomeDialog } from "@/components/dashboard/first-login-welcome-dialog";
import { BannerActualizaciones } from "@/components/cobranzas/banner-actualizaciones";

export const metadata: Metadata = {
  title: "Panel",
};

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

  // Cargar contratos activos para el banner de alertas (solo admins)
  let contratosAlerta: ContratoCobranzaRow[] = [];
  if (rol === "admin") {
    const { data: contratosRaw } = await supabase
      .from("contratos_cobranza")
      .select(`
        id, fecha_inicio, fecha_vencimiento, monto_mensual,
        meses_actualizacion, indice_actualizacion, ultima_actualizacion, is_active,
        propiedad:propiedades ( nombre, direccion )
      `)
      .eq("is_active", true);

    const todos: ContratoCobranzaRow[] = (contratosRaw ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        propiedad_id: (row.propiedad_id as string) ?? "",
        cliente_id: (row.cliente_id as string) ?? "",
        locador_id: (row.locador_id as string) ?? "",
        fecha_inicio: row.fecha_inicio as string,
        fecha_vencimiento: (row.fecha_vencimiento as string) ?? "",
        monto_mensual: Number(row.monto_mensual),
        dia_limite_pago: Number(row.dia_limite_pago ?? 10),
        meses_actualizacion: Number(row.meses_actualizacion),
        indice_actualizacion: ((row.indice_actualizacion as string) ?? "ICL") as "IPC" | "ICL",
        ultima_actualizacion: (row.ultima_actualizacion as string) ?? null,
        is_active: true,
        propiedad: Array.isArray(row.propiedad) ? (row.propiedad[0] ?? null) : (row.propiedad as ContratoCobranzaRow["propiedad"]) ?? null,
      };
    });

    contratosAlerta = contratosConAlertaEnMes(todos);
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-8">
      <Suspense fallback={null}>
        <FirstLoginWelcomeDialog />
      </Suspense>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          {mostrarMetricas ? (
            <p className="text-muted-foreground text-sm">Métricas clave y cobros atrasados</p>
          ) : (
            <p className="text-muted-foreground text-sm">Resumen de tu cuenta en {BRAND_NAME}</p>
          )}
        </div>
        <p className="text-muted-foreground shrink-0 text-xs tracking-wide sm:text-right">
          <span className="font-medium text-foreground/80">Usuario:</span> {nombre}{" "}
          <span className="text-muted-foreground/70">|</span>{" "}
          <span className="font-medium text-foreground/80">Rol:</span> {roleLabel(rol)}
        </p>
      </header>

      <BannerActualizaciones contratos={contratosAlerta} />

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
