"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMesPeriodoHumano } from "@/lib/cobranzas/mes-periodo-humano";

const CUERPO =
  "Este es un cálculo ESTIMADO que corresponde a la actualización del alquiler según el índice estipulado en tu contrato. No olvides consultarnos por la confirmación del monto final de actualización.";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: string | null;
  monto: number | null;
  /** YYYY-MM del mes a partir del cual aplica el valor estimado */
  mesPeriodo: string | null;
};

export function ActualizacionEstimadaDialog({
  open,
  onOpenChange,
  loading = false,
  error = null,
  monto,
  mesPeriodo,
}: Props) {
  const mesLabel = mesPeriodo ? formatMesPeriodoHumano(mesPeriodo) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Actualización Estimada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">{CUERPO}</p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
              <span>Calculando…</span>
            </div>
          ) : null}
          {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}
          {!loading && !error && monto != null && mesLabel ? (
            <p className="leading-relaxed">
              <span className="font-medium text-foreground">Valor Estimado: </span>
              <span className="text-lg font-bold text-orange-700 tabular-nums">
                {precioFmt.format(monto)}
              </span>
              <span className="text-foreground"> a partir del mes {mesLabel}</span>
            </p>
          ) : null}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
