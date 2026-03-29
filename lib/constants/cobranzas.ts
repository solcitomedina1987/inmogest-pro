export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Depósito", "Otro"] as const;
export type FormaPago = (typeof FORMAS_PAGO)[number];
