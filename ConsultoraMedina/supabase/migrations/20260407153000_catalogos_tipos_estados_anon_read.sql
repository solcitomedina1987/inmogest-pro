-- Lectura pública (anon) de catálogos activos: filtros del sitio sin sesión.
CREATE POLICY tipos_propiedad_select_anon
  ON public.tipos_propiedad FOR SELECT TO anon
  USING (deleted_at IS NULL);

CREATE POLICY estados_propiedad_select_anon
  ON public.estados_propiedad FOR SELECT TO anon
  USING (deleted_at IS NULL);
