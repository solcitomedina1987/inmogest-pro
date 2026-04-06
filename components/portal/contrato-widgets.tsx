"use client";

import { CalendarClock, CalendarX2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ContratoWidgetData = {
  // Widget 1
  mesesPagados: number;
  totalMeses: number;
  progresoPct: number;
  // Widget 2
  diasActualizacion: number | null; // null = no aplica
  montoActual: number;
  montoEstimado: number | null;     // null = sin datos de índice
  esEstimado: boolean;
  indice: string;                   // 'ICL' | 'IPC'
  // Widget 3
  diasVencimiento: number; // negativo = ya venció
};

export function ContratoWidgets({ data }: { data: ContratoWidgetData }) {
  const { mesesPagados, totalMeses, progresoPct, diasActualizacion, diasVencimiento,
          montoActual, montoEstimado, esEstimado, indice } = data;

  const precioFmt = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  });

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
              {montoEstimado != null ? (
                <p className="text-sm text-muted-foreground">
                  Valor estimado:{" "}
                  <span className="font-semibold text-orange-700">
                    {precioFmt.format(montoEstimado)}
                  </span>
                  {esEstimado && (
                    <span className="ml-1 text-[11px] text-orange-500" title="Basado en el último índice disponible">
                      ≈ estimado
                    </span>
                  )}
                  <span className="ml-1 text-[11px] text-muted-foreground">({indice})</span>
                </p>
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
        <CardContent>
          {diasVencimiento < 0 ? (
            <p className="text-xl font-semibold text-muted-foreground">Contrato Finalizado</p>
          ) : (
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                diasVencimiento < 60 ? "text-red-600" : "text-foreground",
              )}
            >
              En {diasVencimiento} día{diasVencimiento !== 1 ? "s" : ""}
              {diasVencimiento < 60 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  Próximo vencimiento
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
