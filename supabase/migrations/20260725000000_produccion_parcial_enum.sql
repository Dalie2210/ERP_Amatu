-- ============================================================
-- MIGRACIÓN: Nuevo valor 'parcial' en estado_produccion
-- Debe aplicarse en su propia transacción antes de usarse en
-- funciones/columnas (requisito de Postgres para ALTER TYPE ... ADD VALUE).
-- ============================================================

ALTER TYPE estado_produccion ADD VALUE IF NOT EXISTS 'parcial';
