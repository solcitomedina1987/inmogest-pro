-- -----------------------------------------------------------------------------
-- Contratos de locación (documento legal + PDF) y bucket Storage contratos-pdf
-- Vinculación opcional a contratos_cobranza (cobranzas / cuotas).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades (id) ON DELETE RESTRICT,
  propietario_id UUID NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
  fecha_firma DATE NOT NULL,
  fecha_inicio_contrato DATE NOT NULL,
  fecha_fin_contrato DATE NOT NULL,
  valor_mensual NUMERIC(14, 2) NOT NULL,
  tipo_ajuste TEXT NOT NULL DEFAULT 'ICL',
  caracteristicas_propiedad TEXT NOT NULL DEFAULT '',
  datos_garantes TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE', 'VENCIDO', 'RESCINDIDO')),
  rescindido_at TIMESTAMPTZ,
  pdf_storage_path TEXT,
  contratos_cobranza_id UUID UNIQUE REFERENCES public.contratos_cobranza (id) ON DELETE SET NULL,
  dia_limite_pago INTEGER NOT NULL DEFAULT 10 CHECK (dia_limite_pago >= 1 AND dia_limite_pago <= 31),
  meses_actualizacion INTEGER NOT NULL DEFAULT 6 CHECK (meses_actualizacion >= 1),
  indice_actualizacion TEXT NOT NULL DEFAULT 'ICL' CHECK (indice_actualizacion IN ('ICL', 'IPC')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contratos_fechas_chk CHECK (fecha_fin_contrato >= fecha_inicio_contrato)
);

CREATE INDEX IF NOT EXISTS idx_contratos_propiedad ON public.contratos (propiedad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON public.contratos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cobranza ON public.contratos (contratos_cobranza_id);

DROP TRIGGER IF EXISTS tr_contratos_updated ON public.contratos;
CREATE TRIGGER tr_contratos_updated
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_contratos" ON public.contratos;
CREATE POLICY "staff_all_contratos"
  ON public.contratos
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMENT ON TABLE public.contratos IS 'Contrato de locación: datos legales, PDF en Storage y vínculo a cobranzas (contratos_cobranza).';

-- Bucket público para abrir el PDF en nueva pestaña (misma idea que propiedades)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-pdf', 'contratos-pdf', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "contratos_pdf_bucket_select_public" ON storage.objects;
DROP POLICY IF EXISTS "contratos_pdf_bucket_insert_staff" ON storage.objects;
DROP POLICY IF EXISTS "contratos_pdf_bucket_update_staff" ON storage.objects;
DROP POLICY IF EXISTS "contratos_pdf_bucket_delete_staff" ON storage.objects;

CREATE POLICY "contratos_pdf_bucket_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'contratos-pdf');

CREATE POLICY "contratos_pdf_bucket_insert_staff"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contratos-pdf'
    AND public.is_staff()
  );

CREATE POLICY "contratos_pdf_bucket_update_staff"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contratos-pdf'
    AND public.is_staff()
  )
  WITH CHECK (
    bucket_id = 'contratos-pdf'
    AND public.is_staff()
  );

CREATE POLICY "contratos_pdf_bucket_delete_staff"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contratos-pdf'
    AND public.is_staff()
  );
