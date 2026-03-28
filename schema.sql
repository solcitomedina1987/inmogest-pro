-- InmoGest Pro — Esquema relacional para Supabase (PostgreSQL)
-- Ejecutar en SQL Editor o vía migraciones. Ajustar políticas RLS según reglas de negocio.

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE public.rol_usuario AS ENUM ('admin', 'agente', 'cliente');
CREATE TYPE public.tipo_operacion AS ENUM ('Alquiler', 'Venta');
CREATE TYPE public.tipo_propiedad AS ENUM (
  'Casa',
  'Departamento',
  'Lote',
  'Local',
  'Otro'
);
CREATE TYPE public.estado_propiedad AS ENUM (
  'Disponible',
  'Reservado',
  'Vendido',
  'Alquilado'
);
CREATE TYPE public.estado_pago AS ENUM ('Pendiente', 'Pagado', 'Atrasado');

-- -----------------------------------------------------------------------------
-- perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  rol public.rol_usuario NOT NULL DEFAULT 'cliente',
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfiles_rol ON public.perfiles (rol);
CREATE INDEX idx_perfiles_email ON public.perfiles (email);

-- -----------------------------------------------------------------------------
-- propietarios y clientes
-- -----------------------------------------------------------------------------
CREATE TABLE public.propietarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  dni TEXT,
  domicilio TEXT,
  contacto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  dni TEXT,
  domicilio TEXT,
  contacto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- propiedades
-- -----------------------------------------------------------------------------
CREATE TABLE public.propiedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tipo_operacion public.tipo_operacion NOT NULL,
  tipo_propiedad public.tipo_propiedad NOT NULL,
  estado public.estado_propiedad NOT NULL DEFAULT 'Disponible',
  propietario_id UUID REFERENCES public.propietarios (id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_propiedades_estado ON public.propiedades (estado);
CREATE INDEX idx_propiedades_tipo_operacion ON public.propiedades (tipo_operacion);
CREATE INDEX idx_propiedades_propietario ON public.propiedades (propietario_id);
CREATE INDEX idx_propiedades_cliente ON public.propiedades (cliente_id);

-- -----------------------------------------------------------------------------
-- imágenes de propiedades
-- -----------------------------------------------------------------------------
CREATE TABLE public.propiedades_img (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades (id) ON DELETE CASCADE,
  url_imagen TEXT NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_propiedades_img_propiedad ON public.propiedades_img (propiedad_id);

-- -----------------------------------------------------------------------------
-- proveedores
-- -----------------------------------------------------------------------------
CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- plantillas y contratos
-- -----------------------------------------------------------------------------
CREATE TABLE public.contratos_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contenido_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades (id) ON DELETE RESTRICT,
  propietario_id UUID NOT NULL REFERENCES public.propietarios (id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES public.clientes (id) ON DELETE RESTRICT,
  contenido_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contratos_propiedad ON public.contratos (propiedad_id);

-- -----------------------------------------------------------------------------
-- cobranzas / pagos
-- -----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades (id) ON DELETE RESTRICT,
  propietario_id UUID REFERENCES public.propietarios (id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes (id) ON DELETE SET NULL,
  monto NUMERIC(14, 2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado public.estado_pago NOT NULL DEFAULT 'Pendiente',
  fecha_pago DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_propiedad ON public.payments (propiedad_id);
CREATE INDEX idx_payments_estado ON public.payments (estado);
CREATE INDEX idx_payments_vencimiento ON public.payments (fecha_vencimiento);

-- -----------------------------------------------------------------------------
-- Trigger updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_perfiles_updated
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_propietarios_updated
  BEFORE UPDATE ON public.propietarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_clientes_updated
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_propiedades_updated
  BEFORE UPDATE ON public.propiedades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_proveedores_updated
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_contratos_templates_updated
  BEFORE UPDATE ON public.contratos_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_contratos_updated
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Perfil automático al registrarse (Auth)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, rol, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'cliente',
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(COALESCE(NEW.email, 'usuario'), '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security (base; refinar por rol en fases siguientes)
-- -----------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades_img ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Lectura pública de propiedades e imágenes (catálogo). Ajustar si el listado debe ser solo autenticado.
CREATE POLICY "propiedades_select_public"
  ON public.propiedades FOR SELECT
  USING (true);

CREATE POLICY "propiedades_img_select_public"
  ON public.propiedades_img FOR SELECT
  USING (true);

-- Perfiles: cada usuario ve y actualiza el suyo
CREATE POLICY "perfiles_select_own"
  ON public.perfiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "perfiles_update_own"
  ON public.perfiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin: políticas amplias (requiere función helper)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

-- Agente y admin: acceso de escritura a datos operativos (simplificado)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'agente')
  );
$$;

CREATE POLICY "staff_all_propietarios"
  ON public.propietarios FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_clientes"
  ON public.clientes FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_propiedades_mutate"
  ON public.propiedades FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_propiedades_update"
  ON public.propiedades FOR UPDATE
  USING (public.is_staff());

CREATE POLICY "staff_all_propiedades_delete"
  ON public.propiedades FOR DELETE
  USING (public.is_staff());

CREATE POLICY "staff_all_propiedades_img"
  ON public.propiedades_img FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_proveedores"
  ON public.proveedores FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_contratos_templates"
  ON public.contratos_templates FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_contratos"
  ON public.contratos FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_payments"
  ON public.payments FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Solo admin puede insertar/actualizar rol en perfiles de otros (creación de usuarios vía Supabase Auth + service role o dashboard)
CREATE POLICY "admin_all_perfiles"
  ON public.perfiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.perfiles IS 'Perfil de usuario enlazado a auth.users';
COMMENT ON TABLE public.propiedades IS 'Inmuebles: venta o alquiler';
COMMENT ON TABLE public.payments IS 'Cobranzas y pagos asociados a propiedades';
