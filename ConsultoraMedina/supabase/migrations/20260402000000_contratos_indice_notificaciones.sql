-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: índice de actualización en contratos + tabla de notificaciones
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Columna indice_actualizacion en contratos_cobranza
--    Valores: 'IPC' (Índice de Precios al Consumidor) | 'ICL' (Índice de Contratos de Locación)
--    Default ICL, que es el índice oficial en Argentina para alquileres de vivienda.
ALTER TABLE contratos_cobranza
  ADD COLUMN IF NOT EXISTS indice_actualizacion TEXT NOT NULL DEFAULT 'ICL'
  CHECK (indice_actualizacion IN ('IPC', 'ICL'));

-- 2. Tabla para registrar notificaciones enviadas (previene duplicados)
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id   UUID        NOT NULL REFERENCES contratos_cobranza(id) ON DELETE CASCADE,
  tipo          TEXT        NOT NULL,           -- 'actualizacion_alquiler'
  mes_periodo   TEXT        NOT NULL,           -- YYYY-MM en que se envió la alerta
  destinatario  TEXT,                           -- email o teléfono al que se envió
  canal         TEXT        NOT NULL DEFAULT 'email',  -- 'email' | 'whatsapp' | 'log'
  enviado_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Clave única: un contrato → un tipo → un mes → un canal (idempotente)
  CONSTRAINT notif_unica UNIQUE (contrato_id, tipo, mes_periodo, canal)
);

-- Índice para consultas rápidas por contrato
CREATE INDEX IF NOT EXISTS notificaciones_enviadas_contrato_idx
  ON notificaciones_enviadas (contrato_id, mes_periodo);

-- RLS: solo admins pueden leer/insertar
ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden leer notificaciones"
  ON notificaciones_enviadas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );

CREATE POLICY "Service role puede insertar notificaciones"
  ON notificaciones_enviadas FOR INSERT
  TO service_role
  WITH CHECK (true);
