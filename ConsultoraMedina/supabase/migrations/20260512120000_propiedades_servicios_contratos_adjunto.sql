-- Datos de servicios (opcionales) en propiedades
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS nis_electricidad TEXT,
  ADD COLUMN IF NOT EXISTS cliente_gas TEXT,
  ADD COLUMN IF NOT EXISTS padron_municipal TEXT,
  ADD COLUMN IF NOT EXISTS cliente_internet TEXT;

COMMENT ON COLUMN public.propiedades.nis_electricidad IS 'NIS electricidad (opcional)';
COMMENT ON COLUMN public.propiedades.cliente_gas IS 'Nº cliente gas (opcional)';
COMMENT ON COLUMN public.propiedades.padron_municipal IS 'Padrón municipal (opcional)';
COMMENT ON COLUMN public.propiedades.cliente_internet IS 'Cliente / cuenta internet (opcional)';

-- Adjunto de contrato (Word u otro) cuando no hay PDF generado/subido como pdf_storage_path
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS adjunto_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS adjunto_mime TEXT;

COMMENT ON COLUMN public.contratos.adjunto_storage_path IS 'Archivo original en Storage (p. ej. .docx) si no hay PDF en pdf_storage_path';
COMMENT ON COLUMN public.contratos.adjunto_mime IS 'MIME del adjunto';
