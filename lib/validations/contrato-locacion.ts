import { z } from "zod";

export const contratoLocacionFormSchema = z
  .object({
    propiedad_id: z.string().uuid("Seleccioná una propiedad"),
    propietario_id: z.string().uuid("Propietario inválido"),
    cliente_id: z.string().uuid("Seleccioná un inquilino"),
    fecha_firma: z.string().min(1, "La fecha de firma es obligatoria"),
    fecha_inicio_contrato: z.string().min(1, "La fecha de inicio es obligatoria"),
    fecha_fin_contrato: z.string().min(1, "La fecha de fin es obligatoria"),
    valor_mensual: z.coerce.number().positive("El valor mensual debe ser mayor a 0"),
    /** Depósito en garantía; 0 o vacío = se usa el valor mensual en el contrato. */
    valor_deposito: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? 0 : val),
      z.coerce.number().min(0, "El depósito no puede ser negativo"),
    ),
    tipo_ajuste: z.string().min(1, "Indicá el tipo de ajuste"),
    caracteristicas_propiedad: z.string().default(""),
    datos_garantes: z.string().default(""),
    dia_limite_pago: z.coerce.number().int().min(1).max(31).default(10),
    meses_actualizacion: z.coerce.number().int().min(1).max(120).default(6),
  })
  .refine((d) => d.fecha_fin_contrato >= d.fecha_inicio_contrato, {
    path: ["fecha_fin_contrato"],
    message: "La fecha de fin debe ser posterior o igual al inicio",
  });

export type ContratoLocacionFormValues = z.infer<typeof contratoLocacionFormSchema>;
