-- Limpieza del sistema legado de índices internos.
-- A partir de esta migración, los montos estimados se calculan únicamente vía API externa.

DROP TABLE IF EXISTS public.historico_indices;
DROP TABLE IF EXISTS public.aumentos_sugeridos;
DROP TABLE IF EXISTS public.indices_economicos;
