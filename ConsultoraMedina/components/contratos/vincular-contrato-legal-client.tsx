"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Loader2, PencilLine } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import {
  vincularContratoLegalArchivoCobranza,
  vincularContratoLegalWebCobranza,
} from "@/app/actions/contrato-legal-vinculo";
import {
  contratoLocacionFormSchema,
  type ContratoLocacionFormValues,
} from "@/lib/validations/contrato-locacion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";

const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

type Props = {
  cobranzaId: string;
  propiedadLabel: string;
  defaultsForm: ContratoLocacionFormValues;
};

type Modo = "elegir" | "archivo" | "web";

export function VincularContratoLegalClient({ cobranzaId, propiedadLabel, defaultsForm }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("elegir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ContratoLocacionFormValues>({
    resolver: zodResolver(contratoLocacionFormSchema) as Resolver<ContratoLocacionFormValues>,
    defaultValues: defaultsForm,
  });

  function enviarArchivo() {
    if (!archivo) {
      toast.error("Seleccioná un archivo.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("cobranza_id", cobranzaId);
      fd.append("archivo", archivo);
      const res = await vincularContratoLegalArchivoCobranza(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato vinculado correctamente.");
      router.push(`/dashboard/contratos/${res.id}`);
      router.refresh();
    });
  }

  function enviarWeb(values: ContratoLocacionFormValues) {
    startTransition(async () => {
      const res = await vincularContratoLegalWebCobranza(cobranzaId, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato generado y vinculado.");
      router.push(`/dashboard/contratos/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documento de contrato</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Alquiler: <span className="font-medium text-foreground">{propiedadLabel}</span>
        </p>
      </div>

      {modo === "elegir" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Subir archivo</CardTitle>
              <CardDescription>
                PDF (recomendado para móviles) o Word (.doc / .docx). El Word se guarda tal cual; para vista
                unificada en PDF exportá desde Word o subí un PDF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full gap-2" variant="secondary" onClick={() => setModo("archivo")}>
                <FileUp className="size-4" aria-hidden />
                Continuar con archivo
              </Button>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Generar contrato web</CardTitle>
              <CardDescription>
                Completá el formulario con plantilla dinámica y generación automática de PDF en Storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full gap-2" onClick={() => setModo("web")}>
                <PencilLine className="size-4" aria-hidden />
                Continuar con plantilla
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {modo === "archivo" ? (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Subir contrato firmado</CardTitle>
            <CardDescription>Archivo máximo 15 MB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contr-arch">Archivo</Label>
              <Input
                id="contr-arch"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={pending}
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setModo("elegir")}>
                Atrás
              </Button>
              <Button type="button" disabled={pending || !archivo} onClick={enviarArchivo}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar y vincular
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {modo === "web" ? (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Datos del contrato</CardTitle>
            <CardDescription>
              Propiedad, propietario e inquilino corresponden al contrato de cobranzas y no se pueden cambiar
              desde esta pantalla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(enviarWeb)} className="space-y-4">
                <Alert>
                  <AlertTitle>Identificación del alquiler</AlertTitle>
                  <AlertDescription className="text-sm">{propiedadLabel}</AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fecha_firma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fecha_inicio_contrato"
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
                </div>
                <FormField
                  control={form.control}
                  name="fecha_fin_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Canon mensual</FormLabel>
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
                  name="valor_deposito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depósito (0 = igual al canon)</FormLabel>
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
                  name="tipo_ajuste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de ajuste</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={DIALOG_SELECT_CONTENT_CLASS}>
                          <SelectItem value="ICL">ICL</SelectItem>
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
                        <FormLabel>Día límite pago</FormLabel>
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
                        <FormLabel>Meses actualización</FormLabel>
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
                <FormField
                  control={form.control}
                  name="caracteristicas_propiedad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Características</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
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
                      <FormLabel>Garantes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" disabled={pending} onClick={() => setModo("elegir")}>
                    Atrás
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Generar PDF y vincular
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-muted-foreground text-center text-xs">
        <Link href="/dashboard/contratos" className="underline">
          Ir al listado de contratos legales
        </Link>
      </p>
    </div>
  );
}
