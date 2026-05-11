-- Historial de índices ICL / IPC (fuente propia + caché local).
-- No depende de terceros tipo ArgentinaDatos; IPC vía datos.gob.ar, ICL vía snapshot scraping BCRA.

CREATE TABLE IF NOT EXISTS public.historico_indices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       TEXT        NOT NULL CHECK (tipo IN ('ICL', 'IPC')),
  fecha      DATE        NOT NULL,
  valor      NUMERIC(20, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT historico_indices_tipo_fecha_uq UNIQUE (tipo, fecha)
);

CREATE INDEX IF NOT EXISTS idx_historico_indices_tipo_fecha
  ON public.historico_indices (tipo, fecha DESC);

ALTER TABLE public.historico_indices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_historico_indices" ON public.historico_indices;
CREATE POLICY "staff_all_historico_indices"
  ON public.historico_indices FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Copia de respaldo desde la tabla anterior (si existía y hay datos)
INSERT INTO public.historico_indices (tipo, fecha, valor)
SELECT tipo, fecha, valor
FROM public.indices_economicos
ON CONFLICT (tipo, fecha) DO NOTHING;

COMMENT ON TABLE public.historico_indices IS 'ICL e IPC cacheados; IPC = variación mensual % (serie INVAR); ICL = índice nivel (snapshot mensual desde tabla BCRA).';
