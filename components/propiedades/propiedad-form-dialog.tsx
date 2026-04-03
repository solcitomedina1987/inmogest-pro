"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { createProperty, updateProperty } from "@/app/actions/propiedades";
import { createClient } from "@/lib/supabase/client";
import {
  ESTADO_PROPIEDAD_VALUES,
  MAX_BYTES_PROPIEDAD_IMAGEN,
  MAX_IMAGENES_PROPIEDAD,
  TIPO_PROPIEDAD_VALUES,
} from "@/lib/constants/propiedades";
import {
  propiedadFormClientSchema,
  type PropiedadFormClientValues,
} from "@/lib/validations/propiedad";
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
import type { PersonaOption, PropiedadListRow } from "@/components/propiedades/types";

/** Select dentro de Dialog: z-index y popper para que el listado sea visible (Radix). */
const DIALOG_SELECT_CONTENT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

function personaSubtitle(p: PersonaOption) {
  const extra = p.email?.trim() || p.telefono?.trim() || `DNI ${p.dni}`;
  return extra ? ` · ${extra}` : "";
}

const defaults: PropiedadFormClientValues = {
  nombre: "",
  direccion: "",
  valor: 0,
  tipo: "Casa",
  estado: "Consultar",
  propietario_id: "",
  cliente_id: "none",
  dormitorios: 0,
  banos: 0,
  m2_totales: 0,
  m2_cubiertos: 0,
  ubicacion_texto: "",
};

function rowToFormValues(row: PropiedadListRow): PropiedadFormClientValues {
  return {
    nombre: row.nombre,
    direccion: row.direccion,
    valor: Number(row.valor),
    tipo: row.tipo as PropiedadFormClientValues["tipo"],
    estado: row.estado as PropiedadFormClientValues["estado"],
    propietario_id: row.propietario_id,
    cliente_id: row.cliente_id ?? "none",
    dormitorios: row.dormitorios,
    banos: row.banos,
    m2_totales: Number(row.m2_totales),
    m2_cubiertos: Number(row.m2_cubiertos),
    ubicacion_texto: row.ubicacion_texto ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PropiedadListRow | null;
  propietarios: PersonaOption[];
  clientes: PersonaOption[];
};

/** Sube archivos directamente al bucket de Supabase desde el navegador.
 *  Evita el límite de 4.5 MB de Vercel en serverless functions. */
async function uploadFilesToSupabase(
  files: File[],
  onProgress: (msg: string) => void,
): Promise<string[]> {
  const supabase = createClient();
  const ts = Date.now();
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(`Subiendo foto ${i + 1} de ${files.length}…`);

    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const uid = Math.random().toString(36).slice(2, 10);
    const path = `uploads/${ts}-${i}-${uid}.${ext}`;

    const { error } = await supabase.storage.from("propiedades").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw new Error(`No se pudo subir "${file.name}": ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from("propiedades").getPublicUrl(path);
    urls.push(publicUrl);
  }

  return urls;
}

export function PropiedadFormDialog({ open, onOpenChange, editing, propietarios, clientes }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PropiedadFormClientValues>({
    resolver: zodResolver(propiedadFormClientSchema) as Resolver<PropiedadFormClientValues>,
    defaultValues: defaults,
  });

  /** Limpia URLs de objeto para evitar memory leaks */
  const revokePreviews = useCallback((urls: string[]) => {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActionError(null);
    setPreviews((prev) => { revokePreviews(prev); return []; });
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (editing) {
      form.reset(rowToFormValues(editing));
    } else {
      form.reset(defaults);
    }
  }, [open, editing, form, revokePreviews]);

  /** Limpia URLs al desmontar el componente */
  useEffect(() => {
    return () => { revokePreviews(previews); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleImageInputChange(fileList: FileList | null) {
    try {
      const list = Array.from(fileList ?? []).filter((f) => f.size > 0);
      const rejectedSize = list.filter((f) => f.size > MAX_BYTES_PROPIEDAD_IMAGEN);
      if (rejectedSize.length > 0) {
        toast.error(
          `Cada imagen debe pesar como máximo 5 MB. Revisá: ${rejectedSize.map((f) => f.name).join(", ")}`,
        );
      }
      const accepted = list.filter((f) => f.size <= MAX_BYTES_PROPIEDAD_IMAGEN);
      const trimmed = accepted.slice(0, MAX_IMAGENES_PROPIEDAD);
      if (accepted.length > MAX_IMAGENES_PROPIEDAD) {
        toast.warning(`Solo se pueden subir hasta ${MAX_IMAGENES_PROPIEDAD} imágenes por propiedad.`);
      }

      const newPreviews = trimmed.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => { revokePreviews(prev); return newPreviews; });
      setFiles(trimmed);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      toast.error("Error al procesar las imágenes. Intentá de nuevo.");
      console.error("[PropiedadFormDialog] handleImageInputChange:", err);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  /** Las imágenes ya NO se envían como File a través del servidor.
   *  Se pasan como URLs (strings) luego de subirse directamente a Supabase Storage. */
  function buildFormData(values: PropiedadFormClientValues, imageUrls: string[] = []) {
    const fd = new FormData();
    fd.append("nombre", values.nombre);
    fd.append("direccion", values.direccion);
    fd.append("valor", String(values.valor));
    fd.append("tipo", values.tipo);
    fd.append("estado", values.estado);
    fd.append("propietario_id", values.propietario_id);
    fd.append("cliente_id", values.cliente_id && values.cliente_id !== "none" ? values.cliente_id : "none");
    fd.append("dormitorios", String(values.dormitorios));
    fd.append("banos", String(values.banos));
    fd.append("m2_totales", String(values.m2_totales));
    fd.append("m2_cubiertos", String(values.m2_cubiertos));
    fd.append("ubicacion_texto", values.ubicacion_texto ?? "");
    imageUrls.forEach((url) => fd.append("imageUrls", url));
    return fd;
  }

  function onSubmit(values: PropiedadFormClientValues) {
    setActionError(null);
    if (files.length > MAX_IMAGENES_PROPIEDAD) {
      setActionError(`Máximo ${MAX_IMAGENES_PROPIEDAD} imágenes.`);
      return;
    }

    startTransition(async () => {
      // Paso 1: subir archivos directo a Supabase desde el browser (evita límite 4.5 MB de Vercel)
      let imageUrls: string[] = [];
      if (files.length > 0) {
        try {
          imageUrls = await uploadFilesToSupabase(files, (msg) => setUploadMsg(msg));
        } catch (e) {
          setActionError(e instanceof Error ? e.message : "Error al subir imágenes.");
          setUploadMsg(null);
          return;
        }
        setUploadMsg(null);
      }

      // Paso 2: enviar solo URLs + datos del formulario al Server Action (sin bytes de archivo)
      const fd = buildFormData(values, imageUrls);
      if (editing) {
        fd.append("id", editing.id);
      }
      const res = editing ? await updateProperty(fd) : await createProperty(fd);

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
          <DialogTitle>{editing ? "Editar propiedad" : "Nueva propiedad"}</DialogTitle>
          <DialogDescription>
            Completá los datos. Las imágenes se suben al bucket <strong>propiedades</strong> en Supabase.
          </DialogDescription>
        </DialogHeader>

        {propietarios.length === 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Sin propietarios en el padrón</AlertTitle>
            <AlertDescription>
              No hay clientes activos con tipo <strong>Propietario</strong> o <strong>Ambos</strong>. Creá uno en{" "}
              <strong>Clientes</strong> o actualizá el tipo de una persona existente.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {pending ? (
              <div
                className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800"
                aria-live="polite"
              >
                {uploadMsg ? (
                  <UploadCloud className="text-muted-foreground size-4 shrink-0 animate-pulse" aria-hidden />
                ) : (
                  <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
                )}
                <span>{uploadMsg ?? "Guardando la propiedad…"}</span>
              </div>
            ) : null}
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Departamento centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle y número" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio / valor</FormLabel>
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
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                        {TIPO_PROPIEDAD_VALUES.map((t) => (
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
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                        {ESTADO_PROPIEDAD_VALUES.map((t) => (
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
            </div>

            <FormField
              control={form.control}
              name="propietario_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propietario</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná propietario" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      {propietarios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre_completo}
                          {personaSubtitle(p)}
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
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value && field.value !== "" ? field.value : "none"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className={DIALOG_SELECT_CONTENT_CLASS}>
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre_completo}
                          {personaSubtitle(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dormitorios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dormitorios</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="banos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Baños</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="m2_totales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>m² totales</FormLabel>
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
                name="m2_cubiertos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>m² cubiertos</FormLabel>
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

            <FormField
              control={form.control}
              name="ubicacion_texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación (texto)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Barrio, referencias…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="prop-images">Imágenes</Label>
              <Input
                ref={fileInputRef}
                id="prop-images"
                type="file"
                accept="image/*"
                multiple
                disabled={pending}
                onChange={(e) => handleImageInputChange(e.target.files)}
              />
              <p className="text-muted-foreground text-xs">
                Hasta {MAX_IMAGENES_PROPIEDAD} fotos, máx. 5 MB cada una. Las fotos se suben directamente a
                Supabase sin pasar por el servidor.
                {editing ? " Elegir archivos nuevos reemplaza todas las fotos actuales." : ""}
              </p>

              {previews.length > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                  {previews.length === 1 ? "1 foto lista" : `${previews.length} fotos listas`}
                  {" · se subirán al guardar"}
                </p>
              ) : null}
              {previews.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
                  {previews.map((src, i) => (
                    <div
                      key={src}
                      className="group relative aspect-video overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Vista previa ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Quitar imagen ${i + 1}`}
                        onClick={() => removeFile(i)}
                        className="absolute right-0.5 top-0.5 hidden size-5 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 group-hover:flex"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                      <span className="absolute bottom-0.5 left-1 text-[10px] font-medium text-white drop-shadow">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="min-w-[8.5rem]">
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    {uploadMsg ? (
                      <UploadCloud className="size-4 animate-pulse" aria-hidden />
                    ) : (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    {uploadMsg ? "Subiendo…" : "Guardando…"}
                  </span>
                ) : editing ? (
                  "Guardar cambios"
                ) : (
                  "Crear propiedad"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
