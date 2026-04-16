"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { registrarPagoContrato } from "@/app/actions/cobranzas";
import { CONCEPTOS_PAGO_ORDENADOS } from "@/lib/cobranzas/conceptos-pago";
import type { ConceptoPagoTipo } from "@/lib/cobranzas/conceptos-pago";
import { FORMAS_PAGO } from "@/lib/constants/cobranzas";
import {
  registroPagoSchema,
  type RegistroPagoValues,
} from "@/lib/validations/registro-pago";
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

type Props = {
  contratoId: string;
  montoSugerido: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  mesPeriodoPredefinido?: string | null;
};

const defaultExtra = (): { concepto: ConceptoPagoTipo; monto: number; observaciones: string } => ({
  concepto: "luz",
  monto: 0,
  observaciones: "",
});

export function RegistrarPagoDialog({
  contratoId,
  montoSugerido,
  open,
  onOpenChange,
  disabled = false,
  mesPeriodoPredefinido = null,
}: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<RegistroPagoValues>({
    resolver: zodResolver(registroPagoSchema) as Resolver<RegistroPagoValues>,
    defaultValues: {
      contrato_id: contratoId,
      mes_periodo: mesPeriodoPredefinido ?? "",
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

  const totalCobrar = useMemo(() => {
    const alq = Number(montoAlquiler) || 0;
    const sumEx = (extras ?? []).reduce((a, x) => a + (Number(x?.monto) || 0), 0);
    return alq + sumEx;
  }, [montoAlquiler, extras]);

  useEffect(() => {
    if (disabled && open) onOpenChange(false);
  }, [disabled, open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setActionError(null);
      form.reset({
        contrato_id: contratoId,
        mes_periodo: mesPeriodoPredefinido ?? "",
        fecha_pago: hoyISO(),
        forma_pago: "Transferencia",
        monto_alquiler: montoSugerido,
        conceptos_extras: [],
        observaciones: "",
      });
    }
  }, [open, contratoId, montoSugerido, mesPeriodoPredefinido, form]);

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
            El <strong>período contable</strong> queda fijo según la fila seleccionada. Sumá conceptos extra si
            corresponde; el total se calcula en vivo.
            {disabled ? (
              <span className="mt-2 block text-destructive">
                Este contrato está finalizado; no se pueden cargar pagos.
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("contrato_id")} />
            <input type="hidden" {...form.register("mes_periodo")} />

            {mesPeriodoPredefinido ? (
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
            ) : null}

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
                    <FormLabel>Alquiler (mes en curso)</FormLabel>
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
                  disabled={disabled}
                  onClick={() => append(defaultExtra())}
                >
                  <Plus className="size-4" aria-hidden />
                  Agregar
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin conceptos extra. Usá + para agregar filas.</p>
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

                      <FormField
                        control={form.control}
                        name={`conceptos_extras.${index}.observaciones`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Observaciones</FormLabel>
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

            <div className="rounded-md border-2 border-primary/30 bg-primary/5 px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Total a cobrar</p>
              <p className="text-lg font-bold tabular-nums">{precioFmt.format(totalCobrar)}</p>
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas generales</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional — constan en el recibo como nota del alquiler" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || disabled}>
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
