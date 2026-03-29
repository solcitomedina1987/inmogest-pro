export const PROFESIONES_VENDOR = [
  "Electricista",
  "Plomero",
  "Pintor",
  "Gasista",
  "Escribano",
  "Abogado",
  "Contador",
  "Albañil",
  "Arquitecto",
  "Martillero",
  "Otro",
] as const;

export type ProfesionVendor = (typeof PROFESIONES_VENDOR)[number];
