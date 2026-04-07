"use client";

import { useState } from "react";
import { Calculator, CalendarClock, CalendarX2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActualizacionEstimadaDialog } from "@/components/shared/actualizacion-estimada-dialog";

export type ContratoWidgetData = {
  // Widget 1
  mesesPagados: number;
  totalMeses: number;
  progresoPct: number;
  // Widget 2
  diasActualizacion: number | null; // null = no aplica
  montoActual: number;
  indice: string; // 'ICL' | 'IPC'
  contratoId: string;
  /** YYYY-MM del período objetivo de la próxima actualización (para el cálculo en modal). */
  estimacionMes: string | null;
  calculatorConfigured: boolean;
  // Widget 3
  fechaVencimiento: string; // YYYY-MM-DD
  diasVencimiento: number; // negativo = ya venció
};

function fmtFechaVencimiento(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function ContratoWidgets({ data }: { data: ContratoWidgetData }) {
  const {
    mesesPagados,
    totalMeses,
    progresoPct,
    diasActualizacion,
    diasVencimiento,
    fechaVencimiento,
    montoActual,
    indice,
    contratoId,
    estimacionMes,
    calculatorConfigured,
  } = data;

  const precioFmt = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  });

  const [estimadaOpen, setEstimadaOpen] = useState(false);
  const [estimadaLoading, setEstimadaLoading] = useState(false);
  const [estimadaError, setEstimadaError] = useState<string | null>(null);
  const [estimadaMonto, setEstimadaMonto] = useState<number | null>(null);

  async function abrirEstimado() {
    if (!estimacionMes) return;
    setEstimadaOpen(true);
    setEstimadaMonto(null);
    setEstimadaError(null);
    setEstimadaLoading(true);
    try {
      const res = await fetch("/api/portal/calculator-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoId, month: estimacionMes }),
      });
      const json = (await res.json()) as { ok?: boolean; value?: number | null; error?: string };
      if (!res.ok) {
        setEstimadaError(json.error ?? "No se pudo calcular.");
        return;
      }
      if (json.value == null) {
        setEstimadaError("No hay valor estimado para ese período.");
        return;
      }
      setEstimadaMonto(Number(json.value));
    } catch {
      setEstimadaError("Error de conexión.");
    } finally {
      setEstimadaLoading(false);
    }
  }

  const mostrarCalculadora =
    calculatorConfigured && estimacionMes != null && diasActualizacion !== null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

      {/* ── Widget 1: Progreso del contrato ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="size-4 shrink-0" aria-hidden />
            Progreso del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-bold tabular-nums">
            {mesesPagados}
            <span className="text-base font-normal text-muted-foreground">/{totalMeses} meses</span>
          </p>
          <div className="flex flex-col gap-1">
            <Progress value={progresoPct} className="h-2.5" />
            <p className="text-xs text-muted-foreground text-right">{progresoPct}% completado</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Widget 2: Próxima actualización ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            Próxima Actualización
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diasActualizacion === null ? (
            <p className="text-xl font-semibold text-muted-foreground">No aplica</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  diasActualizacion < 30 ? "text-orange-600" : "text-foreground",
                )}
              >
                En {diasActualizacion} día{diasActualizacion !== 1 ? "s" : ""}
                {diasActualizacion < 30 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                    Próximo
                  </span>
                )}
              </p>
              {mostrarCalculadora ? (
                <div className="flex flex-col gap-2 pt-0.5">
                  <p className="text-xs text-muted-foreground">
                    Índice contractual: <span className="font-medium text-foreground">{indice}</span>
                    {" · "}Monto actual:{" "}
                    <span className="tabular-nums">{precioFmt.format(montoActual)}</span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2 border-orange-200 text-orange-800 hover:bg-orange-50"
                    onClick={() => void abrirEstimado()}
                    disabled={estimadaLoading}
                  >
                    <Calculator className="size-4 shrink-0" aria-hidden />
                    Ver actualización estimada
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Monto actual: {precioFmt.format(montoActual)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Widget 3: Vencimiento del contrato ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <CalendarX2 className="size-4 shrink-0" aria-hidden />
            Vencimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums leading-tight",
              diasVencimiento >= 0 && diasVencimiento < 60 ? "text-red-600" : "text-foreground",
              diasVencimiento < 0 && "text-muted-foreground",
            )}
          >
            {fmtFechaVencimiento(fechaVencimiento)}
          </p>
          {diasVencimiento < 0 ? (
            <p className="text-sm text-muted-foreground">Contrato finalizado</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>
                Faltan {diasVencimiento} día{diasVencimiento !== 1 ? "s" : ""}
              </span>
              {diasVencimiento < 60 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  Próximo vencimiento
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ActualizacionEstimadaDialog
        open={estimadaOpen}
        onOpenChange={setEstimadaOpen}
        loading={estimadaLoading}
        error={estimadaError}
        monto={estimadaMonto}
        mesPeriodo={estimacionMes}
      />
    </div>
  );
}
