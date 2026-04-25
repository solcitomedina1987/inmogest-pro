/** Contrato de cobranzas activo, no eliminado y aún vigente por fecha de fin. */
export function contratoCobranzaVigente(c: {
  is_active: boolean;
  deleted_at: string | null;
  fecha_vencimiento: string;
}): boolean {
  if (!c.is_active || c.deleted_at) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return c.fecha_vencimiento >= hoy;
}
