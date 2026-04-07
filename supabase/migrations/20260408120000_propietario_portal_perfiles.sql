-- Rol propietario (portal), bajas en perfiles, vínculo a clientes y flag portal propietario.

-- 1) Nuevo valor de enum
DO $enum$
BEGIN
  ALTER TYPE public.rol_usuario ADD VALUE 'propietario';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$enum$;

-- 2) Perfiles: baja lógica y vínculo opcional al registro en clientes (portal propietario)
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_cliente_id ON public.perfiles (cliente_id) WHERE cliente_id IS NOT NULL;

COMMENT ON COLUMN public.perfiles.cliente_id IS 'Si rol=propietario, ID del cliente (persona) dueño del portal.';
COMMENT ON COLUMN public.perfiles.is_active IS 'Si false, el usuario no puede iniciar sesión.';

-- 3) Clientes: portal propietario habilitado desde backoffice
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS portal_propietario_habilitado BOOLEAN NOT NULL DEFAULT false;

-- 4) is_staff: solo admin activo
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid()
      AND rol = 'admin'::public.rol_usuario
      AND is_active IS TRUE
  );
$$;
