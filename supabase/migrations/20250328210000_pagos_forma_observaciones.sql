-- Detalle de cobranza: forma de pago y observaciones por cuota
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS forma_pago TEXT,
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN public.pagos.forma_pago IS 'Efectivo, Transferencia, Depósito, Otro';
COMMENT ON COLUMN public.pagos.observaciones IS 'Notas del registro de pago';
