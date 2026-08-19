-- ============================================================
-- MIGRACIÓN: ERP-ADM-02 — Notificaciones in-app (genérica)
-- ------------------------------------------------------------
-- Tabla mínima para notificar a admins de conteos pendientes de aprobación.
-- destinatario_id NULL = broadcast a todos los admin (evita fan-out de una
-- fila por admin). leida_por es una simplificación deliberada para v1: el
-- badge de pendientes de conteo se calcula directamente contando
-- conteos_inventario en estado 'pendiente' (ver ConteoHistorialPanel), no
-- leyendo/marcando esta tabla — queda poblada para reutilización futura.
-- ============================================================

CREATE TYPE tipo_notificacion AS ENUM ('conteo_pendiente');

CREATE TABLE notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            tipo_notificacion NOT NULL,
  titulo          TEXT NOT NULL,
  mensaje         TEXT,
  entidad_tipo    TEXT,
  entidad_id      UUID,
  destinatario_id UUID REFERENCES users(id),
  leida_por       UUID[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_destinatario ON notificaciones(destinatario_id, created_at DESC);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificaciones_select" ON notificaciones FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid() OR (destinatario_id IS NULL AND fn_get_user_role() = 'admin'::user_role));
