import type { ImpactoPago } from "@/lib/cobranzas/detalle-pago";

export const IMPACTO_CATALOGO_DB_VALUES = [
  "Suma al Propietario",
  "Resta al Propietario",
  "Inmobiliaria",
] as const;

export type ImpactoCatalogoDb = (typeof IMPACTO_CATALOGO_DB_VALUES)[number];

export function esImpactoCatalogoDb(s: string): s is ImpactoCatalogoDb {
  return (IMPACTO_CATALOGO_DB_VALUES as readonly string[]).includes(s);
}

export function impactoDbToImpactoPago(s: string): ImpactoPago {
  if (s === "Suma al Propietario") return "propietario_suma";
  if (s === "Resta al Propietario") return "propietario_resta";
  if (s === "Inmobiliaria") return "inmobiliaria";
  return "propietario_suma";
}

export function impactoPagoToDb(i: ImpactoPago): ImpactoCatalogoDb {
  if (i === "propietario_resta") return "Resta al Propietario";
  if (i === "inmobiliaria") return "Inmobiliaria";
  return "Suma al Propietario";
}
