"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Eye, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { ContratoCobranzaRow, PagoRow } from "@/lib/cobranzas/types";
import {
  estadoCobranzaContrato,
  filtrarProximasActualizaciones,
  mesPeriodoActual,
  proximaFechaActualizacionAlquiler,
  type EstadoVisualCobranza,
  type PagoMesInfo,
} from "@/lib/cobranzas/estado-contrato";
import { enviarRecordatorioWhatsApp } from "@/app/actions/whatsapp";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContratoFormDialog, type SelectOption } from "@/components/cobranzas/contrato-form-dialog";

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

function toPagoMesInfo(p: PagoRow | undefined): PagoMesInfo {
  if (!p) {
    return null;
  }
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
  return d ? fechaFmt.format(d) : "—";
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
  propiedades: SelectOption[];
  clientes: SelectOption[];
  locadores: SelectOption[];
};

export function CobranzasClient({
  contratos,
  pagosMesActual,
  propiedades,
  clientes,
  locadores,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [waLoadingId, setWaLoadingId] = useState<string | null>(null);
  const [, startWaTransition] = useTransition();
  const mes = mesPeriodoActual();

  const pagosMap = useMemo(() => {
    const m = new Map<string, PagoRow>();
    for (const p of pagosMesActual) {
      if (p.mes_periodo === mes) {
        m.set(p.contrato_id, p);
      }
    }
    return m;
  }, [pagosMesActual, mes]);

  const contratosActivos = useMemo(() => contratos.filter((c) => c.is_active), [contratos]);

  const proximas = useMemo(() => filtrarProximasActualizaciones(contratosActivos, 90), [contratosActivos]);

  function handleEnviarWA(contratoId: string) {
    setWaLoadingId(contratoId);
    startWaTransition(async () => {
      const res = await enviarRecordatorioWhatsApp(contratoId);
      setWaLoadingId(null);
      if (res.ok) {
        toast.success(res.mensaje);
      } else {
        toast.error(res.mensaje);
      }
    });
  }

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cobranzas y contratos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Contratos de alquiler y estado de cobro del mes <strong>{mes}</strong>. Los finalizados siguen listados
            para consulta.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Nuevo contrato
        </Button>
      </div>

      {proximas.length > 0 ? (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground size-5" />
              <CardTitle className="text-lg">Próximas actualizaciones</CardTitle>
            </div>
            <CardDescription>
              Contratos con revisión de alquiler en los próximos 90 días (según frecuencia y última
              actualización).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {proximas.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
                >
                  <span className="font-medium">{c.propiedad?.nombre ?? "Propiedad"}</span>
                  <span className="text-muted-foreground">
                    {fechaFmt.format(c.proxima_actualizacion)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Contratos</CardTitle>
          <CardDescription>
            Contratos activos y finalizados. Si pasó el día límite de cobro y no hay pago registrado como Pagado en
            el mes, se marca <strong>En mora</strong> (solo contratos activos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay contratos registrados. Creá uno con el botón superior.
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
                    <TableHead>Límite</TableHead>
                    <TableHead>Estado cobro</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="w-[96px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c) => {
                    const pago = pagosMap.get(c.id);
                    const visual = estadoCobranzaContrato(c.dia_limite_pago, toPagoMesInfo(pago));
                    return (
                      <TableRow key={c.id} className={!c.is_active ? "bg-muted/30 text-muted-foreground" : undefined}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {c.propiedad?.nombre ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{c.inquilino?.nombre_completo ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          {fechaFmt.format(new Date(c.fecha_inicio + "T12:00:00"))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          {formatProximaActualizacion(c)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-sm">
                          {fechaFmt.format(new Date(c.fecha_vencimiento + "T12:00:00"))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {precioFmt.format(Number(c.monto_mensual))}
                        </TableCell>
                        <TableCell className="tabular-nums">Día {c.dia_limite_pago}</TableCell>
                        <TableCell>
                          {c.is_active ? badgeEstado(visual) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {c.is_active ? (
                            <Badge variant="outline" className="border-emerald-600/60 text-emerald-800">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Finalizado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider delayDuration={300}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Botón WhatsApp */}
                              {c.is_active && (c.inquilino as { nombre_completo: string; telefono?: string | null } | null)?.telefono ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                      aria-label="Enviar recordatorio por WhatsApp"
                                      disabled={waLoadingId === c.id}
                                      onClick={() => handleEnviarWA(c.id)}
                                    >
                                      {waLoadingId === c.id ? (
                                        <Loader2 className="size-4 animate-spin" aria-hidden />
                                      ) : (
                                        <MessageCircle className="size-4" aria-hidden />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Enviar recordatorio por WhatsApp</TooltipContent>
                                </Tooltip>
                              ) : null}

                              {/* Botón Ver detalle */}
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
                                      <Eye className="size-4" aria-hidden />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalle del contrato</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
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

      <ContratoFormDialog
        open={open}
        onOpenChange={setOpen}
        propiedades={propiedades}
        clientes={clientes}
        locadores={locadores}
      />
    </div>
  );
}
