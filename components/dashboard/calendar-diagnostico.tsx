"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Stethoscope,
  CalendarPlus,
} from "lucide-react";
import { sincronizarContratosAlCalendario, type SyncResult } from "@/app/actions/calendar-sync";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type TestStep = { label: string; ok: boolean; detail: string };
type TestResult = { ok: boolean; steps: TestStep[] };

export function CalendarDiagnostico() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detallesOpen, setDetallesOpen] = useState(false);

  const [isPendingTest, startTest] = useTransition();
  const [isPendingSync, startSync] = useTransition();

  function handleTest() {
    setTestError(null);
    startTest(async () => {
      try {
        const res = await fetch("/api/calendar/test");
        const json = await res.json() as TestResult;
        setTestResult(json);
        setOpen(true);
        setSyncResult(null);
      } catch {
        setTestError("No se pudo conectar al servidor de diagnóstico.");
      }
    });
  }

  function handleSync() {
    setSyncResult(null);
    startSync(async () => {
      const result = await sincronizarContratosAlCalendario();
      setSyncResult(result);
      setDetallesOpen(false);
    });
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarPlus className="text-muted-foreground size-4" aria-hidden />
          <span className="text-sm font-semibold">Google Calendar — Configuración y sincronización</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Explicación */}
        <p className="text-muted-foreground text-xs leading-relaxed">
          Si los contratos fueron cargados antes de activar Google Calendar, sus eventos no existen
          aún. Usá <strong>Diagnosticar</strong> para verificar la conexión y{" "}
          <strong>Sincronizar contratos</strong> para crear todos los eventos en el calendario.
        </p>

        {/* Botones */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleTest}
            disabled={isPendingTest || isPendingSync}
          >
            {isPendingTest ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Stethoscope className="size-4" aria-hidden />
            )}
            Diagnosticar conexión
          </Button>

          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={handleSync}
            disabled={isPendingSync || isPendingTest}
          >
            {isPendingSync ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Sincronizar contratos al calendario
          </Button>
        </div>

        {/* Error de fetch */}
        {testError ? (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {testError}
          </p>
        ) : null}

        {/* Resultado del diagnóstico */}
        {testResult ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <div
              className={cn(
                "rounded-lg border p-3",
                testResult.ok
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
              )}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    {testResult.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden />
                    )}
                    <span className="text-sm font-semibold">
                      {testResult.ok
                        ? "Conexión con Google Calendar: OK"
                        : "Error en la conexión con Google Calendar"}
                    </span>
                  </div>
                  {open ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <ul className="mt-3 space-y-2">
                  {testResult.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      {step.ok ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
                      ) : (
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-600" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <span className="font-medium">{step.label}:</span>{" "}
                        <span className="text-muted-foreground break-words">{step.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Instrucciones si falla el acceso al calendario */}
                {!testResult.ok &&
                  testResult.steps.some((s) => s.label === "Acceso al calendario" && !s.ok) ? (
                  <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-700 dark:bg-amber-950/30">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Cómo compartir el calendario:
                    </p>
                    <ol className="mt-1 list-decimal pl-4 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                      <li>Abrí <strong>calendar.google.com</strong></li>
                      <li>En tu calendario → "Configuración y uso compartido"</li>
                      <li>Sección "Compartir con personas" → Agregar <strong>{process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL_HINT ?? "el email de la service account"}</strong></li>
                      <li>Permiso: <strong>"Realizar cambios en los eventos"</strong></li>
                    </ol>
                  </div>
                ) : null}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : null}

        {/* Resultado de sincronización */}
        {syncResult ? (
          <div
            className={cn(
              "rounded-lg border p-3",
              syncResult.ok
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
            )}
          >
            <div className="flex items-center gap-2">
              {syncResult.ok ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />
              )}
              <p className="text-sm font-semibold">{syncResult.message}</p>
            </div>

            {syncResult.total > 0 ? (
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Total: <strong>{syncResult.total}</strong></span>
                <span className="text-emerald-700">OK: <strong>{syncResult.exitosos}</strong></span>
                {syncResult.fallidos > 0 ? (
                  <span className="text-red-700">Error: <strong>{syncResult.fallidos}</strong></span>
                ) : null}
              </div>
            ) : null}

            {syncResult.detalles.length > 0 ? (
              <Collapsible open={detallesOpen} onOpenChange={setDetallesOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {detallesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    Ver detalle por contrato
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {syncResult.detalles.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        {d.ok ? (
                          <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden />
                        ) : (
                          <AlertCircle className="mt-0.5 size-3 shrink-0 text-red-600" aria-hidden />
                        )}
                        <span className="min-w-0">
                          <span className="font-medium">{d.contrato}</span>
                          {d.error ? (
                            <span className="ml-1 text-red-600">— {d.error}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
