-- Serie ICL desde Arquiler API (RapidAPI), separada del ICL BCRA (tipo ICL).

ALTER TABLE public.historico_indices
  DROP CONSTRAINT IF EXISTS historico_indices_tipo_check;

ALTER TABLE public.historico_indices
  ADD CONSTRAINT historico_indices_tipo_check
  CHECK (tipo IN ('ICL', 'IPC', 'ICL_ARQUILER'));

COMMENT ON TABLE public.historico_indices IS
  'ICL e IPC cacheados; ICL = nivel BCRA (scraping); ICL_ARQUILER = serie Arquiler API (RapidAPI); IPC = variación mensual % (INVAR).';
