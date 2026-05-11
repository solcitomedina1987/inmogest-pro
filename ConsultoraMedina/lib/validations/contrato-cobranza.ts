import { z } from "zod";

export const INDICES_ACTUALIZACION = ["IPC", "ICL"] as const;

export const contratoCobranzaSchema = z
  .object({
    propiedad_id: z.string().uuid("Seleccioná una propiedad"),
    cliente_id: z.string().uuid("Seleccioná un inquilino"),
    locador_id: z.string().uuid("Seleccioná un locador"),
    monto_mensual: z.coerce.number().positive("El monto debe ser mayor a 0"),
    fecha_inicio: z.string().min(1, "Fecha de inicio requerida"),
    fecha_vencimiento: z.string().min(1, "Fecha de vencimiento requerida"),
    dia_limite_pago: z.coerce.number().int().min(1).max(31),
    meses_actualizacion: z.coerce.number().int().min(1).max(120),
    indice_actualizacion: z.enum(INDICES_ACTUALIZACION).default("ICL"),
  })
  .refine((d) => d.fecha_vencimiento >= d.fecha_inicio, {
    path: ["fecha_vencimiento"],
    message: "La fecha de vencimiento debe ser posterior o igual al inicio",
  });

export type ContratoCobranzaFormValues = z.infer<typeof contratoCobranzaSchema>;
