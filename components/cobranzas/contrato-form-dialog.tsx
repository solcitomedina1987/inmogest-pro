"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { createContratoCobranza } from "@/app/actions/cobranzas";
import {
  contratoCobranzaSchema,
  type ContratoCobranzaFormValues,
} from "@/lib/validations/contrato-cobranza";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

export type SelectOption = { id: string; label: string };

function defaultVencimientoDesdeInicio(fechaInicio: string): string {
  if (!fechaInicio) {
    return "";
  }
  const [y, m, d] = fechaInicio.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setFullYear(t.getFullYear() + 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

const defaults: ContratoCobranzaFormValues = {
  propiedad_id: "",
  cliente_id: "",
  locador_id: "",
  monto_mensual: 0,
  fecha_inicio: "",
  fecha_vencimiento: "",
  dia_limite_pago: 10,
  meses_actualizacion: 6,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedades: SelectOption[];
  clientes: SelectOption[];
  locadores: SelectOption[];
};

export function ContratoFormDialog({ open, onOpenChange, propiedades, clientes, locadores }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ContratoCobranzaFormValues>({
    resolver: zodResolver(contratoCobranzaSchema) as Resolver<ContratoCobranzaFormValues>,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setActionError(null);
    const hoy = new Date();
    const fi = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    form.reset({
      ...defaults,
      fecha_inicio: fi,
      fecha_vencimiento: defaultVencimientoDesdeInicio(fi),
    });
  }, [open, form]);

  const fechaInicio = form.watch("fecha_inicio");

  useEffect(() => {
    if (!fechaInicio || !open) {
      return;
    }
    const fv = form.getValues("fecha_vencimiento");
    if (!fv || fv < fechaInicio) {
      form.setValue("fecha_vencimiento", defaultVencimientoDesdeInicio(fechaInicio));
    }
  }, [fechaInicio, form, open]);

  function onSubmit(values: ContratoCobranzaFormValues) {
    setActionError(null);
    startTransition(async () => {
      const res = await createContratoCobranza(values);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo contrato de alquiler</DialogTitle>
          <DialogDescription>
            Vinculá propiedad, inquilino y locador. Se genera la cuota del mes actual en estado Pendiente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="propiedad_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propiedad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná propiedad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {propiedades.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
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
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inquilino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {clientes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
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
              name="locador_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locador</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná propietario (locador)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {locadores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
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
              name="monto_mensual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto mensual</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                      value={field.value === 0 ? "" : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha_vencimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimiento contrato</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dia_limite_pago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Día límite de cobro</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 10 : parseInt(e.target.value, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meses_actualizacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actualización cada (meses)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 6 : parseInt(e.target.value, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Crear contrato"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
