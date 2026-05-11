-- -----------------------------------------------------------------------------
-- Agenda de proveedores: tabla public.vendors (contactos por profesión)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profesion_vendor') THEN
    CREATE TYPE public.profesion_vendor AS ENUM (
      'Electricista',
      'Plomero',
      'Pintor',
      'Gasista',
      'Escribano',
      'Abogado',
      'Contador',
      'Albañil',
      'Arquitecto',
      'Martillero',
      'Otro'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido TEXT NOT NULL,
  telefono TEXT NOT NULL,
  profesion public.profesion_vendor NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors (is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_profesion ON public.vendors (profesion);
CREATE INDEX IF NOT EXISTS idx_vendors_nombre ON public.vendors (nombre_apellido);

DROP TRIGGER IF EXISTS tr_vendors_updated ON public.vendors;
CREATE TRIGGER tr_vendors_updated
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_vendors" ON public.vendors;
CREATE POLICY "staff_all_vendors"
  ON public.vendors FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMENT ON TABLE public.vendors IS 'Agenda de proveedores / contactos (baja lógica con is_active)';
