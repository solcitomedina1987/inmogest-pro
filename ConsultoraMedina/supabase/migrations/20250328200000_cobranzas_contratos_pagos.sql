-- -----------------------------------------------------------------------------
-- Cobranzas: contratos de alquiler (tabla public.contratos_cobranza) y cuotas public.pagos
-- No modifica public.contratos (generador de documentos HTML).
-- Reutiliza enum public.estado_pago ('Pendiente', 'Pagado', 'Atrasado').
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contratos_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades (id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
  locador_id UUID NOT NULL REFERENCES public.propietarios (id) ON DELETE RESTRICT,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_mensual NUMERIC(14, 2) NOT NULL,
  dia_limite_pago INTEGER NOT NULL CHECK (dia_limite_pago >= 1 AND dia_limite_pago <= 31),
  meses_actualizacion INTEGER NOT NULL CHECK (meses_actualizacion >= 1),
  ultima_actualizacion DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contratos_cobranza_fechas_chk CHECK (fecha_vencimiento >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_contratos_cobranza_activo ON public.contratos_cobranza (is_active);
CREATE INDEX IF NOT EXISTS idx_contratos_cobranza_propiedad ON public.contratos_cobranza (propiedad_id);

CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos_cobranza (id) ON DELETE CASCADE,
  mes_periodo TEXT NOT NULL,
  monto_esperado NUMERIC(14, 2) NOT NULL,
  monto_pagado NUMERIC(14, 2),
  fecha_pago_realizado DATE,
  estado public.estado_pago NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pagos_mes_periodo_fmt_chk CHECK (mes_periodo ~ '^\d{4}-\d{2}$'),
  CONSTRAINT pagos_contrato_mes_unique UNIQUE (contrato_id, mes_periodo)
);

CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON public.pagos (contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mes ON public.pagos (mes_periodo);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON public.pagos (estado);

DROP TRIGGER IF EXISTS tr_contratos_cobranza_updated ON public.contratos_cobranza;
CREATE TRIGGER tr_contratos_cobranza_updated
  BEFORE UPDATE ON public.contratos_cobranza
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_pagos_updated ON public.pagos;
CREATE TRIGGER tr_pagos_updated
  BEFORE UPDATE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contratos_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_contratos_cobranza" ON public.contratos_cobranza;
CREATE POLICY "staff_all_contratos_cobranza"
  ON public.contratos_cobranza FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_all_pagos" ON public.pagos;
CREATE POLICY "staff_all_pagos"
  ON public.pagos FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMENT ON TABLE public.contratos_cobranza IS 'Contratos de alquiler para cobranzas (inquilino = cliente_id, locador = locador_id)';
COMMENT ON TABLE public.pagos IS 'Cuotas mensuales por contrato (mes_periodo YYYY-MM)';
