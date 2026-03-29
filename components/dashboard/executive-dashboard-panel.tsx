import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  Percent,
} from "lucide-react";
import { getExecutiveDashboardData } from "@/app/actions/dashboard-metrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type PanelProps = {
  /** Enlaces a secciones solo para administradores (cliente ve métricas sin acceso a listados). */
  showAdminLinks?: boolean;
};

export async function ExecutiveDashboardPanel({ showAdminLinks = false }: PanelProps = {}) {
  const data = await getExecutiveDashboardData();
  if (!data) {
    return null;
  }

  return (
    <div className="max-w-full space-y-10">
      <div className="grid max-w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 xl:grid-cols-4 xl:gap-10">
        <Card
          className={cn(
            "min-h-[148px] border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-red-600 bg-red-50/40 dark:bg-red-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobros atrasados</CardTitle>
            <div className="rounded-lg bg-red-600/15 p-2.5 text-red-700 dark:bg-red-600/25 dark:text-red-400">
              <AlertTriangle className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-red-700 dark:text-red-400 xl:text-4xl">
              {data.cobrosAtrasados}
            </p>
            <CardDescription className="mt-2 text-xs">
              Contratos en mora (atrasados o pasado el límite del mes)
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "min-h-[148px] border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
            <div className="rounded-lg bg-emerald-600/15 p-2.5 text-emerald-700 dark:bg-emerald-600/25 dark:text-emerald-400">
              <Percent className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400 xl:text-4xl">
              {data.ocupacionPct}%
            </p>
            <CardDescription className="mt-2 text-xs">
              Propiedades alquiladas sobre activas en cartera
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "min-h-[148px] border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-amber-600 bg-amber-50/35 dark:bg-amber-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos vencimientos</CardTitle>
            <div className="rounded-lg bg-amber-600/15 p-2.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
              <CalendarClock className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-amber-900 dark:text-amber-300 xl:text-4xl">
              {data.vencimientos30}
            </p>
            <CardDescription className="mt-2 text-xs">Contratos que vencen en los próximos 30 días</CardDescription>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "min-h-[148px] border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-blue-600 bg-blue-50/40 dark:bg-blue-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total propiedades</CardTitle>
            <div className="rounded-lg bg-blue-600/15 p-2.5 text-blue-700 dark:bg-blue-600/25 dark:text-blue-400">
              <Building2 className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-blue-700 dark:text-blue-400 xl:text-4xl">
              {data.totalPropiedades}
            </p>
            <CardDescription className="mt-2 text-xs">Inmuebles activos en cartera</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Atención inmediata</CardTitle>
          <CardDescription>Últimos pagos marcados como atrasados (máx. 5)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.ultimosAtrasados.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No hay pagos atrasados registrados.</p>
          ) : (
            <ul className="divide-border divide-y rounded-lg border">
              {data.ultimosAtrasados.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{p.inquilino_nombre}</p>
                    <p className="text-muted-foreground text-xs">Período {p.mes_periodo}</p>
                  </div>
                  <p className="font-semibold tabular-nums text-red-700 sm:text-right">
                    {precioFmt.format(p.monto_esperado)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {showAdminLinks ? (
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/dashboard/cobranzas">
                Ver todos los cobros
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
