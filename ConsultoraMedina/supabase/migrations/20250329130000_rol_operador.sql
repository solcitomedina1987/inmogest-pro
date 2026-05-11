-- Rol operador para personal interno (mismo alcance operativo que agente en RLS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'rol_usuario'
      AND e.enumlabel = 'operador'
  ) THEN
    ALTER TYPE public.rol_usuario ADD VALUE 'operador';
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'agente', 'operador')
  );
$$;
