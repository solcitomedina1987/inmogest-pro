"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Pencil,
  SquarePen,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { anularPago, eliminarContratoCobranza } from "@/app/actions/cobranzas";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReciboAlquiler, type ReciboAlquilerProps } from "@/components/cobranzas/recibo-alquiler";
import { RegistrarPagoDialog } from "@/components/cobranzas/registrar-pago-dialog";
import { EditarPagoDialog } from "@/components/cobranzas/editar-pago-dialog";
import { ReciboPrintButton } from "@/components/cobranzas/recibo-print-button";
import { EditarContratoDialog } from "@/components/cobranzas/editar-contrato-dialog";
import { ActualizacionEstimadaDialog } from "@/components/shared/actualizacion-estimada-dialog";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
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

/**
 * Semáforo de puntualidad:
 * - Verde: fecha_pago_realizado está dentro del día 1-10 del mes del periodo.
 * - Rojo: fecha_pago_realizado es posterior al día 10 del mes del periodo.
 */
function puntualidadColor(mesPeriodo: string, fechaPago: string | null): "green" | "red" | null {
  if (!fechaPago) return null;
  const [y, m] = mesPeriodo.split("-").map(Number);
  const diaLimite = new Date(y, m - 1, 10, 23, 59, 59); // día 10 del mes del periodo
  const pagado = new Date(fechaPago + "T12:00:00");
  return pagado <= diaLimite ? "green" : "red";
}

type Props = {
  contrato: ContratoCobranzaRow;
  pagos: PagoRow[];
};

export function ContratoDetalleClient({ contrato, pagos }: Props) {
  const router = useRouter();
  const contratoEliminado = contrato.deleted_at != null;
  const [pagoOpen, setPagoOpen] = useState(false);
  const [mesPeriodoPago, setMesPeriodoPago] = useState<string | null>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [editarPagoOpen, setEditarPagoOpen] = useState(false);
  const [pagoEditar, setPagoEditar] = useState<PagoRow | null>(null);
  const [pagoAnularId, setPagoAnularId] = useState<string | null>(null);
  const [reciboProps, setReciboProps] = useState<ReciboAlquilerProps | null>(null);
  const [imprimirPendiente, setImprimirPendiente] = useState(false);
  const [anulando, startAnulacion] = useTransition();
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [eliminando, startEliminar] = useTransition();
  const [estimadaOpen, setEstimadaOpen] = useState(false);
  const [estimadaLoading, setEstimadaLoading] = useState(false);
  const [estimadaError, setEstimadaError] = useState<string | null>(null);
  const [estimadaMonto, setEstimadaMonto] = useState<number | null>(null);
  const [estimadaMesPeriodo, setEstimadaMesPeriodo] = useState<string | null>(null);

  const nombreInquilino = contrato.inquilino?.nombre_completo?.trim() || "—";

  /**
   * Conjunto de periodos YYYY-MM que corresponden a una actualización de precio.
   * Ejemplo: si inicio=2026-01, meses=4 → actualiza en 2026-05, 2026-09, etc.
   */
  const mesesActualizacion = useMemo((): Set<string> => {
    const { fecha_inicio, fecha_vencimiento, meses_actualizacion } = contrato;
    if (!fecha_inicio || !fecha_vencimiento || !meses_actualizacion) return new Set();

    const [sy, sm] = fecha_inicio.split("-").map(Number);
    const [ey, em] = fecha_vencimiento.split("-").map(Number);
    const limiteMs = ey * 12 + em;
    const periodos = new Set<string>();

    let y = sy;
    let m = sm + meses_actualizacion;
    while (m > 12) { m -= 12; y += 1; }

    while (y * 12 + m <= limiteMs) {
      periodos.add(`${y}-${String(m).padStart(2, "0")}`);
      m += meses_actualizacion;
      while (m > 12) { m -= 12; y += 1; }
    }
    return periodos;
  }, [contrato]);

  const stats = useMemo(() => {
    const total = pagos.length;
    const pagados = pagos.filter((p) => p.estado === "Pagado");
    const pendientes = pagos.filter((p) => p.estado === "Pendiente");
    const atrasados = pagos.filter((p) => p.estado === "Atrasado");
    const totalCobrado = pagados.reduce((acc, p) => acc + Number(p.monto_pagado ?? 0), 0);
    const totalPendiente = [...pendientes, ...atrasados].reduce(
      (acc, p) => acc + Number(p.monto_esperado ?? 0),
      0,
    );
    const progreso = total > 0 ? Math.round((pagados.length / total) * 100) : 0;
    return {
      total,
      pagados: pagados.length,
      pendientes: pendientes.length,
      atrasados: atrasados.length,
      totalCobrado,
      totalPendiente,
      progreso,
    };
  }, [pagos]);

  useEffect(() => {
    if (!imprimirPendiente || !reciboProps) return;
    let cancelled = false;
    const limpiar = () => {
      document.documentElement.classList.remove("print-receipt-only");
      setImprimirPendiente(false);
      setReciboProps(null);
    };
    window.addEventListener("afterprint", limpiar, { once: true });
    const outerId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
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

  function handleEliminarContrato() {
    startEliminar(async () => {
      const res = await eliminarContratoCobranza(contrato.id);
      setEliminarOpen(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato eliminado (baja lógica).");
      router.push("/dashboard/cobranzas");
      router.refresh();
    });
  }

  function handleAnular() {
    if (!pagoAnularId) return;
    startAnulacion(async () => {
      const res = await anularPago(pagoAnularId, contrato.id);
      setPagoAnularId(null);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Pago anulado. El período volvió a Pendiente.");
      }
    });
  }

  async function abrirEstimadoMes(mes: string) {
    setEstimadaMesPeriodo(mes);
    setEstimadaOpen(true);
    setEstimadaMonto(null);
    setEstimadaError(null);
    setEstimadaLoading(true);
    try {
      const res = await fetch("/api/calculator/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(contrato.monto_mensual),
          date: contrato.fecha_inicio,
          months: Number(contrato.meses_actualizacion),
          rate: contrato.indice_actualizacion === "IPC" ? "ipc" : "icl",
          month: mes,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; value?: number | null; error?: string };
      if (!res.ok) {
        setEstimadaError(json.error ?? "No se pudo calcular el valor estimado.");
        return;
      }
      if (json.value == null) {
        setEstimadaError("No se encontró un valor estimado para este período.");
        return;
      }
      setEstimadaMonto(Number(json.value));
    } catch {
      setEstimadaError("Error de conexión al calcular el valor estimado.");
    } finally {
      setEstimadaLoading(false);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="print-container flex flex-col gap-8">
        {reciboProps ? <ReciboAlquiler {...reciboProps} /> : null}

        <ActualizacionEstimadaDialog
          open={estimadaOpen}
          onOpenChange={setEstimadaOpen}
          loading={estimadaLoading}
          error={estimadaError}
          monto={estimadaMonto}
          mesPeriodo={estimadaMesPeriodo}
        />

        <EditarContratoDialog open={editarOpen} onOpenChange={setEditarOpen} contrato={contrato} />

        <RegistrarPagoDialog
          open={pagoOpen}
          onOpenChange={(o) => {
            if (!o) setMesPeriodoPago(null);
            setPagoOpen(o);
          }}
          contratoId={contrato.id}
          montoSugerido={Number(contrato.monto_mensual)}
          disabled={!contrato.is_active}
          mesPeriodoPredefinido={mesPeriodoPago}
        />

        <EditarPagoDialog
          open={editarPagoOpen}
          onOpenChange={setEditarPagoOpen}
          pago={pagoEditar}
          contratoId={contrato.id}
        />

        {/* AlertDialog de confirmación de anulación */}
        <AlertDialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este contrato?</AlertDialogTitle>
              <AlertDialogDescription>
                Se pondrá <strong>is_active</strong> en <strong>false</strong>, se guardará fecha y hora en{" "}
                <strong>deleted_at</strong>, el contrato dejará de mostrarse en los listados habituales y no se
                podrán registrar nuevos cobros. Los datos y el historial de cuotas se conservan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleEliminarContrato();
                }}
                disabled={eliminando}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {eliminando ? "Eliminando…" : "Sí, eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!pagoAnularId}
          onOpenChange={(o) => { if (!o) setPagoAnularId(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Anular este pago?</AlertDialogTitle>
              <AlertDialogDescription>
                El período volverá a estado <strong>Pendiente</strong> y se borrarán la fecha, el
                monto y la forma de pago registrados. Esta acción no se puede deshacer
                automáticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAnular}
                disabled={anulando}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {anulando ? "Anulando…" : "Sí, anular pago"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Navegación */}
        <div className="print:hidden flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/dashboard/cobranzas">
              <ArrowLeft className="size-4" />
              Volver a alquileres
            </Link>
          </Button>
        </div>

        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Contrato de alquiler</h1>
              {contratoEliminado ? (
                <Badge className="shrink-0 border-0 bg-red-600 text-white hover:bg-red-600/90">
                  Eliminado
                </Badge>
              ) : !contrato.is_active ? (
                <Badge variant="secondary" className="shrink-0">
                  Finalizado
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">Ficha y cuotas mensuales</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setEditarOpen(true)}
              disabled={contratoEliminado}
            >
              <Pencil className="size-4 shrink-0" aria-hidden />
              Editar contrato
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              disabled={contratoEliminado}
              onClick={() => setEliminarOpen(true)}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              Eliminar contrato
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMesPeriodoPago(null);
                setPagoOpen(true);
              }}
              disabled={!contrato.is_active || contratoEliminado}
            >
              Registrar pago
            </Button>
          </div>
        </div>

        {contratoEliminado ? (
          <div className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-50 print:hidden">
            Este contrato está <strong>eliminado</strong> (baja lógica). Solo conservamos la información
            para consulta histórica; no podés registrar cobros ni editarlo desde aquí.
          </div>
        ) : null}

        {/* Estadísticas de progreso */}
        {pagos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
            <div className="flex items-start gap-3 rounded-xl border bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-700">Pagadas</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-800">
                  {stats.pagados}
                  <span className="text-sm font-normal text-emerald-600">/{stats.total}</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-amber-50 p-4">
              <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-700">Pendientes</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-amber-800">
                  {stats.pendientes + stats.atrasados}
                  {stats.atrasados > 0 ? (
                    <span className="ml-1 text-xs font-medium text-destructive">
                      ({stats.atrasados} atras.)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-sky-50 p-4">
              <CircleDollarSign className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs font-medium text-sky-700">Total cobrado</p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-sky-800">
                  {precioFmt.format(stats.totalCobrado)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-stone-50 p-4">
              <TrendingUp className="mt-0.5 size-5 shrink-0 text-stone-500" aria-hidden />
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs font-medium text-stone-600">Progreso</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-stone-800">
                  {stats.progreso}
                  <span className="text-sm font-normal text-stone-500">%</span>
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${stats.progreso}%` }}
                    role="progressbar"
                    aria-valuenow={stats.progreso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Resumen del contrato */}
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

        {/* Tabla de cuotas */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cuotas mensuales</CardTitle>
            <CardDescription>
              <span className="mr-3 inline-flex items-center gap-1 text-xs">
                <span className="inline-block size-2 rounded-full bg-emerald-500" /> Pagado antes del día 10
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="inline-block size-2 rounded-full bg-red-500" /> Pagado después del día 10
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pagos.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No hay cuotas en el sistema para este contrato. Revisá fechas de inicio y vencimiento.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Fecha pago</TableHead>
                      <TableHead className="text-right">Monto pagado</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Estado</TableHead>
                      {/* Acciones — sin encabezado de texto */}
                      <TableHead className="w-[120px] print:hidden" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((p) => {
                      const color = puntualidadColor(p.mes_periodo, p.fecha_pago_realizado);
                      const esPagado = p.estado === "Pagado";
                      const esActualizacion = mesesActualizacion.has(p.mes_periodo);

                      return (
                        <TableRow
                          key={p.id}
                          className={esActualizacion ? "bg-yellow-50 dark:bg-yellow-950/20" : undefined}
                        >
                          <TableCell className="font-medium tabular-nums">
                            <span className="flex items-center gap-1.5">
                              {p.mes_periodo}
                              {esActualizacion && (
                                <span
                                  className="inline-flex items-center rounded-full bg-yellow-200 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800"
                                  title="Mes de actualización de precio"
                                >
                                  Actualización
                                </span>
                              )}
                              {esActualizacion && !contratoEliminado ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 text-orange-700 hover:bg-orange-100"
                                      onClick={() => void abrirEstimadoMes(p.mes_periodo)}
                                      disabled={estimadaLoading}
                                      aria-label="Ver actualización estimada"
                                    >
                                      <Calculator className="size-3.5" aria-hidden />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver actualización estimada</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </span>
                          </TableCell>

                          {/* Fecha con semáforo */}
                          <TableCell
                            className={
                              color === "green"
                                ? "tabular-nums font-medium text-emerald-700"
                                : color === "red"
                                  ? "tabular-nums font-medium text-red-600"
                                  : "tabular-nums"
                            }
                          >
                            {p.fecha_pago_realizado
                              ? fechaFmt.format(new Date(p.fecha_pago_realizado + "T12:00:00"))
                              : "—"}
                          </TableCell>

                          {/* Monto con semáforo */}
                          <TableCell
                            className={
                              color === "green"
                                ? "text-right tabular-nums font-medium text-emerald-700"
                                : color === "red"
                                  ? "text-right tabular-nums font-medium text-red-600"
                                  : "text-right tabular-nums"
                            }
                          >
                            <div className="flex flex-col items-end gap-0.5">
                              <span>
                                {p.monto_pagado != null
                                  ? precioFmt.format(Number(p.monto_pagado))
                                  : "—"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="max-w-[100px] truncate text-sm">
                            {p.forma_pago ?? "—"}
                          </TableCell>

                          <TableCell>{estadoBadge(p.estado)}</TableCell>

                          {/* Acciones con iconos + tooltips */}
                          <TableCell className="print:hidden">
                            <div className="flex items-center justify-end gap-1">
                              {contratoEliminado ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : esPagado ? (
                                <>
                                  {/* Editar pago */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-stone-500 hover:text-stone-800"
                                        onClick={() => {
                                          setPagoEditar(p);
                                          setEditarPagoOpen(true);
                                        }}
                                        aria-label="Editar pago"
                                      >
                                        <SquarePen className="size-4" aria-hidden />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar pago</TooltipContent>
                                  </Tooltip>

                                  {/* Anular pago */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-red-400 hover:bg-red-50 hover:text-red-600"
                                        onClick={() => setPagoAnularId(p.id)}
                                        aria-label="Anular pago"
                                      >
                                        <Trash2 className="size-4" aria-hidden />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Anular pago</TooltipContent>
                                  </Tooltip>

                                  {/* Imprimir recibo */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <ReciboPrintButton
                                          onPrint={() => solicitarImpresionRecibo(p)}
                                          iconOnly
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Imprimir recibo</TooltipContent>
                                  </Tooltip>
                                </>
                              ) : contrato.is_active ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs font-bold text-emerald-700 border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-600"
                                        onClick={() => {
                                          setMesPeriodoPago(p.mes_periodo);
                                          setPagoOpen(true);
                                        }}
                                        aria-label="Registrar pago"
                                      >
                                        +$
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Registrar pago</TooltipContent>
                                  </Tooltip>
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
    </TooltipProvider>
  );
}
