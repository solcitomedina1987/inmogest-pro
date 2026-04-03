import { z } from "zod";

export const registroPagoSchema = z.object({
  contrato_id: z.string().uuid(),
  /** Período contable YYYY-MM: determina a qué mes aplica el cobro (independiente de la fecha real). */
  mes_periodo: z.string().regex(/^\d{4}-\d{2}$/, "Período inválido (YYYY-MM)"),
  /** Fecha real en que se efectuó el pago (YYYY-MM-DD). */
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  forma_pago: z.enum(["Efectivo", "Transferencia", "Depósito", "Otro"]),
  monto_pagado: z.coerce.number().min(0, "El monto no puede ser negativo"),
  observaciones: z.string().optional(),
});

export type RegistroPagoValues = z.infer<typeof registroPagoSchema>;

export const editarPagoSchema = z.object({
  pago_id: z.string().uuid(),
  contrato_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  forma_pago: z.enum(["Efectivo", "Transferencia", "Depósito", "Otro"]),
  monto_pagado: z.coerce.number().min(0, "El monto no puede ser negativo"),
  observaciones: z.string().optional(),
});

export type EditarPagoValues = z.infer<typeof editarPagoSchema>;
