-- -----------------------------------------------------------------------------
-- InmoGest Pro — Migración CRUD Propiedades (Supabase SQL Editor o CLI)
-- Tabla principal: public.propiedades (equivalente a "properties").
-- -----------------------------------------------------------------------------

-- 1) Enum de estado comercial
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_propiedad_listado') THEN
    CREATE TYPE public.estado_propiedad_listado AS ENUM (
      'Alquiler',
      'Alquilada',
      'Venta',
      'Vendida',
      'Consultar',
      'No Disponible'
    );
  END IF;
END$$;

-- 2) propietarios / clientes
ALTER TABLE public.propietarios
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 3) Datos de prueba (2 propietarios, 2 clientes) — por email único lógico
INSERT INTO public.propietarios (nombre, email, telefono)
SELECT 'Laura Méndez', 'laura.mendez@example.com', '+54 11 4000-1001'
WHERE NOT EXISTS (SELECT 1 FROM public.propietarios WHERE email = 'laura.mendez@example.com');

INSERT INTO public.propietarios (nombre, email, telefono)
SELECT 'Roberto Silva', 'roberto.silva@example.com', '+54 11 4000-1002'
WHERE NOT EXISTS (SELECT 1 FROM public.propietarios WHERE email = 'roberto.silva@example.com');

INSERT INTO public.clientes (nombre, email, telefono)
SELECT 'Ana Gómez', 'ana.gomez@example.com', '+54 11 5000-2001'
WHERE NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'ana.gomez@example.com');

INSERT INTO public.clientes (nombre, email, telefono)
SELECT 'Carlos Pérez', 'carlos.perez@example.com', '+54 11 5000-2002'
WHERE NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'carlos.perez@example.com');

-- 4) propiedades — columnas nuevas
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS dormitorios INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS m2_totales NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS m2_cubiertos NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ubicacion_texto TEXT;

-- titulo → nombre
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'titulo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'nombre'
  ) THEN
    ALTER TABLE public.propiedades RENAME COLUMN titulo TO nombre;
  END IF;
END$$;

ALTER TABLE public.propiedades ADD COLUMN IF NOT EXISTS nombre TEXT;
UPDATE public.propiedades SET nombre = COALESCE(NULLIF(trim(nombre), ''), 'Sin nombre') WHERE nombre IS NULL OR trim(nombre) = '';

UPDATE public.propiedades
SET direccion = COALESCE(NULLIF(trim(direccion), ''), 'Sin dirección')
WHERE direccion IS NULL OR trim(direccion) = '';

ALTER TABLE public.propiedades ALTER COLUMN direccion SET NOT NULL;
ALTER TABLE public.propiedades ALTER COLUMN nombre SET NOT NULL;

-- tipo_propiedad → tipo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'tipo_propiedad'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'propiedades' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE public.propiedades RENAME COLUMN tipo_propiedad TO tipo;
  END IF;
END$$;

ALTER TABLE public.propiedades DROP COLUMN IF EXISTS tipo_operacion;

-- Migrar estado (enum antiguo → nuevo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'propiedades' AND c.column_name = 'estado'
      AND c.udt_name = 'estado_propiedad'
  ) THEN
    ALTER TABLE public.propiedades ADD COLUMN estado_nuevo public.estado_propiedad_listado;
    UPDATE public.propiedades SET estado_nuevo = CASE (estado::text)
      WHEN 'Disponible' THEN 'Consultar'::public.estado_propiedad_listado
      WHEN 'Reservado' THEN 'Consultar'::public.estado_propiedad_listado
      WHEN 'Vendido' THEN 'Vendida'::public.estado_propiedad_listado
      WHEN 'Alquilado' THEN 'Alquilada'::public.estado_propiedad_listado
      ELSE 'Consultar'::public.estado_propiedad_listado
    END;
    ALTER TABLE public.propiedades ALTER COLUMN estado_nuevo SET NOT NULL;
    ALTER TABLE public.propiedades DROP COLUMN estado;
    ALTER TABLE public.propiedades RENAME COLUMN estado_nuevo TO estado;
  END IF;
END$$;

ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS estado public.estado_propiedad_listado NOT NULL DEFAULT 'Consultar';

-- propietario obligatorio: asignar primer propietario si falta
UPDATE public.propiedades p
SET propietario_id = (SELECT id FROM public.propietarios ORDER BY created_at ASC LIMIT 1)
WHERE p.propietario_id IS NULL;

ALTER TABLE public.propiedades ALTER COLUMN propietario_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_propiedades_is_active ON public.propiedades (is_active);

COMMENT ON COLUMN public.propiedades.is_active IS 'Baja lógica';
COMMENT ON TABLE public.propiedades IS 'Inmuebles (properties)';
