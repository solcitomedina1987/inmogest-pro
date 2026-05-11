"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Loader2,
  RefreshCw,
  Settings,
  Stethoscope,
} from "lucide-react";
import { sincronizarContratosAlCalendario, type SyncResult } from "@/app/actions/calendar-sync";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type TestStep = { label: string; ok: boolean; detail: string; warn?: boolean };
type TestResult = { ok: boolean; steps: TestStep[]; usingPrimary?: boolean };

type TestEventResult = {
  ok: boolean;
  eventId?: string;
  htmlLink?: string;
  calendarName?: string;
  calendarId?: string;
  calendarOwnerId?: string;
  usingPrimary?: boolean;
  fecha?: string;
  status?: string;
  warning?: string | null;
  error?: string;
  httpStatus?: number;
  hint?: string;
};

export function CalendarDiagnostico() {
  const [panelOpen, setPanelOpen] = useState(false);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [testEventResult, setTestEventResult] = useState<TestEventResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);
  const [detallesOpen, setDetallesOpen] = useState(false);

  const [isPendingTest, startTest] = useTransition();
  const [isPendingSync, startSync] = useTransition();
  const [isPendingTestEvent, startTestEvent] = useTransition();

  function handleTest() {
    setTestError(null);
    setTestEventResult(null);
    startTest(async () => {
      try {
        const res = await fetch("/api/calendar/test");
        const json = await res.json() as TestResult;
        setTestResult(json);
        setDiagOpen(true);
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

  function handleTestEvent() {
    setTestEventResult(null);
    startTestEvent(async () => {
      try {
        const res = await fetch("/api/calendar/test-event", { method: "POST" });
        const json = await res.json() as TestEventResult;
        setTestEventResult(json);
      } catch {
        setTestEventResult({ ok: false, error: "No se pudo conectar al servidor." });
      }
    });
  }

  const isWorking = isPendingTest || isPendingSync || isPendingTestEvent;

  // Detectar si algún step tiene warn=true
  const hasVisibilityWarning =
    testResult?.usingPrimary ||
    testResult?.steps.some((s) => s.warn && !s.ok);

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
      <div className="rounded-xl border bg-card shadow-sm">

        {/* ── Cabecera — siempre visible ── */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Settings className={cn("size-4 shrink-0 text-muted-foreground", isWorking && "animate-spin")} aria-hidden />
              <span className="text-sm font-semibold">Configuración de Calendario</span>
              <span className="text-muted-foreground text-xs">(Google Calendar)</span>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                panelOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>

        {/* ── Contenido desplegable ── */}
        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-4 pb-4 pt-4">

            <p className="text-muted-foreground text-xs leading-relaxed">
              Usá <strong>Diagnosticar</strong> para verificar la conexión, <strong>Evento de prueba</strong> para
              confirmar en qué calendario se insertan los eventos, y{" "}
              <strong>Sincronizar</strong> para crear los eventos de todos los contratos activos.
            </p>

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleTest}
                disabled={isWorking}
              >
                {isPendingTest
                  ? <Loader2 className="size-4 animate-spin" aria-hidden />
                  : <Stethoscope className="size-4" aria-hidden />}
                Diagnosticar
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleTestEvent}
                disabled={isWorking}
              >
                {isPendingTestEvent
                  ? <Loader2 className="size-4 animate-spin" aria-hidden />
                  : <FlaskConical className="size-4" aria-hidden />}
                Evento de prueba
              </Button>

              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleSync}
                disabled={isWorking}
              >
                {isPendingSync
                  ? <Loader2 className="size-4 animate-spin" aria-hidden />
                  : <RefreshCw className="size-4" aria-hidden />}
                Sincronizar contratos
              </Button>
            </div>

            {/* Error de red */}
            {testError ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {testError}
              </p>
            ) : null}

            {/* ── BANNER: problema de visibilidad (primary) ─────────────────── */}
            {hasVisibilityWarning ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      ¿Por qué no ves los eventos en Google Calendar?
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      <strong>GOOGLE_CALENDAR_ID=&apos;primary&apos;</strong> apunta al calendario{" "}
                      <strong>privado de la Service Account</strong>. Ese calendario es invisible en
                      la interfaz web/móvil de Google Calendar.
                    </p>
                    <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Cómo solucionarlo (una sola vez):
                    </p>
                    <ol className="mt-1 list-decimal pl-4 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <li>
                        Abrí <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">calendar.google.com</a> con tu cuenta de Google.
                      </li>
                      <li>
                        En el panel izquierdo, pasá el mouse sobre el calendario donde querés ver los eventos
                        → clic en los <strong>3 puntos</strong> → <strong>&quot;Configuración y uso compartido&quot;</strong>.
                      </li>
                      <li>
                        En <strong>&quot;Integrar el calendario&quot;</strong>, copiá el <strong>ID del calendario</strong>
                        (suele ser tu email o algo como <code className="bg-amber-100 px-1 rounded">abc123@group.calendar.google.com</code>).
                      </li>
                      <li>
                        En <strong>&quot;Compartir con personas o grupos&quot;</strong>, agregá{" "}
                        <code className="bg-amber-100 px-1 rounded break-all">
                          {testResult?.steps?.[0]?.detail.includes("GOOGLE_CLIENT_EMAIL:")
                            ? testResult.steps[0].detail.replace(/^GOOGLE_CLIENT_EMAIL:\s*/, "").split(" |")[0]
                            : "email-de-service-account"}
                        </code>{" "}
                        con permiso <strong>&quot;Realizar cambios en los eventos&quot;</strong>.
                      </li>
                      <li>
                        Actualizá <code className="bg-amber-100 px-1 rounded">GOOGLE_CALENDAR_ID</code> en{" "}
                        <strong>.env.local</strong> y en <strong>Vercel → Settings → Environment Variables</strong> con el ID copiado.
                      </li>
                      <li>Redesplegá la app en Vercel (o reiniciá el servidor local).</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Resultado del diagnóstico ── */}
            {testResult ? (
              <Collapsible open={diagOpen} onOpenChange={setDiagOpen}>
                <div
                  className={cn(
                    "rounded-lg border p-3",
                    testResult.ok
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-2">
                        {testResult.ok
                          ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                          : <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden />}
                        <span className="text-sm font-semibold">
                          {testResult.ok ? "Conexión OK" : "Error en la conexión"}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", diagOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <ul className="mt-3 space-y-2">
                      {testResult.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          {step.warn ? (
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
                          ) : step.ok ? (
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
                          ) : (
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-600" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <span className={cn("font-medium", step.warn && "text-amber-700")}>{step.label}:</span>{" "}
                            <span className="text-muted-foreground break-words">{step.detail}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ) : null}

            {/* ── Resultado del evento de prueba ── */}
            {testEventResult ? (
              <div
                className={cn(
                  "rounded-lg border p-3",
                  testEventResult.ok
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                    : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
                )}
              >
                <div className="flex items-start gap-2">
                  {testEventResult.ok
                    ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    : <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />}
                  <div className="min-w-0 flex-1 text-xs">
                    {testEventResult.ok ? (
                      <>
                        <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">
                          Evento de prueba creado correctamente
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Calendario: <strong>{testEventResult.calendarName}</strong>
                          {" "}· ID: <code className="bg-muted px-1 rounded text-[10px]">{testEventResult.calendarId}</code>
                          {" "}· Fecha: {testEventResult.fecha}
                        </p>
                        {testEventResult.htmlLink ? (
                          <a
                            href={testEventResult.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                          >
                            <ExternalLink className="size-3.5" />
                            Ver evento en Google Calendar
                          </a>
                        ) : null}
                        {testEventResult.warning ? (
                          <p className="mt-2 flex items-start gap-1.5 text-amber-700">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            {testEventResult.warning}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm text-red-700">
                          Error al crear el evento de prueba
                        </p>
                        {testEventResult.httpStatus ? (
                          <p className="mt-0.5 text-muted-foreground">
                            HTTP {testEventResult.httpStatus}
                          </p>
                        ) : null}
                        <p className="mt-0.5 break-words text-muted-foreground">
                          {testEventResult.error}
                        </p>
                        {testEventResult.hint ? (
                          <p className="mt-1 text-amber-700 font-medium">{testEventResult.hint}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Resultado de sincronización ── */}
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
                  {syncResult.ok
                    ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    : <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />}
                  <p className="text-sm font-semibold">{syncResult.message}</p>
                </div>

                {syncResult.total > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Contratos: <strong>{syncResult.total}</strong></span>
                    <span className="text-emerald-700">Creados: <strong>{syncResult.creadosTotal}</strong></span>
                    <span className="text-sky-700">Ya existían: <strong>{syncResult.omitidosTotal}</strong></span>
                    {syncResult.fallidos > 0 ? (
                      <span className="text-red-700">Error: <strong>{syncResult.fallidos}</strong></span>
                    ) : null}
                  </div>
                ) : null}

                {syncResult.detalles.length > 0 ? (
                  <Collapsible open={detallesOpen} onOpenChange={setDetallesOpen}>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className={cn("size-3 transition-transform duration-200", detallesOpen && "rotate-180")} />
                        Ver detalle por contrato
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                        {syncResult.detalles.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs">
                            {d.ok
                              ? <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden />
                              : <AlertCircle className="mt-0.5 size-3 shrink-0 text-red-600" aria-hidden />}
                            <span className="min-w-0">
                              <span className="font-medium">{d.contrato}</span>
                              {d.ok && (d.creados != null || d.omitidos != null) ? (
                                <span className="ml-1 text-muted-foreground">
                                  (+{d.creados ?? 0} / ={d.omitidos ?? 0})
                                </span>
                              ) : null}
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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
