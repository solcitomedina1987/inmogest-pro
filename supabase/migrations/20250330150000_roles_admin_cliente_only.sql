-- Solo roles 'admin' y 'cliente'. Migra agente/operador → cliente y reemplaza el enum.
UPDATE public.perfiles
SET rol = 'cliente'::public.rol_usuario
WHERE rol::text IN ('agente', 'operador');

ALTER TABLE public.perfiles ALTER COLUMN rol DROP DEFAULT;

ALTER TABLE public.perfiles
  ALTER COLUMN rol TYPE text USING (rol::text);

DROP TYPE public.rol_usuario;

CREATE TYPE public.rol_usuario AS ENUM ('admin', 'cliente');

ALTER TABLE public.perfiles
  ALTER COLUMN rol TYPE public.rol_usuario USING (
    CASE
      WHEN rol = 'admin' THEN 'admin'::public.rol_usuario
      ELSE 'cliente'::public.rol_usuario
    END
  );

ALTER TABLE public.perfiles
  ALTER COLUMN rol SET DEFAULT 'cliente'::public.rol_usuario;

-- is_staff() alineado con personal con permisos de gestión (= solo admin).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'::public.rol_usuario
  );
$$;

-- Lectura de cobranzas para usuarios con rol cliente (panel de métricas en /dashboard).
DROP POLICY IF EXISTS "contratos_cobranza_select_cliente_resumen" ON public.contratos_cobranza;
CREATE POLICY "contratos_cobranza_select_cliente_resumen"
  ON public.contratos_cobranza FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'::public.rol_usuario
    )
  );

DROP POLICY IF EXISTS "pagos_select_cliente_resumen" ON public.pagos;
CREATE POLICY "pagos_select_cliente_resumen"
  ON public.pagos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'::public.rol_usuario
    )
  );
