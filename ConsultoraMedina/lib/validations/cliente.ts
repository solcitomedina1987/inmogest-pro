import { z } from "zod";
import { TIPO_CLIENTE_VALUES } from "@/lib/constants/clientes";

const telefonoE164Relajado = z
  .string()
  .min(8, "Teléfono demasiado corto")
  .regex(/^\+[1-9]\d{6,14}$/, "Usá prefijo internacional, ej: +54 11 1234-5678 sin espacios o con espacios eliminados");

/** Solo dígitos con prefijo + (E.164 simplificado). */
export function normalizarTelefonoCliente(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (!digits) {
    return "+";
  }
  return `+${digits}`;
}

export const clienteFormSchema = z.object({
  nombre_completo: z.string().min(2, "El nombre es obligatorio").max(200),
  dni: z
    .string()
    .min(1, "DNI obligatorio")
    .regex(/^\d+$/, "Solo números, sin puntos ni espacios")
    .refine((s) => s.length <= 12 && Number(s) > 0, "DNI inválido"),
  domicilio_real: z.string().min(3, "Domicilio obligatorio").max(500),
  tipo_cliente: z.enum(TIPO_CLIENTE_VALUES),
  telefono: z
    .string()
    .min(1, "Teléfono obligatorio")
    .transform((s) => normalizarTelefonoCliente(s))
    .pipe(telefonoE164Relajado),
  email: z.union([z.literal(""), z.string().email("Email inválido")]),
  fecha_nacimiento: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")]),
  notas: z.string().max(5000).optional(),
  /** Solo edición; en alta el servidor fuerza `true`. */
  is_active: z.boolean().optional().default(true),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export function toClienteInsertPayload(v: ClienteFormValues) {
  return {
    nombre_completo: v.nombre_completo.trim(),
    dni: v.dni,
    domicilio_real: v.domicilio_real.trim(),
    tipo_cliente: v.tipo_cliente,
    telefono: v.telefono,
    email: v.email === "" ? null : v.email.trim(),
    fecha_nacimiento: v.fecha_nacimiento === "" ? null : v.fecha_nacimiento,
    notas: v.notas?.trim() || null,
  };
}
