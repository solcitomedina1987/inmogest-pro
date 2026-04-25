import { z } from "zod";
import { CONCEPTOS_PAGO_KEYS } from "@/lib/cobranzas/conceptos-pago";
import { IMPACTO_PAGO_VALUES } from "@/lib/cobranzas/detalle-pago";

const impactoSchema = z.enum(IMPACTO_PAGO_VALUES);

const conceptoExtraSchema = z.object({
  concepto: z.enum(CONCEPTOS_PAGO_KEYS),
  monto: z.coerce.number().min(0, "El monto no puede ser negativo"),
  observaciones: z.string().optional(),
  impacto: impactoSchema,
});

export const registroPagoSchema = z
  .object({
    contrato_id: z.string().uuid("Seleccioná un contrato válido."),
    mes_periodo: z.string().regex(/^\d{4}-\d{2}$/, "Período inválido (YYYY-MM)"),
    fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    forma_pago: z.enum(["Efectivo", "Transferencia", "Depósito", "Otro"]),
    /** Monto imputado a alquiler del período. */
    monto_alquiler: z.coerce.number().min(0, "El alquiler no puede ser negativo"),
    conceptos_extras: z.array(conceptoExtraSchema).default([]),
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const alq = Number(data.monto_alquiler) || 0;
    let suma = alq;
    for (const x of data.conceptos_extras) {
      const m = Number(x.monto) || 0;
      if (x.impacto === "propietario_resta") suma -= m;
      else suma += m;
    }
    if (suma <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El total a cobrar (haberes − deducciones + otros) debe ser mayor a cero.",
        path: ["monto_alquiler"],
      });
    }
  });

export type RegistroPagoValues = z.infer<typeof registroPagoSchema>;

export const editarPagoSchema = z
  .object({
    pago_id: z.string().uuid(),
    contrato_id: z.string().uuid(),
    fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    forma_pago: z.enum(["Efectivo", "Transferencia", "Depósito", "Otro"]),
    monto_alquiler: z.coerce.number().min(0, "El alquiler no puede ser negativo"),
    conceptos_extras: z.array(conceptoExtraSchema).default([]),
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const alq = Number(data.monto_alquiler) || 0;
    let suma = alq;
    for (const x of data.conceptos_extras) {
      const m = Number(x.monto) || 0;
      if (x.impacto === "propietario_resta") suma -= m;
      else suma += m;
    }
    if (suma <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El total a cobrar debe ser mayor a cero.",
        path: ["monto_alquiler"],
      });
    }
  });

export type EditarPagoValues = z.infer<typeof editarPagoSchema>;
