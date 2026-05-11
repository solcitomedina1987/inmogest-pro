"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { createVendor, updateVendor } from "@/app/actions/vendors";
import { PROFESIONES_VENDOR } from "@/lib/constants/vendors";
import { vendorCreateSchema } from "@/lib/validations/vendor";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VendorRow } from "@/components/vendors/types";

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

const vendorFormClientSchema = vendorCreateSchema.extend({
  id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof vendorFormClientSchema>;

const defaults: FormValues = {
  nombre_apellido: "",
  telefono: "",
  profesion: "Otro",
  notas: "",
  id: undefined,
  is_active: true,
};

function rowToForm(row: VendorRow): FormValues {
  return {
    nombre_apellido: row.nombre_apellido,
    telefono: row.telefono,
    profesion: row.profesion,
    notas: row.notas ?? "",
    id: row.id,
    is_active: row.is_active,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: VendorRow | null;
};

export function VendorFormDialog({ open, onOpenChange, editing }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(vendorFormClientSchema) as Resolver<FormValues>,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setActionError(null);
    if (editing) {
      form.reset(rowToForm(editing));
    } else {
      form.reset(defaults);
    }
  }, [open, editing, form]);

  function onSubmit(values: FormValues) {
    setActionError(null);
    startTransition(async () => {
      if (values.id) {
        const res = await updateVendor({
          id: values.id,
          nombre_apellido: values.nombre_apellido,
          telefono: values.telefono,
          profesion: values.profesion,
          notas: values.notas?.trim() ? values.notas : null,
          is_active: values.is_active ?? true,
        });
        if (!res.ok) {
          setActionError(res.error);
          return;
        }
      } else {
        const res = await createVendor({
          nombre_apellido: values.nombre_apellido,
          telefono: values.telefono,
          profesion: values.profesion,
          notas: values.notas?.trim() ? values.notas : null,
        });
        if (!res.ok) {
          setActionError(res.error);
          return;
        }
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const isEdit = Boolean(editing);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos del contacto. Podés reactivarlo o darlo de baja con el interruptor Activo."
              : "Alta en la agenda. El teléfono se puede usar para abrir WhatsApp desde el listado."}
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
              name="nombre_apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre y apellido</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono / WhatsApp</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" placeholder="+54 9 11 1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profesion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profesión</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {PROFESIONES_VENDOR.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Referencia, horarios, etc." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit ? (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        id="vendor-active"
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 shrink-0 rounded border shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="vendor-active" className="cursor-pointer font-medium">
                        Activo
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Desmarcá para dar de baja sin borrar el registro.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
