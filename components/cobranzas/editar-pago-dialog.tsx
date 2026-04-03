"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { editarPago } from "@/app/actions/cobranzas";
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

function formatMesPeriodo(mes: string): string {
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const [y, m] = mes.split("-");
  const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${nombres[Number(m) - 1]} ${y}`;
}

type Props = {
  pago: PagoRow | null;
  contratoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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
      monto_pagado: 0,
      observaciones: "",
    },
  });

  useEffect(() => {
    if (open && pago) {
      setActionError(null);
      form.reset({
        pago_id: pago.id,
        contrato_id: contratoId,
        fecha_pago: pago.fecha_pago_realizado ?? "",
        forma_pago: (pago.forma_pago as EditarPagoValues["forma_pago"]) ?? "Transferencia",
        monto_pagado: pago.monto_pagado != null ? Number(pago.monto_pagado) : 0,
        observaciones: pago.observaciones ?? "",
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar pago registrado</DialogTitle>
          <DialogDescription>
            Corregí la fecha real, monto o forma de pago del período{" "}
            <strong>{formatMesPeriodo(pago.mes_periodo)}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("pago_id")} />
            <input type="hidden" {...form.register("contrato_id")} />

            {/* Período — solo informativo, no editable */}
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
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
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

            <FormField
              control={form.control}
              name="monto_pagado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto pagado</FormLabel>
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
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas / observaciones</FormLabel>
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
