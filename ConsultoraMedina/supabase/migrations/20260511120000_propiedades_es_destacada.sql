-- Destacados en home público (máx. 3 vía aplicación).
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS es_destacada BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_propiedades_es_destacada
  ON public.propiedades (es_destacada)
  WHERE is_active = true AND es_destacada = true;

COMMENT ON COLUMN public.propiedades.es_destacada IS 'Incluida en carrusel de destacados del sitio público (hasta 3 simultáneas).';
