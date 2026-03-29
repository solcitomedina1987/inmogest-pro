-- -----------------------------------------------------------------------------
-- Personas unificadas: public.clientes (Propietario / Inquilino / Ambos).
-- Migra propietarios → clientes (mismos UUID), repunta FKs y elimina propietarios.
-- Idempotencia parcial: podés re-ejecutar DROP CONSTRAINT / ADD solo si falló a mitad.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cliente') THEN
    CREATE TYPE public.tipo_cliente AS ENUM ('Propietario', 'Inquilino', 'Ambos');
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'nombre'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'nombre_completo'
  ) THEN
    ALTER TABLE public.clientes RENAME COLUMN nombre TO nombre_completo;
  END IF;
END$$;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS nombre_completo TEXT;

UPDATE public.clientes
SET nombre_completo = COALESCE(NULLIF(trim(nombre_completo), ''), 'Sin nombre')
WHERE nombre_completo IS NULL OR trim(nombre_completo) = '';

-- dni: si era TEXT, pasar a BIGINT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'clientes' AND c.column_name = 'dni'
      AND c.data_type = 'text'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS dni_migr BIGINT;
    UPDATE public.clientes SET dni_migr = CASE
      WHEN dni IS NOT NULL AND trim(dni) ~ '^[0-9]+$' THEN trim(dni)::bigint
      ELSE NULL
    END;
    ALTER TABLE public.clientes DROP COLUMN dni;
    ALTER TABLE public.clientes RENAME COLUMN dni_migr TO dni;
  END IF;
END$$;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS dni BIGINT;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS domicilio_real TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_cliente public.tipo_cliente;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS notas TEXT;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
UPDATE public.clientes SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.clientes ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email TEXT;

-- domicilio_real desde domicilio legado si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'domicilio'
  ) THEN
    UPDATE public.clientes
    SET domicilio_real = COALESCE(
      NULLIF(trim(domicilio_real), ''),
      NULLIF(trim(domicilio), ''),
      'Sin domicilio'
    )
    WHERE domicilio_real IS NULL OR trim(domicilio_real) = '';
  ELSE
    UPDATE public.clientes
    SET domicilio_real = COALESCE(NULLIF(trim(domicilio_real), ''), 'Sin domicilio')
    WHERE domicilio_real IS NULL OR trim(domicilio_real) = '';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'contacto'
  ) THEN
    UPDATE public.clientes
    SET telefono = COALESCE(NULLIF(trim(telefono), ''), NULLIF(trim(contacto), ''), '+54 0')
    WHERE telefono IS NULL OR trim(telefono) = '';
  ELSE
    UPDATE public.clientes
    SET telefono = COALESCE(NULLIF(trim(telefono), ''), '+54 0')
    WHERE telefono IS NULL OR trim(telefono) = '';
  END IF;
END$$;

UPDATE public.clientes SET tipo_cliente = 'Inquilino'::public.tipo_cliente WHERE tipo_cliente IS NULL;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS n
  FROM public.clientes
  WHERE dni IS NULL OR dni = 0
)
UPDATE public.clientes c
SET dni = 27000000 + n
FROM numbered
WHERE c.id = numbered.id;

UPDATE public.clientes SET dni = 27000000 WHERE dni IS NULL;

ALTER TABLE public.clientes ALTER COLUMN nombre_completo SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN dni SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN domicilio_real SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN tipo_cliente SET NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN telefono SET NOT NULL;

COMMENT ON COLUMN public.clientes.is_active IS 'Baja lógica';
COMMENT ON COLUMN public.clientes.tipo_cliente IS 'Propietario | Inquilino | Ambos — filtra combos';

-- Copiar propietarios → clientes (UUID preservado)
DO $$
BEGIN
  IF to_regclass('public.propietarios') IS NOT NULL THEN
    INSERT INTO public.clientes (
      id,
      nombre_completo,
      dni,
      domicilio_real,
      tipo_cliente,
      telefono,
      email,
      fecha_nacimiento,
      notas,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      p.id,
      trim(p.nombre),
      COALESCE(
        CASE
          WHEN p.dni IS NOT NULL AND trim(p.dni::text) ~ '^[0-9]+$' THEN trim(p.dni::text)::bigint
          ELSE NULL
        END,
        28000000 + (ROW_NUMBER() OVER (ORDER BY p.created_at))::bigint
      ),
      COALESCE(NULLIF(trim(p.domicilio), ''), 'Sin domicilio'),
      'Propietario'::public.tipo_cliente,
      COALESCE(NULLIF(trim(p.telefono), ''), NULLIF(trim(p.contacto), ''), '+54 0'),
      NULLIF(trim(COALESCE(p.email::text, '')), ''),
      NULL,
      NULL,
      true,
      p.created_at,
      p.updated_at
    FROM public.propietarios p
    WHERE NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = p.id);
  END IF;
END$$;

-- Quitar FKs que apuntan a propietarios
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'propiedades'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%propietarios%'
  LOOP
    EXECUTE format('ALTER TABLE public.propiedades DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  IF to_regclass('public.contratos_cobranza') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'contratos_cobranza'
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid) LIKE '%propietarios%'
    LOOP
      EXECUTE format('ALTER TABLE public.contratos_cobranza DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
  END IF;

  IF to_regclass('public.contratos') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'contratos'
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid) LIKE '%propietarios%'
    LOOP
      EXECUTE format('ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'payments'
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid) LIKE '%propietarios%'
    LOOP
      EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
  END IF;
END$$;

ALTER TABLE public.propiedades DROP CONSTRAINT IF EXISTS propiedades_propietario_id_fkey;
ALTER TABLE public.propiedades
  ADD CONSTRAINT propiedades_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.clientes (id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF to_regclass('public.contratos_cobranza') IS NOT NULL THEN
    ALTER TABLE public.contratos_cobranza DROP CONSTRAINT IF EXISTS contratos_cobranza_locador_id_fkey;
    ALTER TABLE public.contratos_cobranza
      ADD CONSTRAINT contratos_cobranza_locador_id_fkey
      FOREIGN KEY (locador_id) REFERENCES public.clientes (id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.contratos') IS NOT NULL THEN
    ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_propietario_id_fkey;
    ALTER TABLE public.contratos
      ADD CONSTRAINT contratos_propietario_id_fkey
      FOREIGN KEY (propietario_id) REFERENCES public.clientes (id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_propietario_id_fkey;
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_propietario_id_fkey
      FOREIGN KEY (propietario_id) REFERENCES public.clientes (id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.propietarios') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_all_propietarios" ON public.propietarios;
  END IF;
END$$;

DROP TABLE IF EXISTS public.propietarios;

CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes (tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_is_active ON public.clientes (is_active);
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON public.clientes (dni);

ALTER TABLE public.clientes DROP COLUMN IF EXISTS domicilio;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS contacto;
