import { z } from "zod";

/** Payload del formulario de edición (sin fecha_inicio: se valida en server contra el contrato guardado). */
export const updateContratoCobranzaSchema = z.object({
  contrato_id: z.string().uuid("Contrato inválido"),
  monto_mensual: z.coerce.number().positive("El monto debe ser mayor a 0"),
  dia_limite_pago: z.coerce.number().int().min(1).max(31),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento inválida"),
  meses_actualizacion: z.coerce.number().int().min(1).max(120),
  is_active: z.boolean(),
  actualizar_monto_mes_actual: z.boolean(),
});

export type UpdateContratoCobranzaFormValues = z.infer<typeof updateContratoCobranzaSchema>;
