export const TIPO_CLIENTE_VALUES = ["Propietario", "Inquilino", "Ambos"] as const;

export type TipoCliente = (typeof TIPO_CLIENTE_VALUES)[number];
