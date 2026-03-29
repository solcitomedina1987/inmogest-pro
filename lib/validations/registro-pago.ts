import { z } from "zod";

export const registroPagoSchema = z.object({
  contrato_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  forma_pago: z.enum(["Efectivo", "Transferencia", "Depósito", "Otro"]),
  monto_pagado: z.coerce.number().min(0, "El monto no puede ser negativo"),
  observaciones: z.string().optional(),
});

export type RegistroPagoValues = z.infer<typeof registroPagoSchema>;
