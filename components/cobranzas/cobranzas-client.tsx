"use client";

import { useMemo, useState, useTransition } from "react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calculator,
  CircleDollarSign,
  FileText,
  Loader2,
  Pencil,
  ScrollText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { eliminarContratoCobranza } from "@/app/actions/cobranzas";
import { contratoCobranzaVigente } from "@/lib/cobranzas/contrato-vigente";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import {
  estadoCobranzaContrato,
  mesPeriodoActual,
  mesPeriodoDesdeFecha,
  proximaFechaActualizacionAlquiler,
  type EstadoVisualCobranza,
  type PagoMesInfo,
} from "@/lib/cobranzas/estado-contrato";
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
  AlquileresContratosFiltros,
  type EstadoCobroFiltro,
  type PropietarioFiltroOption,
} from "@/components/cobranzas/alquileres-contratos-filtros";
import { EditarContratoDialog } from "@/components/cobranzas/editar-contrato-dialog";
import {
  ContratoFormDialog,
  type PropiedadSelectContrato,
  type SelectOption,
} from "@/components/cobranzas/contrato-form-dialog";
import { ActualizacionEstimadaDialog } from "@/components/shared/actualizacion-estimada-dialog";
import {
  RegistrarPagoDialog,
  type ContratoPagoSelectorOption,
} from "@/components/cobranzas/registrar-pago-dialog";
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
import { cn } from "@/lib/utils";
import { ExecutiveWidgetsGrid } from "@/components/dashboard/executive-widgets-grid";
import type { ExecutiveDashboardData } from "@/app/actions/dashboard-metrics";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formatea una fecha ISO a DD-MM-AA (ej: 05-05-26) */
function fmtFecha(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function toPagoMesInfo(p: PagoRow | undefined): PagoMesInfo {
  if (!p) return null;
  return {
    mes_periodo: p.mes_periodo,
    estado: p.estado,
    monto_pagado: p.monto_pagado,
    monto_esperado: p.monto_esperado,
  };
}

function formatProximaActualizacion(c: ContratoCobranzaRow): string {
  const d = proximaFechaActualizacionAlquiler(
    c.fecha_inicio,
    c.fecha_vencimiento,
    c.meses_actualizacion,
    c.ultima_actualizacion,
  );
  if (!d) return "—";
  const iso = d.toISOString().slice(0, 10);
  return fmtFecha(iso);
}

function contratoTieneEstimacionEnMesReferencia(
  c: ContratoCobranzaRow,
  mesReferencia: string,
): boolean {
  if (c.deleted_at) return false;
  if (!c.is_active) return false;
  const prox = proximaFechaActualizacionAlquiler(
    c.fecha_inicio,
    c.fecha_vencimiento,
    c.meses_actualizacion,
    c.ultima_actualizacion,
  );
  if (!prox) return false;
  const proxIso = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-${String(prox.getDate()).padStart(2, "0")}`;
  return mesPeriodoDesdeFecha(proxIso) === mesReferencia;
}

function filtraPorEstadoCobro(
  c: ContratoCobranzaRow,
  pago: PagoRow | undefined,
  filtro: EstadoCobroFiltro,
): boolean {
  if (filtro === "todos") return true;
  if (c.deleted_at || !c.is_active) return false;
  const visual = estadoCobranzaContrato(c.dia_limite_pago, toPagoMesInfo(pago));
  if (filtro === "pagado") return visual === "al_dia";
  if (filtro === "pendiente") return visual === "pendiente";
  if (filtro === "atrasado") return visual === "en_mora";
  return true;
}

function badgeEstado(visual: EstadoVisualCobranza) {
  if (visual === "al_dia") {
    return (
      <Badge variant="outline" className="border-emerald-600 text-emerald-800">
        Al día
      </Badge>
    );
  }
  if (visual === "en_mora") {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-destructive size-4 shrink-0" aria-hidden />
        <Badge variant="destructive">En mora</Badge>
      </div>
    );
  }
  return <Badge variant="secondary">Pendiente</Badge>;
}

type Props = {
  contratos: ContratoCobranzaRow[];
  pagosMesActual: PagoRow[];
  propiedades: PropiedadSelectContrato[];
  clientes: SelectOption[];
  propietariosFiltro: PropietarioFiltroOption[];
  /** YYYY-MM del mes calendario usado para destacar actualizaciones (ej. pagos del mes). */
  mesPeriodoReferencia: string;
  calculatorConfigured: boolean;
  widgetsData: ExecutiveDashboardData | null;
  incluirEliminados: boolean;
};

export function CobranzasClient({
  contratos,
  pagosMesActual,
  propiedades,
  clientes,
  propietariosFiltro,
  mesPeriodoReferencia,
  calculatorConfigured,
  widgetsData,
  incluirEliminados,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editarContrato, setEditarContrato] = useState<ContratoCobranzaRow | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [estimadaOpen, setEstimadaOpen] = useState(false);
  const [estimadaLoading, setEstimadaLoading] = useState(false);
  const [estimadaError, setEstimadaError] = useState<string | null>(null);
  const [estimadaMonto, setEstimadaMonto] = useState<number | null>(null);
  const [estimadaMesPeriodo, setEstimadaMesPeriodo] = useState<string | null>(null);
  const [eliminarId, setEliminarId] = useState<string | null>(null);
  const [eliminando, startEliminar] = useTransition();
  const [registrarPagoOpen, setRegistrarPagoOpen] = useState(false);
  const mes = mesPeriodoActual();

  const [direccionInput, setDireccionInput] = useState("");
  const [inquilinoInput, setInquilinoInput] = useState("");
  const [propietarioId, setPropietarioId] = useState("");
  const [estadoCobro, setEstadoCobro] = useState<EstadoCobroFiltro>("todos");

  const direccionDebounced = useDebouncedValue(direccionInput, 300);
  const inquilinoDebounced = useDebouncedValue(inquilinoInput, 300);

  function confirmarEliminar() {
    if (!eliminarId) return;
    startEliminar(async () => {
      const res = await eliminarContratoCobranza(eliminarId);
      setEliminarId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato eliminado (baja lógica).");
      router.refresh();
    });
  }

  async function solicitEstimada(c: ContratoCobranzaRow) {
    const prox = proximaFechaActualizacionAlquiler(
      c.fecha_inicio,
      c.fecha_vencimiento,
      c.meses_actualizacion,
      c.ultima_actualizacion,
    );
    if (!prox) {
      toast.error("No hay fecha de próxima actualización.");
      return;
    }
    const proxIso = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-${String(prox.getDate()).padStart(2, "0")}`;
    const month = mesPeriodoDesdeFecha(proxIso);
    setEstimadaMesPeriodo(month);
    setEstimadaOpen(true);
    setEstimadaMonto(null);
    setEstimadaError(null);
    setEstimadaLoading(true);
    try {
      const res = await fetch("/api/calculator/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(c.monto_mensual),
          date: c.fecha_inicio,
          months: Number(c.meses_actualizacion),
          rate: c.indice_actualizacion === "IPC" ? "ipc" : "icl",
          month,
        }),
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

  const pagosMap = useMemo(() => {
    const m = new Map<string, PagoRow>();
    for (const p of pagosMesActual) {
      if (p.mes_periodo === mes) {
        m.set(p.contrato_id, p);
      }
    }
    return m;
  }, [pagosMesActual, mes]);

  const contratosParaRegistrarPago = useMemo((): ContratoPagoSelectorOption[] => {
    const list = contratos
      .filter((c) => contratoCobranzaVigente(c))
      .map((c) => {
        const prop =
          (c.propiedad?.direccion?.trim() || c.propiedad?.nombre?.trim() || "Propiedad").trim() || "Propiedad";
        const inq = (c.inquilino?.nombre_completo ?? "—").trim() || "—";
        return {
          id: c.id,
          label: `${prop} · ${inq}`,
          monto_mensual: Number(c.monto_mensual),
        };
      });
    list.sort((a, b) => a.label.localeCompare(b.label, "es"));
    return list;
  }, [contratos]);

  const contratosFiltrados = useMemo(() => {
    const d = direccionDebounced.trim().toLowerCase();
    const inq = inquilinoDebounced.trim().toLowerCase();
    return contratos.filter((c) => {
      if (d) {
        const dir = (c.propiedad?.direccion ?? "").toLowerCase();
        if (!dir.includes(d)) return false;
      }
      if (inq) {
        const nombre = (c.inquilino?.nombre_completo ?? "").toLowerCase();
        if (!nombre.includes(inq)) return false;
      }
      if (propietarioId && c.locador_id !== propietarioId) return false;
      const pago = pagosMap.get(c.id);
      if (!filtraPorEstadoCobro(c, pago, estadoCobro)) return false;
      return true;
    });
  }, [contratos, direccionDebounced, inquilinoDebounced, propietarioId, estadoCobro, pagosMap]);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex max-w-full min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alquileres</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Contratos de alquiler y estado de cobro del mes <strong>{mes}</strong>. Los finalizados
            siguen listados para consulta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="default"
                  className="gap-2"
                  disabled={contratosParaRegistrarPago.length === 0}
                  onClick={() => setRegistrarPagoOpen(true)}
                >
                  <CircleDollarSign className="size-4" aria-hidden />
                  Registrar pago
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {contratosParaRegistrarPago.length === 0
                ? "No hay contratos vigentes para asociar el cobro."
                : "Registrar un pago eligiendo contrato y período."}
            </TooltipContent>
          </Tooltip>
          <Button type="button" className="gap-2" onClick={() => setOpen(true)}>
            <FileText className="size-4" aria-hidden />
            Nuevo contrato
          </Button>
        </div>
      </div>

      {widgetsData ? <ExecutiveWidgetsGrid data={widgetsData} /> : null}

      <AlquileresContratosFiltros
        direccion={direccionInput}
        onDireccionChange={setDireccionInput}
        inquilino={inquilinoInput}
        onInquilinoChange={setInquilinoInput}
        propietarioId={propietarioId}
        onPropietarioIdChange={setPropietarioId}
        propietarios={propietariosFiltro}
        estadoCobro={estadoCobro}
        onEstadoCobroChange={setEstadoCobro}
        incluirEliminados={incluirEliminados}
      />

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Contratos</CardTitle>
          <CardDescription>
            Contratos activos y finalizados. Si pasó el día límite de cobro y no hay pago registrado
            como Pagado en el mes, se marca <strong>En mora</strong> (solo contratos activos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay contratos registrados. Creá uno con el botón superior.
            </p>
          ) : contratosFiltrados.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No se encontraron cobranzas que coincidan con los filtros.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Próx. actualización</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto / mes</TableHead>
                    <TableHead>Estado cobro</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="w-[120px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.map((c) => {
                    const pago = pagosMap.get(c.id);
                    const visual = estadoCobranzaContrato(c.dia_limite_pago, toPagoMesInfo(pago));
                    const eliminado = c.deleted_at != null;
                    return (
                      <TableRow
                        key={c.id}
                        className={cn(
                          eliminado && "bg-red-50/90 text-red-950 dark:bg-red-950/30 dark:text-red-50",
                          !eliminado && !c.is_active && "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {c.propiedad?.nombre ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {c.inquilino?.nombre_completo ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          {fmtFecha(c.fecha_inicio)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          <div className="inline-flex max-w-full flex-wrap items-center gap-1">
                            <span>{formatProximaActualizacion(c)}</span>
                            {calculatorConfigured &&
                            contratoTieneEstimacionEnMesReferencia(c, mesPeriodoReferencia) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0 text-orange-700 hover:bg-orange-100"
                                    aria-label="Ver actualización estimada"
                                    onClick={() => void solicitEstimada(c)}
                                  >
                                    <Calculator className="size-3.5" aria-hidden />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver actualización estimada</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          {fmtFecha(c.fecha_vencimiento)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {precioFmt.format(Number(c.monto_mensual))}
                        </TableCell>
                        <TableCell>
                          {eliminado ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : c.is_active ? (
                            badgeEstado(visual)
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {eliminado ? (
                            <Badge className="border-0 bg-red-600 text-white hover:bg-red-600/90">
                              Eliminado
                            </Badge>
                          ) : c.is_active ? (
                            <Badge variant="outline" className="border-emerald-600/60 text-emerald-800">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Finalizado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    aria-label="Editar contrato"
                                    disabled={eliminado}
                                    onClick={() => setEditarContrato(c)}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Editar contrato</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label="Ver detalle del contrato"
                                  disabled={navigatingId === c.id}
                                  onClick={() => {
                                    setNavigatingId(c.id);
                                    router.push(`/dashboard/cobranzas/${c.id}`);
                                  }}
                                >
                                  {navigatingId === c.id ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden />
                                  ) : (
                                    <ScrollText className="size-4" aria-hidden />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    aria-label="Eliminar contrato"
                                    disabled={eliminado || eliminando}
                                    onClick={() => setEliminarId(c.id)}
                                  >
                                    <Trash2 className="size-4" aria-hidden />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar contrato</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!eliminarId}
        onOpenChange={(o) => { if (!o) setEliminarId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desactivará el contrato (<strong>is_active = false</strong>), se registrará la fecha y hora en{" "}
              <strong>deleted_at</strong> y dejará de mostrarse en el listado habitual. El historial de cuotas se
              conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(e) => {
                e.preventDefault();
                confirmarEliminar();
              }}
              disabled={eliminando}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ActualizacionEstimadaDialog
        open={estimadaOpen}
        onOpenChange={setEstimadaOpen}
        loading={estimadaLoading}
        error={estimadaError}
        monto={estimadaMonto}
        mesPeriodo={estimadaMesPeriodo}
      />

      <ContratoFormDialog open={open} onOpenChange={setOpen} propiedades={propiedades} clientes={clientes} />

      <RegistrarPagoDialog
        open={registrarPagoOpen}
        onOpenChange={setRegistrarPagoOpen}
        contratoIdInicial={null}
        contratosDisponibles={contratosParaRegistrarPago}
        montoSugerido={contratosParaRegistrarPago[0]?.monto_mensual ?? 0}
        disabled={contratosParaRegistrarPago.length === 0}
      />

      {editarContrato ? (
        <EditarContratoDialog
          open={!!editarContrato}
          onOpenChange={(o) => {
            if (!o) {
              setEditarContrato(null);
            }
          }}
          contrato={editarContrato}
        />
      ) : null}
    </div>
    </TooltipProvider>
  );
}
