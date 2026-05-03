-- Baja lógica de informes de rendición (archivo / papelera)
ALTER TABLE public.informes_rendicion
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_informes_rendicion_active_mes
  ON public.informes_rendicion (mes_periodo DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.informes_rendicion.deleted_at IS 'Archivo lógico: informe oculto en listados por defecto; puede restaurarse.';
