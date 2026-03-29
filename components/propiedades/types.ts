import type { TipoCliente } from "@/lib/constants/clientes";

export type PersonaOption = {
  id: string;
  nombre_completo: string;
  dni: number;
  tipo_cliente: TipoCliente;
  email?: string | null;
  telefono?: string | null;
};

export type PropiedadListRow = {
  id: string;
  nombre: string;
  valor: number;
  tipo: string;
  estado: string;
  direccion: string;
  dormitorios: number;
  banos: number;
  m2_totales: number;
  m2_cubiertos: number;
  ubicacion_texto: string | null;
  propietario_id: string;
  cliente_id: string | null;
  /** Primera imagen (por orden) o `/img/casa-default.png` */
  imagen_principal: string;
  /** Contrato de cobranzas activo para esta propiedad (si existe). */
  contrato_cobranza_id: string | null;
};
