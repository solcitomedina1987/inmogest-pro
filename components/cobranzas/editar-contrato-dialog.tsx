"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { updateContract } from "@/app/actions/cobranzas";
import type { ContratoCobranzaRow } from "@/lib/cobranzas/types";
import {
  updateContratoCobranzaSchema,
  type UpdateContratoCobranzaFormValues,
} from "@/lib/validations/update-contrato-cobranza";
import { INDICES_ACTUALIZACION } from "@/lib/validations/contrato-cobranza";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  FormDescription,
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

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoCobranzaRow;
};

export function EditarContratoDialog({ open, onOpenChange, contrato }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const montoInicialRef = useRef(Number(contrato.monto_mensual));

  const form = useForm<UpdateContratoCobranzaFormValues>({
    resolver: zodResolver(updateContratoCobranzaSchema) as Resolver<UpdateContratoCobranzaFormValues>,
    defaultValues: {
      contrato_id: contrato.id,
      monto_mensual: Number(contrato.monto_mensual),
      dia_limite_pago: contrato.dia_limite_pago,
      fecha_vencimiento: contrato.fecha_vencimiento,
      meses_actualizacion: contrato.meses_actualizacion,
      indice_actualizacion: contrato.indice_actualizacion ?? "ICL",
      is_active: contrato.is_active,
      actualizar_monto_mes_actual: false,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setActionError(null);
    montoInicialRef.current = Number(contrato.monto_mensual);
    form.reset({
      contrato_id: contrato.id,
      monto_mensual: Number(contrato.monto_mensual),
      dia_limite_pago: contrato.dia_limite_pago,
      fecha_vencimiento: contrato.fecha_vencimiento,
      meses_actualizacion: contrato.meses_actualizacion,
      indice_actualizacion: contrato.indice_actualizacion ?? "ICL",
      is_active: contrato.is_active,
      actualizar_monto_mes_actual: false,
    });
  }, [open, contrato, form]);

  const montoWatch = form.watch("monto_mensual");
  const montoCambio =
    typeof montoWatch === "number" &&
    !Number.isNaN(montoWatch) &&
    Math.abs(montoWatch - montoInicialRef.current) > 0.005;

  function onSubmit(values: UpdateContratoCobranzaFormValues) {
    setActionError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        actualizar_monto_mes_actual: montoCambio ? values.actualizar_monto_mes_actual : false,
      };
      const res = await updateContract(payload);
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Cambios guardados correctamente.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar contrato</DialogTitle>
          <DialogDescription>
            Modificá condiciones del alquiler. La fecha de inicio no se puede cambiar desde aquí.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("contrato_id")} />
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="monto_mensual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto mensual</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        field.onChange(Number.isFinite(n) ? n : 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {montoCambio ? (
              <FormField
                control={form.control}
                name="actualizar_monto_mes_actual"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-md border border-border p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        id="actualizar-monto-mes"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="border-input text-primary focus-visible:ring-ring mt-1 size-4 rounded border shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="actualizar-monto-mes" className="cursor-pointer font-medium">
                        Incluir cuotas pendientes del mes actual
                      </FormLabel>
                      <FormDescription>
                        Si no marcás esta opción, el nuevo monto se aplicará solo a cuotas <strong>Pendientes</strong>{" "}
                        de meses <strong>posteriores</strong> al mes en curso. Si la marcás, también se actualizará el
                        monto esperado del mes actual (solo si la cuota sigue Pendiente).
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="dia_limite_pago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Día límite de pago</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        field.onChange(Number.isFinite(n) ? n : 1);
                      }}
                    />
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
                  <FormLabel>Fecha de vencimiento del contrato</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>Frecuencia de actualización (meses)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        field.onChange(Number.isFinite(n) ? n : 1);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Cada cuántos meses se revisa el valor del alquiler.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="indice_actualizacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Índice de actualización</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                      {INDICES_ACTUALIZACION.map((idx) => (
                        <SelectItem key={idx} value={idx}>
                          {idx === "ICL"
                            ? "ICL — Índice de Contratos de Locación (oficial)"
                            : "IPC — Índice de Precios al Consumidor"}
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
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado del contrato</FormLabel>
                  <Select
                    value={field.value ? "activo" : "finalizado"}
                    onValueChange={(v) => field.onChange(v === "activo")}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Un contrato finalizado deja de contar en listados de cobranzas activas y en el widget de atención
                    inmediata del panel.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
