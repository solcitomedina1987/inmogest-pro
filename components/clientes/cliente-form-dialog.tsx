"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { createCliente, updateCliente } from "@/app/actions/clientes";
import { TIPO_CLIENTE_VALUES } from "@/lib/constants/clientes";
import { clienteFormSchema, type ClienteFormValues } from "@/lib/validations/cliente";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ClienteListRow } from "@/components/clientes/types";

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

function emptyValues(): ClienteFormValues {
  return {
    nombre_completo: "",
    dni: "",
    domicilio_real: "",
    tipo_cliente: "Inquilino",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    notas: "",
  };
}

function fromRow(row: ClienteListRow): ClienteFormValues {
  return {
    nombre_completo: row.nombre_completo,
    dni: String(row.dni),
    domicilio_real: row.domicilio_real,
    tipo_cliente: row.tipo_cliente,
    telefono: row.telefono,
    email: row.email ?? "",
    fecha_nacimiento: row.fecha_nacimiento ?? "",
    notas: row.notas ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ClienteListRow | null;
};

export function ClienteFormDialog({ open, onOpenChange, editing }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema) as Resolver<ClienteFormValues>,
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setActionError(null);
    form.reset(editing ? fromRow(editing) : emptyValues());
  }, [open, editing, form]);

  function onSubmit(values: ClienteFormValues) {
    setActionError(null);
    startTransition(async () => {
      const res = editing
        ? await updateCliente({ id: editing.id, ...values })
        : await createCliente(values);
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Cliente actualizado." : "Cliente creado.");
      onOpenChange(false);
      router.refresh();
    });
  }

  const fechaNac = form.watch("fecha_nacimiento");
  const fechaDate =
    fechaNac && /^\d{4}-\d{2}-\d{2}$/.test(fechaNac) ? parseISO(fechaNac) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,760px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Persona unificada (propietario, inquilino o ambos). La baja es lógica desde el listado.
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
              name="nombre_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" autoComplete="off" placeholder="Solo números" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domicilio_real"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domicilio real</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                      {TIPO_CLIENTE_VALUES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (con prefijo)</FormLabel>
                  <FormControl>
                    <Input placeholder="+54 11 … (se guardan solo dígitos con +)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha_nacimiento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de nacimiento (opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value && /^\d{4}-\d{2}-\d{2}$/.test(field.value) ? (
                            format(parseISO(field.value), "dd/MM/yyyy", { locale: es })
                          ) : (
                            <span>Elegí una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto size-4 opacity-50" aria-hidden />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaDate}
                        onSelect={(d) => {
                          field.onChange(d ? format(d, "yyyy-MM-dd") : "");
                        }}
                        captionLayout="dropdown"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                      <div className="border-t p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => field.onChange("")}
                        >
                          Quitar fecha
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
