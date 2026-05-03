"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { registrarPagoContrato } from "@/app/actions/cobranzas";
import { listConceptosPagoActivos, type ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import { mesPeriodoActual } from "@/lib/cobranzas/estado-contrato";
import { totalRecaudadoInquilino, construirDetallePagoV2, totalRendirPropietarioDesdeDetalleV2 } from "@/lib/cobranzas/detalle-pago";
import { impactoDbToImpactoPago } from "@/lib/config-global/impacto-catalogo";
import { FORMAS_PAGO } from "@/lib/constants/cobranzas";
import { registroPagoSchema, type RegistroPagoValues } from "@/lib/validations/registro-pago";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

const precioFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const IMPACTO_ETIQUETA_DB: Record<string, string> = {
  "Suma al Propietario": "Suma al propietario",
  "Resta al Propietario": "Resta al propietario",
  Inmobiliaria: "Suma a inmobiliaria",
};

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMesPeriodo(mes: string): string {
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const [y, m] = mes.split("-");
  const nombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${nombres[Number(m) - 1]} ${y}`;
}

export type ContratoPagoSelectorOption = { id: string; label: string; monto_mensual: number };

type Props = {
  /** Si viene fijado (detalle de contrato), no se muestra selector de contrato. */
  contratoIdInicial: string | null;
  /** Contratos vigentes para el listado de Alquileres (solo si `contratoIdInicial` es null). */
  contratosDisponibles?: ContratoPagoSelectorOption[] | null;
  montoSugerido: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  mesPeriodoPredefinido?: string | null;
};

const defaultExtra = (firstConceptId: number): { concepto_pago_id: number; monto: number; observaciones: string } => ({
  concepto_pago_id: firstConceptId,
  monto: 0,
  observaciones: "",
});

export function RegistrarPagoDialog({
  contratoIdInicial,
  contratosDisponibles,
  montoSugerido,
  open,
  onOpenChange,
  disabled = false,
  mesPeriodoPredefinido = null,
}: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [conceptCatalog, setConceptCatalog] = useState<ConceptoPagoCatalogoRow[]>([]);

  const requiereSelectorContrato = Boolean(contratosDisponibles?.length && contratoIdInicial == null);

  const form = useForm<RegistroPagoValues>({
    resolver: zodResolver(registroPagoSchema) as Resolver<RegistroPagoValues>,
    defaultValues: {
      contrato_id: contratoIdInicial ?? (contratosDisponibles?.[0]?.id ?? ""),
      mes_periodo: mesPeriodoPredefinido ?? mesPeriodoActual(),
      fecha_pago: hoyISO(),
      forma_pago: "Transferencia",
      monto_alquiler: montoSugerido,
      conceptos_extras: [],
      observaciones: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conceptos_extras",
  });

  const montoAlquiler = form.watch("monto_alquiler");
  const extras = form.watch("conceptos_extras");
  const contratoIdWatch = form.watch("contrato_id");

  const catalogById = useMemo(() => new Map(conceptCatalog.map((r) => [r.id, r])), [conceptCatalog]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await listConceptosPagoActivos();
      if (cancelled) return;
      if (res.ok && res.data) setConceptCatalog(res.data);
      else setConceptCatalog([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const totalesLiquidacion = useMemo(() => {
    const resolvedExtras = (extras ?? [])
      .map((x) => {
        const row = catalogById.get(x.concepto_pago_id);
        if (!row) return null;
        return {
          concepto_pago_id: row.id,
          concepto_label: row.nombre,
          slug: row.slug,
          monto: Number(x.monto) || 0,
          observaciones: x.observaciones,
          impacto: impactoDbToImpactoPago(row.impacto),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    const d = construirDetallePagoV2({
      monto_alquiler: Number(montoAlquiler) || 0,
      extras: resolvedExtras,
    });
    return {
      totalCobrar: totalRecaudadoInquilino(d, 0),
      totalRendir: totalRendirPropietarioDesdeDetalleV2(d),
    };
  }, [montoAlquiler, extras, catalogById]);

  useEffect(() => {
    if (disabled && open) onOpenChange(false);
  }, [disabled, open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setActionError(null);
    const cid =
      contratoIdInicial ??
      (contratosDisponibles && contratosDisponibles.length > 0 ? contratosDisponibles[0].id : "");
    const cinfo = contratosDisponibles?.find((x) => x.id === cid);
    form.reset({
      contrato_id: cid,
      mes_periodo: mesPeriodoPredefinido ?? mesPeriodoActual(),
      fecha_pago: hoyISO(),
      forma_pago: "Transferencia",
      monto_alquiler: contratoIdInicial ? montoSugerido : (cinfo?.monto_mensual ?? montoSugerido),
      conceptos_extras: [],
      observaciones: "",
    });
  }, [open, contratoIdInicial, montoSugerido, mesPeriodoPredefinido, form, contratosDisponibles]);

  useEffect(() => {
    if (!open || !requiereSelectorContrato || !contratoIdWatch) return;
    const c = contratosDisponibles?.find((x) => x.id === contratoIdWatch);
    if (c) {
      form.setValue("monto_alquiler", c.monto_mensual);
    }
  }, [open, contratoIdWatch, contratosDisponibles, form, requiereSelectorContrato]);

  function onSubmit(values: RegistroPagoValues) {
    if (disabled) return;
    setActionError(null);
    startTransition(async () => {
      const res = await registrarPagoContrato(values);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-h-[min(92vh,880px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            El total a cobrar al inquilino suma alquiler y todos los conceptos; el total a rendir al propietario aplica
            suma al dueño − resta al dueño − suma a inmobiliaria.
            {disabled ? (
              <span className="mt-2 block text-destructive">
                Este contrato está finalizado; no se pueden cargar pagos.
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {requiereSelectorContrato ? (
              <FormField
                control={form.control}
                name="contrato_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato / Propiedad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar contrato vigente…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                        {(contratosDisponibles ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <input type="hidden" {...form.register("contrato_id")} />
            )}

            {mesPeriodoPredefinido ? (
              <>
                <input type="hidden" {...form.register("mes_periodo")} />
                <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Período contable
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums">
                    {formatMesPeriodo(mesPeriodoPredefinido)}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      ({mesPeriodoPredefinido}) — no editable
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <FormField
                control={form.control}
                name="mes_periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período a rendir (YYYY-MM)</FormLabel>
                    <FormControl>
                      <Input type="month" disabled={disabled} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="fecha_pago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de pago real</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forma_pago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                      {FORMAS_PAGO.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border bg-muted/30 p-3">
              <FormField
                control={form.control}
                name="monto_alquiler"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alquiler del período</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={disabled}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <FormLabel className="text-base">Conceptos adicionales</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={disabled || conceptCatalog.length === 0}
                  onClick={() => {
                    const first = conceptCatalog[0]?.id ?? 0;
                    append(defaultExtra(first));
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Agregar
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {conceptCatalog.length === 0
                    ? "No hay conceptos de pago configurados. Cargalos en ADMIN General → Conceptos de pago."
                    : "Sin conceptos extra. Usá + para agregar filas."}
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((f, index) => (
                    <div
                      key={f.id}
                      className="relative space-y-2 rounded-md border border-stone-200 bg-stone-50/80 p-3 pr-10"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground absolute top-2 right-2 size-8"
                        disabled={disabled}
                        onClick={() => remove(index)}
                        aria-label="Quitar concepto"
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.concepto_pago_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Concepto</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={field.value > 0 ? String(field.value) : undefined}
                              disabled={disabled}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccionar…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                                {conceptCatalog.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.monto`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Monto</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                disabled={disabled}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(() => {
                        const cid = form.watch(`conceptos_extras.${index}.concepto_pago_id`);
                        const row = catalogById.get(cid);
                        return (
                          <div className="rounded-md border border-dashed border-stone-200 bg-white/60 px-2 py-1.5">
                            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                              Impacto contable
                            </p>
                            <p className="text-xs font-medium text-stone-800">
                              {row ? IMPACTO_ETIQUETA_DB[row.impacto] ?? row.impacto : "Seleccioná un concepto"}
                            </p>
                          </div>
                        );
                      })()}

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.observaciones`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notas / observaciones</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. período 03/26" disabled={disabled} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border-2 border-primary/30 bg-primary/5 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a cobrar al inquilino</p>
                <p className="text-lg font-bold tabular-nums">{precioFmt.format(totalesLiquidacion.totalCobrar)}</p>
              </div>
              <div className="rounded-md border border-stone-300 bg-stone-50 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a rendir al propietario</p>
                <p className="text-lg font-bold tabular-nums text-stone-900">{precioFmt.format(totalesLiquidacion.totalRendir)}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas generales</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional — constan en el recibo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || disabled || (requiereSelectorContrato && !contratoIdWatch)}>
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Guardando…
                  </span>
                ) : (
                  "Guardar pago"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
