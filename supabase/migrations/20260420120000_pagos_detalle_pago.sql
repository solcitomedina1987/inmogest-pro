-- Desglose multiconcepto del cobro (recibo detallado)
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS detalle_pago JSONB;

COMMENT ON COLUMN public.pagos.detalle_pago IS
  'JSON: alquiler + conceptos extras (v=1). NULL en pagos históricos sin desglose.';
