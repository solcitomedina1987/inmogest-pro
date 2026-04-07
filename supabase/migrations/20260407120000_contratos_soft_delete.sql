-- Baja lógica de contratos de alquiler (cobranzas)
ALTER TABLE public.contratos_cobranza
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_cobranza_deleted_at
  ON public.contratos_cobranza (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.contratos_cobranza.deleted_at IS 'Si no es NULL, el contrato fue eliminado (baja lógica) y no debe mostrarse en listados por defecto.';
