"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReciboAlquiler, type ReciboAlquilerProps } from "@/components/cobranzas/recibo-alquiler";
import { RegistrarPagoDialog } from "@/components/cobranzas/registrar-pago-dialog";
import { ReciboPrintButton } from "@/components/cobranzas/recibo-print-button";
import { EditarContratoDialog } from "@/components/cobranzas/editar-contrato-dialog";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function estadoBadge(estado: string) {
  if (estado === "Pagado") {
    return (
      <Badge variant="outline" className="border-emerald-600 text-emerald-800">
        Pagado
      </Badge>
    );
  }
  if (estado === "Atrasado") {
    return <Badge variant="destructive">Atrasado</Badge>;
  }
  return <Badge variant="secondary">Pendiente</Badge>;
}

type Props = {
  contrato: ContratoCobranzaRow;
  pagos: PagoRow[];
};

export function ContratoDetalleClient({ contrato, pagos }: Props) {
  const [pagoOpen, setPagoOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [reciboProps, setReciboProps] = useState<ReciboAlquilerProps | null>(null);
  const [imprimirPendiente, setImprimirPendiente] = useState(false);

  const nombreInquilino = contrato.inquilino?.nombre_completo?.trim() || "—";

  useEffect(() => {
    if (!imprimirPendiente || !reciboProps) {
      return;
    }

    let cancelled = false;

    const limpiar = () => {
      document.documentElement.classList.remove("print-receipt-only");
      setImprimirPendiente(false);
      setReciboProps(null);
    };

    window.addEventListener("afterprint", limpiar, { once: true });

    const outerId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        document.documentElement.classList.add("print-receipt-only");
        window.print();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      window.removeEventListener("afterprint", limpiar);
      document.documentElement.classList.remove("print-receipt-only");
    };
  }, [imprimirPendiente, reciboProps]);

  function solicitarImpresionRecibo(pago: PagoRow) {
    const monto = pago.monto_pagado != null ? Number(pago.monto_pagado) : Number(pago.monto_esperado);
    setReciboProps({
      nombreCliente: nombreInquilino,
      montoPagado: monto,
      mesPeriodo: pago.mes_periodo,
      fechaEmision: new Date(),
    });
    setImprimirPendiente(true);
  }

  return (
    <div className="print-container flex flex-col gap-8">
      {reciboProps ? <ReciboAlquiler {...reciboProps} /> : null}
      <EditarContratoDialog open={editarOpen} onOpenChange={setEditarOpen} contrato={contrato} />
      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        contratoId={contrato.id}
        montoSugerido={Number(contrato.monto_mensual)}
        disabled={!contrato.is_active}
      />

      <div className="print:hidden flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/dashboard/cobranzas">
            <ArrowLeft className="size-4" />
            Volver a cobranzas
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Contrato de alquiler</h1>
            {!contrato.is_active ? (
              <Badge variant="secondary" className="shrink-0">
                Finalizado
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">Ficha y historial de pagos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setEditarOpen(true)}>
            <Pencil className="size-4 shrink-0" aria-hidden />
            Editar contrato
          </Button>
          <Button type="button" onClick={() => setPagoOpen(true)} disabled={!contrato.is_active}>
            Registrar pago
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Resumen</CardTitle>
          <CardDescription>Propiedad, inquilino y locador</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Propiedad</p>
            <p className="mt-1 font-medium">{contrato.propiedad?.nombre ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Inquilino</p>
            <p className="mt-1 font-medium">{contrato.inquilino?.nombre_completo ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Locador</p>
            <p className="mt-1 font-medium">{contrato.locador?.nombre_completo ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Monto mensual</p>
            <p className="mt-1 font-semibold tabular-nums">{precioFmt.format(Number(contrato.monto_mensual))}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Día límite de cobro</p>
            <p className="mt-1 tabular-nums">Día {contrato.dia_limite_pago}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Actualización (meses)</p>
            <p className="mt-1 tabular-nums">Cada {contrato.meses_actualizacion}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Estado</p>
            <p className="mt-1">
              {contrato.is_active ? (
                <Badge variant="outline" className="border-emerald-600 text-emerald-800">
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary">Finalizado</Badge>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Inicio</p>
            <p className="mt-1">{fechaFmt.format(new Date(contrato.fecha_inicio + "T12:00:00"))}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Vencimiento</p>
            <p className="mt-1">{fechaFmt.format(new Date(contrato.fecha_vencimiento + "T12:00:00"))}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Registro de pago</CardTitle>
          <CardDescription>
            Cargá un cobro mensual (modal). El período se asigna según el mes de la fecha indicada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setPagoOpen(true)} disabled={!contrato.is_active}>
            Abrir formulario de pago
          </Button>
          {!contrato.is_active ? (
            <p className="text-muted-foreground mt-2 text-xs">Los contratos finalizados no admiten nuevos registros de pago.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Historial de pagos</CardTitle>
          <CardDescription>Del más reciente al más antiguo</CardDescription>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No hay pagos registrados aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead>Fecha pago</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="print:hidden">Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium tabular-nums">{p.mes_periodo}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {precioFmt.format(Number(p.monto_esperado))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.monto_pagado != null ? precioFmt.format(Number(p.monto_pagado)) : "—"}
                    </TableCell>
                    <TableCell>
                      {p.fecha_pago_realizado
                        ? fechaFmt.format(new Date(p.fecha_pago_realizado + "T12:00:00"))
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm">
                      {p.forma_pago ?? "—"}
                    </TableCell>
                    <TableCell>{estadoBadge(p.estado)}</TableCell>
                    <TableCell className="print:hidden">
                      <ReciboPrintButton onPrint={() => solicitarImpresionRecibo(p)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagos.some((p) => p.observaciones) ? (
            <div className="text-muted-foreground mt-4 space-y-2 text-xs">
              <p className="font-medium text-foreground">Observaciones</p>
              {pagos
                .filter((p) => p.observaciones)
                .map((p) => (
                  <p key={p.id}>
                    <span className="font-mono">{p.mes_periodo}</span>: {p.observaciones}
                  </p>
                ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
