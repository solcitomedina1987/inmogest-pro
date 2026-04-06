"use client";

import { useState } from "react";
import { TrendingUp, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { calcularAumento } from "@/app/actions/calcular-aumento";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ResultadoCalculo } from "@/lib/indices/types";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type Props = {
  contratoId: string;
  mesActualizacion: string; // YYYY-MM — para mostrar contexto
};

export function CalcularAumentoDialog({ contratoId, mesActualizacion }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);

  async function handleCalcular() {
    setLoading(true);
    setResultado(null);
    try {
      const res = await calcularAumento(contratoId);
      setResultado(res);
      if (!res.ok) toast.error(res.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado.";
      toast.error(msg);
      setResultado({ ok: false, error: msg });
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) setResultado(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-orange-400 text-orange-700 hover:bg-orange-50 hover:text-orange-900 hover:border-orange-600"
          title={`Calcular aumento — ${mesActualizacion}`}
        >
          <TrendingUp className="size-3.5" aria-hidden />
          Calcular aumento
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-orange-600" aria-hidden />
            Cálculo de aumento — {mesActualizacion}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {!resultado && (
            <p className="text-sm text-muted-foreground">
              Calculá el nuevo valor de alquiler aplicando el índice del contrato
              ({mesActualizacion}) sobre el monto actual.
            </p>
          )}

          {/* Resultado exitoso */}
          {resultado?.ok && (
            <div className="flex flex-col gap-3">
              {resultado.es_estimado && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <strong>Valor estimado</strong> — el índice del mes de actualización aún no fue publicado oficialmente. Se usó el último dato disponible.
                  </span>
                </div>
              )}

              {/* Desglose */}
              <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Índice</span>
                  <span className="font-semibold">{resultado.indice_tipo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor inicial ({resultado.fecha_ref})</span>
                  <span className="tabular-nums">{resultado.indice_inicial.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor final ({resultado.fecha_actualizacion.slice(0, 7)})</span>
                  <span className="tabular-nums">{resultado.indice_final.toFixed(4)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Coeficiente</span>
                  <span className="font-semibold tabular-nums">×{resultado.coeficiente.toFixed(4)}</span>
                </div>
              </div>

              {/* Montos */}
              <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto actual</span>
                  <span className="tabular-nums">{precioFmt.format(resultado.monto_actual)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Nuevo monto sugerido</span>
                  <span className="text-xl font-bold tabular-nums text-orange-700">
                    {precioFmt.format(resultado.monto_sugerido)}
                    {resultado.es_estimado && <span className="ml-1 text-xs font-normal text-orange-500">≈</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" aria-hidden />
                Guardado en sistema como valor sugerido.
              </div>
            </div>
          )}

          {/* Error */}
          {resultado && !resultado.ok && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{resultado.error}</span>
            </div>
          )}

          {/* Botón calcular */}
          <Button
            onClick={handleCalcular}
            disabled={loading}
            className="w-full gap-2"
            variant={resultado?.ok ? "outline" : "default"}
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" aria-hidden />Calculando…</>
            ) : resultado?.ok ? (
              <><RefreshCw className="size-4" aria-hidden />Recalcular</>
            ) : (
              <><TrendingUp className="size-4" aria-hidden />Calcular aumento</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
