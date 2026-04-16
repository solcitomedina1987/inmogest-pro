"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { editarPago } from "@/app/actions/cobranzas";
import { CONCEPTOS_PAGO_ORDENADOS } from "@/lib/cobranzas/conceptos-pago";
import type { ConceptoPagoTipo } from "@/lib/cobranzas/conceptos-pago";
import type { DetallePagoV1 } from "@/lib/cobranzas/detalle-pago";
import { FORMAS_PAGO } from "@/lib/constants/cobranzas";
import { editarPagoSchema, type EditarPagoValues } from "@/lib/validations/registro-pago";
import type { PagoRow } from "@/lib/cobranzas/types";
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

type Props = {
  pago: PagoRow | null;
  contratoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const defaultExtra = (): { concepto: ConceptoPagoTipo; monto: number; observaciones: string } => ({
  concepto: "luz",
  monto: 0,
  observaciones: "",
});

function valoresDesdePago(pago: PagoRow, contratoId: string): EditarPagoValues {
  const d = pago.detalle_pago as DetallePagoV1 | null | undefined;
  if (d && d.v === 1) {
    return {
      pago_id: pago.id,
      contrato_id: contratoId,
      fecha_pago: pago.fecha_pago_realizado ?? "",
      forma_pago: (pago.forma_pago as EditarPagoValues["forma_pago"]) ?? "Transferencia",
      monto_alquiler: d.monto_alquiler,
      conceptos_extras: d.extras.map((e) => ({
        concepto: e.concepto,
        monto: e.monto,
        observaciones: e.observaciones ?? "",
      })),
      observaciones: pago.observaciones ?? "",
    };
  }
  return {
    pago_id: pago.id,
    contrato_id: contratoId,
    fecha_pago: pago.fecha_pago_realizado ?? "",
    forma_pago: (pago.forma_pago as EditarPagoValues["forma_pago"]) ?? "Transferencia",
    monto_alquiler: pago.monto_pagado != null ? Number(pago.monto_pagado) : 0,
    conceptos_extras: [],
    observaciones: pago.observaciones ?? "",
  };
}

export function EditarPagoDialog({ pago, contratoId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<EditarPagoValues>({
    resolver: zodResolver(editarPagoSchema) as Resolver<EditarPagoValues>,
    defaultValues: {
      pago_id: "",
      contrato_id: contratoId,
      fecha_pago: "",
      forma_pago: "Transferencia",
      monto_alquiler: 0,
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
  const totalCobrar = useMemo(() => {
    const alq = Number(montoAlquiler) || 0;
    const sumEx = (extras ?? []).reduce((a, x) => a + (Number(x?.monto) || 0), 0);
    return alq + sumEx;
  }, [montoAlquiler, extras]);

  useEffect(() => {
    if (open && pago) {
      setActionError(null);
      form.reset(valoresDesdePago(pago, contratoId));
    }
  }, [open, pago, contratoId, form]);

  function onSubmit(values: EditarPagoValues) {
    setActionError(null);
    startTransition(async () => {
      const res = await editarPago(values);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  if (!pago) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-h-[min(92vh,880px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar pago registrado</DialogTitle>
          <DialogDescription>
            Período <strong>{formatMesPeriodo(pago.mes_periodo)}</strong>. Ajustá alquiler, conceptos extra y totales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("pago_id")} />
            <input type="hidden" {...form.register("contrato_id")} />

            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Período contable
              </p>
              <p className="mt-0.5 font-semibold">
                {formatMesPeriodo(pago.mes_periodo)}
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  ({pago.mes_periodo}) — no editable
                </span>
              </p>
            </div>

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
                    <FormLabel>Alquiler</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
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
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => append(defaultExtra())}>
                  <Plus className="size-4" aria-hidden />
                  Agregar
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin conceptos extra.</p>
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
                        onClick={() => remove(index)}
                        aria-label="Quitar concepto"
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.concepto`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Concepto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                                {CONCEPTOS_PAGO_ORDENADOS.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.emoji} {c.label}
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

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.observaciones`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Observaciones</FormLabel>
                            <FormControl>
                              <Input placeholder="Detalle" {...field} />
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

            <div className="rounded-md border-2 border-primary/30 bg-primary/5 px-3 py-2.5">
              <p className="text-sm font-semibold">Total cobrado</p>
              <p className="text-lg font-bold tabular-nums">{precioFmt.format(totalCobrar)}</p>
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas generales</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Guardando…
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
