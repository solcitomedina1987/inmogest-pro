-- -----------------------------------------------------------------------------
-- Catálogos globales: conceptos de pago, tipos y estados de propiedad.
-- Lectura para usuarios autenticados (filas activas); escritura solo admin (RLS).
-- -----------------------------------------------------------------------------

CREATE TABLE public.conceptos_pago (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  impacto VARCHAR(50) NOT NULL CHECK (
    impacto IN ('Suma al Propietario', 'Resta al Propietario', 'Inmobiliaria')
  ),
  icono VARCHAR(50) NOT NULL DEFAULT 'Circle',
  slug VARCHAR(64) UNIQUE NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conceptos_pago_deleted ON public.conceptos_pago (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_conceptos_pago_nombre_activo ON public.conceptos_pago (lower(nombre)) WHERE deleted_at IS NULL;

CREATE TABLE public.tipos_propiedad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tipos_propiedad_nombre_activo ON public.tipos_propiedad (lower(nombre)) WHERE deleted_at IS NULL;

CREATE TABLE public.estados_propiedad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_estados_propiedad_nombre_activo ON public.estados_propiedad (lower(nombre)) WHERE deleted_at IS NULL;

-- Datos iniciales (solicitud + compatibilidad con claves legacy en detalle_pago JSON)
INSERT INTO public.conceptos_pago (nombre, impacto, icono, slug) VALUES
  ('Alquiler', 'Suma al Propietario', 'Home', NULL),
  ('Comisión Inmobiliaria', 'Inmobiliaria', 'Percent', NULL),
  ('Depósito en Garantía', 'Suma al Propietario', 'ShieldCheck', 'deposito_garantia'),
  ('Albañilería', 'Resta al Propietario', 'Hammer', 'arreglos'),
  ('Gasista', 'Resta al Propietario', 'Flame', NULL),
  ('Plomero', 'Resta al Propietario', 'Droplets', NULL),
  ('Electricista', 'Resta al Propietario', 'Zap', NULL),
  ('Escribano', 'Resta al Propietario', 'PenTool', 'escribania'),
  ('Servicios Municipales', 'Resta al Propietario', 'Building', 'servicios_municipales'),
  ('Luz', 'Resta al Propietario', 'Lightbulb', 'luz'),
  ('Gas', 'Resta al Propietario', 'FlameKindling', 'gas'),
  ('Expensas', 'Resta al Propietario', 'Receipt', NULL),
  ('Compra de materiales', 'Suma al Propietario', 'Package', 'compra_materiales'),
  ('Honorarios inmobiliarios', 'Inmobiliaria', 'KeyRound', 'honorarios_inmobiliarios'),
  ('Honorarios técnicos (plomero/electricista)', 'Resta al Propietario', 'Zap', 'honorarios_tecnicos'),
  ('Intereses por mora', 'Suma al Propietario', 'ClockAlert', 'intereses_mora'),
  ('Otros Servicios', 'Suma al Propietario', 'Globe', 'otros_servicios'),
  ('Otros', 'Suma al Propietario', 'CirclePlus', 'otros');

INSERT INTO public.tipos_propiedad (nombre) VALUES
  ('Casa'), ('Departamento'), ('Lote'), ('Local'), ('Terreno'), ('Duplex'), ('Galpón'), ('Fabrica'), ('Otro');

INSERT INTO public.estados_propiedad (nombre) VALUES
  ('Alquiler'), ('Alquilada'), ('Venta'), ('Vendida'), ('Consultar'), ('No Disponible');

ALTER TABLE public.conceptos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_propiedad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_propiedad ENABLE ROW LEVEL SECURITY;

-- Lectura: filas activas para todos; admins ven también borradas (gestión).
CREATE POLICY conceptos_pago_select
  ON public.conceptos_pago FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY conceptos_pago_insert
  ON public.conceptos_pago FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY conceptos_pago_update
  ON public.conceptos_pago FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY tipos_propiedad_select
  ON public.tipos_propiedad FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY tipos_propiedad_insert
  ON public.tipos_propiedad FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY tipos_propiedad_update
  ON public.tipos_propiedad FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY estados_propiedad_select
  ON public.estados_propiedad FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY estados_propiedad_insert
  ON public.estados_propiedad FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

CREATE POLICY estados_propiedad_update
  ON public.estados_propiedad FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND COALESCE(p.is_active, true)
    )
  );

COMMENT ON TABLE public.conceptos_pago IS 'Catálogo de conceptos de cobro; extras en pagos usan concepto_pago_id + snapshot en JSON.';
COMMENT ON TABLE public.tipos_propiedad IS 'Catálogo de tipos de inmueble.';
COMMENT ON TABLE public.estados_propiedad IS 'Catálogo de estados comerciales de propiedad.';
