"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { actualizarContratoLocacion, crearContratoLocacion } from "@/app/actions/contratos-locacion";
import type { ContratoLocacionListRow } from "@/lib/contratos/types";
import {
  contratoLocacionFormSchema,
  type ContratoLocacionFormValues,
} from "@/lib/validations/contrato-locacion";
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

export type PropiedadContratoOption = {
  id: string;
  label: string;
  propietario_id: string;
};

export type ClienteSelectOption = { id: string; label: string };

const defaults: ContratoLocacionFormValues = {
  propiedad_id: "",
  propietario_id: "",
  cliente_id: "",
  fecha_firma: "",
  fecha_inicio_contrato: "",
  fecha_fin_contrato: "",
  valor_mensual: 0,
  tipo_ajuste: "ICL",
  caracteristicas_propiedad: "",
  datos_garantes: "",
  dia_limite_pago: 10,
  meses_actualizacion: 6,
};

function defaultFinDesdeInicio(fechaInicio: string): string {
  if (!fechaInicio) return "";
  const [y, m, d] = fechaInicio.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setFullYear(t.getFullYear() + 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function rowToValues(row: ContratoLocacionListRow): ContratoLocacionFormValues {
  return {
    propiedad_id: row.propiedad_id,
    propietario_id: row.propietario_id,
    cliente_id: row.cliente_id,
    fecha_firma: row.fecha_firma,
    fecha_inicio_contrato: row.fecha_inicio_contrato,
    fecha_fin_contrato: row.fecha_fin_contrato,
    valor_mensual: Number(row.valor_mensual),
    tipo_ajuste: row.tipo_ajuste,
    caracteristicas_propiedad: row.caracteristicas_propiedad ?? "",
    datos_garantes: row.datos_garantes ?? "",
    dia_limite_pago: row.dia_limite_pago ?? 10,
    meses_actualizacion: row.meses_actualizacion ?? 6,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ContratoLocacionListRow | null;
  propiedades: PropiedadContratoOption[];
  clientes: ClienteSelectOption[];
};

export function ContratoLocacionFormDialog({
  open,
  onOpenChange,
  editing,
  propiedades,
  clientes,
}: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rescindido = Boolean(editing?.rescindido_at);

  const form = useForm<ContratoLocacionFormValues>({
    resolver: zodResolver(contratoLocacionFormSchema) as Resolver<ContratoLocacionFormValues>,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    setActionError(null);
    if (editing) {
      form.reset(rowToValues(editing));
    } else {
      const hoy = new Date();
      const fi = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      form.reset({
        ...defaults,
        fecha_firma: fi,
        fecha_inicio_contrato: fi,
        fecha_fin_contrato: defaultFinDesdeInicio(fi),
      });
    }
  }, [open, editing, form]);

  const propiedadId = form.watch("propiedad_id");

  useEffect(() => {
    if (!open || rescindido) return;
    const p = propiedades.find((x) => x.id === propiedadId);
    if (p?.propietario_id) {
      form.setValue("propietario_id", p.propietario_id, { shouldValidate: true });
    }
  }, [open, propiedadId, propiedades, form, rescindido]);

  const fechaInicio = form.watch("fecha_inicio_contrato");

  useEffect(() => {
    if (!open || rescindido || editing) return;
    if (!fechaInicio) return;
    const fv = form.getValues("fecha_fin_contrato");
    if (!fv || fv < fechaInicio) {
      form.setValue("fecha_fin_contrato", defaultFinDesdeInicio(fechaInicio));
    }
  }, [fechaInicio, form, open, rescindido, editing]);

  function submitInner(values: ContratoLocacionFormValues, doPrint: boolean) {
    setActionError(null);
    startTransition(async () => {
      const res = editing
        ? await actualizarContratoLocacion(editing.id, values)
        : await crearContratoLocacion(values);
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Contrato actualizado." : "Contrato guardado.");
      onOpenChange(false);
      if (doPrint && res.pdfPublicUrl) {
        window.open(res.pdfPublicUrl, "_blank", "noopener,noreferrer");
      }
      if (doPrint) {
        router.push(`/dashboard/contratos/${res.id}/imprimir`);
      }
      router.refresh();
    });
  }

  function onSubmit(values: ContratoLocacionFormValues) {
    submitInner(values, false);
  }

  const readOnly = rescindido;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,880px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contrato" : "Nuevo contrato de locación"}</DialogTitle>
          <DialogDescription>
            Completá los datos del contrato. Se genera el PDF, se guarda en Storage y se vincula el contrato de
            cobranzas con las cuotas del período.
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
            {rescindido ? (
              <Alert>
                <AlertTitle>Contrato rescindido</AlertTitle>
                <AlertDescription>Los datos no pueden modificarse.</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="propiedad_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propiedad</FormLabel>
                  <Select
                    disabled={readOnly || !!editing}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
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
                  <Select disabled={readOnly || !!editing} onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná inquilino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {clientes.map((c) => (
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

            <input type="hidden" {...form.register("propietario_id")} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fecha_firma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de firma</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_mensual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor mensual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={readOnly}
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fecha_inicio_contrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio del contrato</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha_fin_contrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin del contrato</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tipo_ajuste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ajuste</FormLabel>
                  <Select disabled={readOnly} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      <SelectItem value="ICL">ICL (índice de contratos de locación)</SelectItem>
                      <SelectItem value="IPC">IPC</SelectItem>
                      <SelectItem value="Acordado entre partes">Acordado entre partes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        disabled={readOnly}
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
                        disabled={readOnly}
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

            <FormField
              control={form.control}
              name="caracteristicas_propiedad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Características del inmueble</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={readOnly}
                      rows={6}
                      className="min-h-[140px] resize-y"
                      placeholder="Superficie, ambientes, servicios, accesos…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="datos_garantes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datos de garantes</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={readOnly}
                      rows={5}
                      className="min-h-[120px] resize-y"
                      placeholder="Nombres, DNI, vínculo, montos de garantía…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              {!readOnly ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => form.handleSubmit((v) => submitInner(v, true))()}
                  >
                    {pending ? "Guardando…" : "Guardar e imprimir"}
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar"}
                  </Button>
                </>
              ) : null}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
