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
              Se consulta primero el endpoint <code className="rounded bg-muted px-1">/calculatei</code> de
              Arquiler API (monto actual, mes de ajuste, periodicidad e índice). Si no hay respuesta, se usa
              la serie ICL en caché (ICL) o el cálculo local (IPC). El resultado es siempre un valor estimado.
            </p>
          )}

          {resultado?.ok && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-white hover:bg-amber-600">Valor estimado</Badge>
              <p className="text-xs text-muted-foreground">
                {resultado.es_estimado
                  ? "Puede incluir proyección de índices o respuesta de la API; usalo solo como referencia."
                  : "Cifra orientativa según índices disponibles; verificá antes de aplicar al contrato."}
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
                  <span className="font-semibold">Nuevo monto sugerido (estimado)</span>
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
