import type { ProfesionVendor } from "@/lib/constants/vendors";

export type VendorRow = {
  id: string;
  nombre_apellido: string;
  telefono: string;
  profesion: ProfesionVendor;
  is_active: boolean;
  notas: string | null;
};
