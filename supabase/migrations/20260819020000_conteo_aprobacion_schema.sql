-- ============================================================
-- MIGRACIÓN: ERP-ADM-02 — Flujo de aprobación de conteos (schema)
-- ------------------------------------------------------------
-- Hasta ahora fn_registrar_conteo aplicaba los ajustes de inventario de
-- inmediato (ver 20260812000000_conteo_masivo.sql). Este ajuste de negocio
-- exige que el conteo quede pendiente hasta que un admin lo apruebe, para
-- poder cuestionar diferencias sospechosas antes de aceptarlas.
-- ============================================================

CREATE TYPE estado_conteo AS ENUM ('pendiente', 'aplicado', 'rechazado');

ALTER TABLE conteos_inventario
  ADD COLUMN estado         estado_conteo NOT NULL DEFAULT 'pendiente',
  ADD COLUMN motivo_rechazo TEXT,
  ADD COLUMN revisado_por   UUID REFERENCES users(id),
  ADD COLUMN revisado_at    TIMESTAMPTZ;

CREATE INDEX idx_conteos_inventario_estado ON conteos_inventario(estado);

-- Los conteos ya registrados (todos previos a este flujo) se consideran
-- aplicados: su stock ya fue ajustado por la versión anterior de la función.
UPDATE conteos_inventario SET estado = 'aplicado' WHERE estado = 'pendiente';

-- Los cambios de estado (aprobar/rechazar) deben pasar exclusivamente por
-- fn_aprobar_conteo / fn_rechazar_conteo (SECURITY DEFINER, admin-only) — se
-- cierra la UPDATE directa de tabla a solo admin como respaldo de esa regla.
DROP POLICY IF EXISTS "conteos_inventario_update" ON conteos_inventario;
CREATE POLICY "conteos_inventario_update" ON conteos_inventario FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- Habilita el toast en tiempo real para el admin cuando se registra un
-- conteo pendiente (ver src/hooks/useConteoNotifications.ts).
ALTER PUBLICATION supabase_realtime ADD TABLE conteos_inventario;
