-- Depósito en garantía para la plantilla del contrato ({valor_contrato})
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS valor_deposito NUMERIC(14, 2);

COMMENT ON COLUMN public.contratos.valor_deposito IS 'Depósito en garantía (texto legal valor_contrato). Si NULL, en la app se usa valor_mensual.';
