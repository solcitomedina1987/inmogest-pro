"use client";

import { useState } from "react";
import { Cloud, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { calcularAumentoArquilerApi } from "@/app/actions/calcular-aumento-arquiler-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ResultadoICLArquilerContrato } from "@/lib/indices/arquiler-icl";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Props = {
  contratoId: string;
  mesActualizacion: string;
};

export function CalcularArquilerApiDialog({ contratoId, mesActualizacion }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoICLArquilerContrato | null>(null);

  async function handleCalcular() {
    setLoading(true);
    setResultado(null);
    try {
      const res = await calcularAumentoArquilerApi(contratoId);
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
          className="gap-1.5 border-sky-400 text-sky-800 hover:bg-sky-50 hover:text-sky-950 hover:border-sky-600"
          title={`Calcular con Arquiler API — ${mesActualizacion}`}
        >
          <Cloud className="size-3.5" aria-hidden />
          Calcular con Arquiler API
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Cloud className="size-5 text-sky-600" aria-hidden />
            Arquiler API — {mesActualizacion}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {!resultado && (
            <p className="text-sm text-muted-foreground">
              Calculá el nuevo alquiler con la fórmula ICL usando la serie publicada en Arquiler API
              (índices cacheados en Supabase para ahorrar cupo de RapidAPI).
            </p>
          )}

          {resultado?.ok && resultado.es_estimado && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-white hover:bg-amber-600">VALOR ESTIMADO</Badge>
              <p className="text-xs text-muted-foreground">
                Proyección con variación diaria promedio entre los dos últimos índices disponibles.
              </p>
            </div>
          )}

          {resultado?.ok && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Desglose
                </p>
                <p className="font-mono text-base tabular-nums break-all">{resultado.desglose_formula}</p>
                <p className="text-xs text-muted-foreground">{resultado.detalle}</p>
              </div>

              <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto actual</span>
                  <span className="tabular-nums">{precioFmt.format(resultado.monto_actual)}</span>
                </div>
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <span className="font-semibold">Nuevo monto sugerido</span>
                  <span className="text-xl font-bold tabular-nums text-sky-800">
                    {precioFmt.format(resultado.monto_sugerido)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" aria-hidden />
                Resultado guardado en aumentos sugeridos.
              </div>
            </div>
          )}

          {resultado && !resultado.ok && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{resultado.error}</span>
            </div>
          )}

          <Button
            onClick={handleCalcular}
            disabled={loading}
            className="w-full gap-2"
            variant={resultado?.ok ? "outline" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Consultando API…
              </>
            ) : resultado?.ok ? (
              <>
                <RefreshCw className="size-4" aria-hidden />
                Recalcular
              </>
            ) : (
              <>
                <Cloud className="size-4" aria-hidden />
                Calcular con Arquiler API
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
