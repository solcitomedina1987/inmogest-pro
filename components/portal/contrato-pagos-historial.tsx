"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { cn } from "@/lib/utils";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function fmtFecha(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function estadoBadge(estado: string) {
  if (estado === "Pagado") {
    return <Badge variant="outline" className="border-emerald-600 text-emerald-700">Pagado</Badge>;
  }
  if (estado === "Atrasado") {
    return <Badge variant="destructive">Atrasado</Badge>;
  }
  return <Badge variant="secondary">Pendiente</Badge>;
}

type Props = {
  contrato: ContratoCobranzaRow;
  pagos: PagoRow[];
  /** Título de la tarjeta (por defecto igual al portal inquilino). */
  titulo?: string;
};

export function ContratoPagosHistorial({ contrato, pagos, titulo = "Historial de pagos" }: Props) {
  const mesesActualizacion = useMemo((): Set<string> => {
    const { fecha_inicio, fecha_vencimiento, meses_actualizacion } = contrato;
    if (!fecha_inicio || !fecha_vencimiento || !meses_actualizacion) return new Set();

    const [sy, sm] = fecha_inicio.split("-").map(Number);
    const [ey, em] = fecha_vencimiento.split("-").map(Number);
    const limiteMs = ey * 12 + em;
    const periodos = new Set<string>();

    let y = sy;
    let m = sm + meses_actualizacion;
    while (m > 12) {
      m -= 12;
      y += 1;
    }

    while (y * 12 + m <= limiteMs) {
      periodos.add(`${y}-${String(m).padStart(2, "0")}`);
      m += meses_actualizacion;
      while (m > 12) {
        m -= 12;
        y += 1;
      }
    }
    return periodos;
  }, [contrato]);

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {pagos.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No hay registros de pago disponibles aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Fecha de pago</TableHead>
                  <TableHead className="text-right">Monto pagado</TableHead>
                  <TableHead>Forma de pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => {
                  const esActualizacion = mesesActualizacion.has(p.mes_periodo);
                  return (
                    <TableRow
                      key={p.id}
                      className={cn(esActualizacion ? "bg-yellow-50 dark:bg-yellow-950/20" : undefined)}
                    >
                      <TableCell className="font-medium tabular-nums">
                        {p.mes_periodo}
                        {esActualizacion ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-yellow-200 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800">
                            Actualización
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {p.fecha_pago_realizado ? fmtFecha(p.fecha_pago_realizado) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.monto_pagado != null ? precioFmt.format(Number(p.monto_pagado)) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{p.forma_pago ?? "—"}</TableCell>
                      <TableCell>{estadoBadge(p.estado)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
