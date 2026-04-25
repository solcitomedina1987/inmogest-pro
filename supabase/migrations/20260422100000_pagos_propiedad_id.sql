-- Denormaliza propiedad en cada pago para consultas e historial
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS propiedad_id UUID REFERENCES public.propiedades (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_propiedad ON public.pagos (propiedad_id);

COMMENT ON COLUMN public.pagos.propiedad_id IS 'Copia de contratos_cobranza.propiedad_id al registrar/editar el pago.';

UPDATE public.pagos p
SET propiedad_id = c.propiedad_id
FROM public.contratos_cobranza c
WHERE p.contrato_id = c.id
  AND p.propiedad_id IS NULL;
