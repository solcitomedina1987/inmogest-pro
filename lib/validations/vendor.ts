import { z } from "zod";
import { PROFESIONES_VENDOR } from "@/lib/constants/vendors";

const profesionEnum = z.enum(PROFESIONES_VENDOR);

export const vendorCreateSchema = z.object({
  nombre_apellido: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  telefono: z.string().trim().min(1, "El teléfono es obligatorio").max(60),
  profesion: profesionEnum,
  notas: z.string().max(5000).optional().nullable(),
});

export const vendorUpdateSchema = vendorCreateSchema.extend({
  id: z.string().uuid("Identificador inválido"),
  is_active: z.boolean(),
});

export type VendorCreateValues = z.infer<typeof vendorCreateSchema>;
export type VendorUpdateValues = z.infer<typeof vendorUpdateSchema>;
