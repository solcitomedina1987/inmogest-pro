import { z } from "zod";
import { ESTADO_PROPIEDAD_VALUES, TIPO_PROPIEDAD_VALUES } from "@/lib/constants/propiedades";

export const propiedadFormClientSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    direccion: z.string().min(1, "La dirección es obligatoria"),
    valor: z.coerce.number().positive("El valor debe ser mayor a 0"),
    tipo: z.enum(TIPO_PROPIEDAD_VALUES),
    estado: z.enum(ESTADO_PROPIEDAD_VALUES),
    propietario_id: z.string().min(1, "Seleccioná un propietario").uuid("Seleccioná un propietario"),
    cliente_id: z.string().optional(),
    dormitorios: z.coerce.number().int().min(0),
    banos: z.coerce.number().int().min(0),
    m2_totales: z.coerce.number().min(0),
    m2_cubiertos: z.coerce.number().min(0),
    ubicacion_texto: z.string().optional(),
  })
  .refine(
    (d) =>
      !d.cliente_id ||
      d.cliente_id === "none" ||
      z.string().uuid().safeParse(d.cliente_id).success,
    { path: ["cliente_id"], message: "Cliente inválido" },
  );

export type PropiedadFormClientValues = z.infer<typeof propiedadFormClientSchema>;

export function toPropiedadDbPayload(values: PropiedadFormClientValues) {
  return {
    nombre: values.nombre.trim(),
    direccion: values.direccion.trim(),
    valor: values.valor,
    tipo: values.tipo,
    estado: values.estado,
    propietario_id: values.propietario_id,
    cliente_id:
      !values.cliente_id || values.cliente_id === "none" ? null : values.cliente_id,
    dormitorios: values.dormitorios,
    banos: values.banos,
    m2_totales: values.m2_totales,
    m2_cubiertos: values.m2_cubiertos,
    ubicacion_texto: values.ubicacion_texto?.trim() || null,
  };
}

/** Validación desde FormData en Server Actions */
export function parsePropiedadFormData(formData: FormData) {
  const raw = {
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion"),
    valor: formData.get("valor"),
    tipo: formData.get("tipo"),
    estado: formData.get("estado"),
    propietario_id: formData.get("propietario_id"),
    cliente_id: (formData.get("cliente_id") as string) || "none",
    dormitorios: formData.get("dormitorios"),
    banos: formData.get("banos"),
    m2_totales: formData.get("m2_totales"),
    m2_cubiertos: formData.get("m2_cubiertos"),
    ubicacion_texto: formData.get("ubicacion_texto") || "",
  };
  return propiedadFormClientSchema.safeParse(raw);
}
