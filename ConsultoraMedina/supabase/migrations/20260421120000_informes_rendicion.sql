-- Histórico de informes de rendición a propietarios (snapshot inmutable)
CREATE TABLE IF NOT EXISTS public.informes_rendicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_cliente_id UUID NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
  mes_periodo TEXT NOT NULL,
  comision_porcentaje NUMERIC(6, 2) NOT NULL CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100),
  monto_total NUMERIC(14, 2) NOT NULL,
  neto_rendir NUMERIC(14, 2) NOT NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT informes_rendicion_mes_fmt_chk CHECK (mes_periodo ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS idx_informes_rendicion_propietario
  ON public.informes_rendicion (propietario_cliente_id);
CREATE INDEX IF NOT EXISTS idx_informes_rendicion_mes
  ON public.informes_rendicion (mes_periodo DESC);
CREATE INDEX IF NOT EXISTS idx_informes_rendicion_fecha
  ON public.informes_rendicion (fecha_generacion DESC);

DROP TRIGGER IF EXISTS tr_informes_rendicion_updated ON public.informes_rendicion;
CREATE TRIGGER tr_informes_rendicion_updated
  BEFORE UPDATE ON public.informes_rendicion
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.informes_rendicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_informes_rendicion" ON public.informes_rendicion;
CREATE POLICY "staff_all_informes_rendicion"
  ON public.informes_rendicion
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMENT ON TABLE public.informes_rendicion IS 'Informes de rendición mensual a propietarios (snapshot JSON en payload).';
