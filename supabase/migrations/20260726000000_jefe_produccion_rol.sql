-- ============================================================
-- MIGRACIÓN: Nuevo rol 'jefe_produccion'
--
-- Contexto: se incorpora el rol de jefe de producción, encargado de
-- recibir las órdenes de producción y documentar el proceso (cocción,
-- molienda, control de calidad) por materia prima.
--
-- IMPORTANTE: agregar un valor a un enum debe ir en su PROPIA migración
-- (transacción) — Postgres no permite usar el valor recién agregado en la
-- misma transacción que lo crea. Las políticas RLS y objetos que referencian
-- 'jefe_produccion' viven en 20260726010000_produccion_procesos.sql.
-- ============================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'jefe_produccion';
