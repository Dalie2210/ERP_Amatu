-- ============================================================
-- MIGRACIÓN: ERP-DON-01/02/03/04 — Donaciones (schema)
-- ------------------------------------------------------------
-- Hasta ahora una donación se registraba como una venta normal: cobraba,
-- comisionaba y contaba para el numero_venta_cliente, empujando al cliente a
-- un tramo de comisión superior por producto que se regaló.
--
-- Una donación puede nacer de dos lugares distintos que comparten aprobación
-- y auditoría, así que viven en UNA sola tabla con FK opcional a cada origen,
-- en vez de duplicar columnas en `pedidos` y en `producto_lotes`:
--   · origen 'pedido'  — toggle "Es donación" al crear la orden (ERP-DON-01).
--   · origen 'lote_pt' — stock ya existente que se decide donar (ERP-DON-02).
--
-- La aprobación reusa tal cual el mecanismo del conteo (ERP-ADM-02 /
-- ERP-ADM-03): nace 'pendiente' y los efectos ocurren SOLO al aprobar.
--
-- Las RPCs van en 20260821020000_donaciones_rpc.sql, porque los valores de
-- enum que se agregan aquí no se pueden usar en la misma transacción.
-- ============================================================

CREATE TYPE estado_donacion AS ENUM ('pendiente', 'aprobada', 'rechazada');
CREATE TYPE origen_donacion AS ENUM ('pedido', 'lote_pt');

CREATE TABLE donaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen           origen_donacion NOT NULL,
  pedido_id        UUID UNIQUE REFERENCES pedidos(id),
  producto_lote_id UUID REFERENCES producto_lotes(id),
  destinatario     TEXT NOT NULL,
  motivo           TEXT NOT NULL,
  cantidad         NUMERIC,
  valor_comercial  NUMERIC NOT NULL DEFAULT 0,
  estado           estado_donacion NOT NULL DEFAULT 'pendiente',
  motivo_rechazo   TEXT,
  revisado_por     UUID REFERENCES users(id),
  revisado_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donaciones_origen_chk CHECK (
    (origen = 'pedido'  AND pedido_id IS NOT NULL AND producto_lote_id IS NULL) OR
    (origen = 'lote_pt' AND producto_lote_id IS NOT NULL AND pedido_id IS NULL)
  ),
  CONSTRAINT donaciones_cantidad_chk CHECK (cantidad IS NULL OR cantidad > 0)
);

CREATE INDEX idx_donaciones_estado ON donaciones(estado);
CREATE INDEX idx_donaciones_created_at ON donaciones(created_at DESC);

COMMENT ON TABLE donaciones IS
  'Producto entregado sin cobro (ERP-DON-01/02). Nace pendiente y solo surte efecto al aprobarla un admin (ERP-DON-03/ERP-ADM-03).';
COMMENT ON COLUMN donaciones.cantidad IS
  'Unidades donadas. Solo aplica al origen lote_pt; en el origen pedido las cantidades viven en detalle_pedido.';
COMMENT ON COLUMN donaciones.valor_comercial IS
  'Lo que habría costado el producto donado. No se cobra: existe para poder auditar en $ cuánto se donó por período (ERP-DON-04).';

ALTER TABLE donaciones ENABLE ROW LEVEL SECURITY;

-- Quien puede originar una donación puede verla; solo admin decide.
CREATE POLICY "donaciones_select" ON donaciones FOR SELECT TO authenticated
  USING (
    fn_get_user_role() IN ('admin'::user_role, 'logistica'::user_role, 'jefe_produccion'::user_role)
    OR created_by = auth.uid()
  );

-- Las transiciones de estado pasan exclusivamente por fn_aprobar_donacion /
-- fn_rechazar_donacion (SECURITY DEFINER, admin-only); la UPDATE directa
-- queda cerrada a admin como respaldo de esa regla, igual que en conteos.
CREATE POLICY "donaciones_update_admin" ON donaciones FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- Habilita el toast en tiempo real para el admin cuando entra una donación
-- pendiente (ver src/hooks/useDonacionNotifications.ts).
ALTER PUBLICATION supabase_realtime ADD TABLE donaciones;


-- Bandera en el pedido. Es redundante con donaciones.pedido_id pero
-- necesaria: los triggers de comisión y de numero_venta_cliente corren
-- AFTER/BEFORE INSERT ON pedidos, antes de que exista la fila de donaciones.
ALTER TABLE pedidos ADD COLUMN es_donacion BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN pedidos.es_donacion IS
  'Pedido entregado como donación (ERP-DON-01): total 0, sin comisión y sin contar para el numero_venta_cliente del cliente.';

CREATE INDEX idx_pedidos_es_donacion ON pedidos(es_donacion) WHERE es_donacion;


-- Valores nuevos de enums existentes. La tabla `notificaciones` se dejó
-- genérica a propósito para reusarse (ver 20260819030000_notificaciones.sql).
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'donacion_pendiente';
ALTER TYPE tipo_movimiento   ADD VALUE IF NOT EXISTS 'donacion';
