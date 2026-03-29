import type { TipoCliente } from "@/lib/constants/clientes";

export type ClienteListRow = {
  id: string;
  nombre_completo: string;
  dni: number;
  domicilio_real: string;
  tipo_cliente: TipoCliente;
  telefono: string;
  email: string | null;
  fecha_nacimiento: string | null;
  notas: string | null;
  is_active: boolean;
};
