-- ICL en indices_economicos: solo filas con fecha = primer día del mes (YYYY-MM-01).
-- Limpia datos históricos de carga diaria y aplica restricción.

DELETE FROM public.indices_economicos
WHERE tipo = 'ICL' AND EXTRACT(DAY FROM fecha) <> 1;

ALTER TABLE public.indices_economicos
  DROP CONSTRAINT IF EXISTS indices_economicos_icl_solo_primer_dia;

ALTER TABLE public.indices_economicos
  ADD CONSTRAINT indices_economicos_icl_solo_primer_dia
  CHECK (tipo <> 'ICL' OR EXTRACT(DAY FROM fecha) = 1);

COMMENT ON TABLE public.indices_economicos IS
  'Caché de índices: ICL un valor por mes (fecha siempre día 1); IPC mensual día 1.';
