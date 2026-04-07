import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Percent,
  TrendingUp,
} from "lucide-react";
import { getExecutiveDashboardData } from "@/app/actions/dashboard-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function mesLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

export async function ExecutiveDashboardPanel() {
  const data = await getExecutiveDashboardData();
  if (!data) return null;

  const vencimientosTotal =
    data.vencimientosEsteMes + data.vencimientosProximoMes + data.vencimientosSubsiguiente;
  const actualizacionesTotal =
    data.actualizacionesEsteMes +
    data.actualizacionesProximoMes +
    data.actualizacionesSubsiguiente;

  return (
    <div className="max-w-full space-y-8">
      {/* ── 4 Widgets ── */}
      <div className="grid max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">

        {/* Widget 1 — Próximos Vencimientos */}
        <Card
          className={cn(
            "border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos vencimientos</CardTitle>
            <div className="rounded-lg bg-amber-500/15 p-2.5 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <CalendarClock className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-amber-900 dark:text-amber-300 xl:text-5xl">
              {vencimientosTotal}
            </p>
            <p className="mt-1 text-[11px] font-medium text-amber-800/80 dark:text-amber-400/80">
              Contratos que vencen próximamente
            </p>
            <div className="mt-3 flex flex-col gap-0.5 border-t border-amber-200/60 pt-2.5 dark:border-amber-800/40">
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Este mes ({mesLabel(0)})</span>
                <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-300">
                  {data.vencimientosEsteMes}
                </span>
              </span>
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Próximo ({mesLabel(1)})</span>
                <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-300">
                  {data.vencimientosProximoMes}
                </span>
              </span>
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Subsiguiente ({mesLabel(2)})</span>
                <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-300">
                  {data.vencimientosSubsiguiente}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Widget 2 — Actualizaciones de precio próximas */}
        <Card
          className={cn(
            "border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-violet-600 bg-violet-50/40 dark:bg-violet-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actualizaciones próximas</CardTitle>
            <div className="rounded-lg bg-violet-600/15 p-2.5 text-violet-700 dark:bg-violet-600/25 dark:text-violet-300">
              <TrendingUp className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-violet-900 dark:text-violet-300 xl:text-5xl">
              {actualizacionesTotal}
            </p>
            <p className="mt-1 text-[11px] font-medium text-violet-800/80 dark:text-violet-400/80">
              Contratos con ajuste de valor en este mes o los dos siguientes
            </p>
            <div className="mt-3 flex flex-col gap-0.5 border-t border-violet-200/60 pt-2.5 dark:border-violet-800/40">
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Este mes ({mesLabel(0)})</span>
                <span className="font-semibold tabular-nums text-violet-900 dark:text-violet-300">
                  {data.actualizacionesEsteMes}
                </span>
              </span>
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Próximo ({mesLabel(1)})</span>
                <span className="font-semibold tabular-nums text-violet-900 dark:text-violet-300">
                  {data.actualizacionesProximoMes}
                </span>
              </span>
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Subsiguiente ({mesLabel(2)})</span>
                <span className="font-semibold tabular-nums text-violet-900 dark:text-violet-300">
                  {data.actualizacionesSubsiguiente}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Widget 3 — Cobros pendientes */}
        <Card
          className={cn(
            "border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-red-600 bg-red-50/40 dark:bg-red-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobros pendientes</CardTitle>
            <div className="rounded-lg bg-red-600/15 p-2.5 text-red-700 dark:bg-red-600/25 dark:text-red-400">
              <AlertTriangle className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-red-700 dark:text-red-400 xl:text-5xl">
              {data.cobrosPendientes}
            </p>
            <p className="mt-1 text-[11px] font-medium text-red-700/70 dark:text-red-400/70">
              Alquileres sin pago registrado este mes
            </p>
            <div className="mt-3 flex flex-col gap-0.5 border-t border-red-200/60 pt-2.5 dark:border-red-800/40">
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">% Morosidad</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    data.morosidadPct > 50
                      ? "text-red-700 dark:text-red-400"
                      : data.morosidadPct > 20
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {data.morosidadPct}%
                </span>
              </span>
              <span className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Total contratos activos</span>
                <span className="font-semibold tabular-nums text-foreground/80">
                  {data.totalContratosActivos}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Widget 4 — Propiedades y ocupación */}
        <Card
          className={cn(
            "border shadow-sm transition-shadow hover:shadow-md",
            "border-l-4 border-l-blue-600 bg-blue-50/40 dark:bg-blue-950/20",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propiedades y ocupación</CardTitle>
            <div className="rounded-lg bg-blue-600/15 p-2.5 text-blue-700 dark:bg-blue-600/25 dark:text-blue-400">
              <Building2 className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pb-5 pt-0">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-blue-700 dark:text-blue-400 xl:text-5xl">
              {data.totalPropiedades}
            </p>
            <p className="mt-1 text-[11px] font-medium text-blue-700/70 dark:text-blue-400/70">
              {data.alquiladasCount} alquiladas · {data.totalPropiedades - data.alquiladasCount} disponibles ·{" "}
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <Percent className="size-3" aria-hidden />
                {data.ocupacionPct}% ocupación
              </span>
            </p>
            <div className="mt-3 border-t border-blue-200/60 pt-2.5 dark:border-blue-800/40">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-900/40">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                  style={{ width: `${data.ocupacionPct}%` }}
                  role="progressbar"
                  aria-valuenow={data.ocupacionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
