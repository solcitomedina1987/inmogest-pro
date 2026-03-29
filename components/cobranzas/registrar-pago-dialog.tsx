"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { registrarPagoContrato } from "@/app/actions/cobranzas";
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

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  contratoId: string;
  montoSugerido: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contratos finalizados no permiten registrar pagos. */
  disabled?: boolean;
};

export function RegistrarPagoDialog({
  contratoId,
  montoSugerido,
  open,
  onOpenChange,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<RegistroPagoValues>({
    resolver: zodResolver(registroPagoSchema) as Resolver<RegistroPagoValues>,
    defaultValues: {
      contrato_id: contratoId,
      fecha_pago: hoyISO(),
      forma_pago: "Transferencia",
      monto_pagado: montoSugerido,
      observaciones: "",
    },
  });

  useEffect(() => {
    if (disabled && open) {
      onOpenChange(false);
    }
  }, [disabled, open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setActionError(null);
      form.reset({
        contrato_id: contratoId,
        fecha_pago: hoyISO(),
        forma_pago: "Transferencia",
        monto_pagado: montoSugerido,
        observaciones: "",
      });
    }
  }, [open, contratoId, montoSugerido, form]);

  function onSubmit(values: RegistroPagoValues) {
    if (disabled) {
      return;
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago mensual</DialogTitle>
          <DialogDescription>
            El período se toma del mes de la fecha de pago. Si el monto cubre o supera lo esperado, el
            estado pasa a <strong>Pagado</strong>.
            {disabled ? (
              <span className="mt-2 block text-destructive">Este contrato está finalizado; no se pueden cargar pagos.</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("contrato_id")} />

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
                  <FormLabel>Fecha de pago</FormLabel>
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
                    <Textarea rows={3} placeholder="Opcional" {...field} />
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
                {pending ? "Guardando…" : "Guardar pago"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
