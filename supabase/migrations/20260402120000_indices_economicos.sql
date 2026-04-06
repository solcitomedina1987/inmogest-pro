-- ─────────────────────────────────────────────────────────────────────────────
-- Índices económicos (ICL / IPC) y aumentos sugeridos por contrato
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Caché de valores de índices obtenidos de APIs públicas
CREATE TABLE IF NOT EXISTS public.indices_economicos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT        NOT NULL CHECK (tipo IN ('ICL', 'IPC')),
  fecha       DATE        NOT NULL,          -- ICL: diario | IPC: primer día del mes
  valor       NUMERIC(20, 6) NOT NULL,
  fuente      TEXT        NOT NULL DEFAULT 'api', -- 'BCRA' | 'INDEC' | 'manual'
  es_estimado BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT indices_economicos_tipo_fecha_uq UNIQUE (tipo, fecha)
);

CREATE INDEX IF NOT EXISTS idx_indices_tipo_fecha ON public.indices_economicos (tipo, fecha DESC);

ALTER TABLE public.indices_economicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_indices_economicos" ON public.indices_economicos;
CREATE POLICY "staff_all_indices_economicos"
  ON public.indices_economicos FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 2. Aumentos pre-calculados por contrato y mes de actualización
CREATE TABLE IF NOT EXISTS public.aumentos_sugeridos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id       UUID        NOT NULL REFERENCES public.contratos_cobranza(id) ON DELETE CASCADE,
  mes_actualizacion TEXT        NOT NULL CHECK (mes_actualizacion ~ '^\d{4}-\d{2}$'),
  monto_actual      NUMERIC(14, 2) NOT NULL,
  monto_sugerido    NUMERIC(14, 2) NOT NULL,
  coeficiente       NUMERIC(12, 8) NOT NULL,
  indice_tipo       TEXT        NOT NULL CHECK (indice_tipo IN ('ICL', 'IPC')),
  indice_inicial    NUMERIC(20, 6),
  indice_final      NUMERIC(20, 6),
  es_estimado       BOOLEAN     NOT NULL DEFAULT false,
  calculado_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT aumentos_sugeridos_contrato_mes_uq UNIQUE (contrato_id, mes_actualizacion)
);

CREATE INDEX IF NOT EXISTS idx_aumentos_contrato ON public.aumentos_sugeridos (contrato_id);
CREATE INDEX IF NOT EXISTS idx_aumentos_mes      ON public.aumentos_sugeridos (mes_actualizacion);

ALTER TABLE public.aumentos_sugeridos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_aumentos_sugeridos" ON public.aumentos_sugeridos;
CREATE POLICY "staff_all_aumentos_sugeridos"
  ON public.aumentos_sugeridos FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
