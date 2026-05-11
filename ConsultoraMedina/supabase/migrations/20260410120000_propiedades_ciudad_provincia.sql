-- Ubicación administrativa para búsqueda y reporting
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS provincia text;

COMMENT ON COLUMN public.propiedades.ciudad IS 'Ciudad o localidad de la propiedad';
COMMENT ON COLUMN public.propiedades.provincia IS 'Provincia o región';
