-- ============================================================
-- MIGRACIÓN 2/2: Sprint 2A — Índices de performance
-- Correr DESPUÉS de la migración 01
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- ============================================================

-- insumo_lotes
CREATE INDEX idx_insumo_lotes_insumo_id   ON insumo_lotes (insumo_id);
CREATE INDEX idx_insumo_lotes_vencimiento ON insumo_lotes (fecha_vencimiento) WHERE fecha_vencimiento IS NOT NULL;

-- recetas
CREATE INDEX idx_recetas_producto_id ON recetas (producto_id);
CREATE INDEX idx_recetas_variante_id ON recetas (variante_id) WHERE variante_id IS NOT NULL;

-- receta_items
CREATE INDEX idx_receta_items_receta_id ON receta_items (receta_id);
CREATE INDEX idx_receta_items_insumo_id  ON receta_items (insumo_id);

-- producto_lotes
CREATE INDEX idx_producto_lotes_producto_id      ON producto_lotes (producto_id);
CREATE INDEX idx_producto_lotes_variante_id       ON producto_lotes (variante_id) WHERE variante_id IS NOT NULL;
CREATE INDEX idx_producto_lotes_orden_produccion  ON producto_lotes (orden_produccion_id) WHERE orden_produccion_id IS NOT NULL;
CREATE INDEX idx_producto_lotes_estado            ON producto_lotes (estado);
CREATE INDEX idx_producto_lotes_fefo              ON producto_lotes (fecha_vencimiento ASC NULLS LAST) WHERE cantidad_disponible > 0;

-- ingresos
CREATE INDEX idx_ingresos_fecha      ON ingresos (fecha);
CREATE INDEX idx_ingresos_created_by ON ingresos (created_by) WHERE created_by IS NOT NULL;

-- ingreso_items
CREATE INDEX idx_ingreso_items_ingreso_id ON ingreso_items (ingreso_id);
CREATE INDEX idx_ingreso_items_insumo_id  ON ingreso_items (insumo_id);

-- ordenes_produccion
CREATE INDEX idx_ordenes_produccion_producto_id      ON ordenes_produccion (producto_id);
CREATE INDEX idx_ordenes_produccion_variante_id      ON ordenes_produccion (variante_id) WHERE variante_id IS NOT NULL;
CREATE INDEX idx_ordenes_produccion_receta_id        ON ordenes_produccion (receta_id) WHERE receta_id IS NOT NULL;
CREATE INDEX idx_ordenes_produccion_estado           ON ordenes_produccion (estado);
CREATE INDEX idx_ordenes_produccion_producto_lote_id ON ordenes_produccion (producto_lote_id) WHERE producto_lote_id IS NOT NULL;
CREATE INDEX idx_ordenes_produccion_created_by       ON ordenes_produccion (created_by) WHERE created_by IS NOT NULL;

-- produccion_consumo
CREATE INDEX idx_produccion_consumo_orden_id    ON produccion_consumo (orden_produccion_id);
CREATE INDEX idx_produccion_consumo_insumo_lote ON produccion_consumo (insumo_lote_id);

-- remisiones
CREATE INDEX idx_remisiones_pedido_id  ON remisiones (pedido_id);
CREATE INDEX idx_remisiones_created_by ON remisiones (created_by) WHERE created_by IS NOT NULL;

-- remision_items
CREATE INDEX idx_remision_items_remision_id       ON remision_items (remision_id);
CREATE INDEX idx_remision_items_detalle_pedido_id ON remision_items (detalle_pedido_id);
CREATE INDEX idx_remision_items_producto_id       ON remision_items (producto_id);
CREATE INDEX idx_remision_items_variante_id       ON remision_items (variante_id) WHERE variante_id IS NOT NULL;
CREATE INDEX idx_remision_items_producto_lote_id  ON remision_items (producto_lote_id) WHERE producto_lote_id IS NOT NULL;

-- conteos_inventario
CREATE INDEX idx_conteos_inventario_fecha      ON conteos_inventario (fecha);
CREATE INDEX idx_conteos_inventario_categoria  ON conteos_inventario (categoria);
CREATE INDEX idx_conteos_inventario_created_by ON conteos_inventario (created_by) WHERE created_by IS NOT NULL;

-- conteo_items
CREATE INDEX idx_conteo_items_conteo_id   ON conteo_items (conteo_id);
CREATE INDEX idx_conteo_items_insumo_id   ON conteo_items (insumo_id)   WHERE insumo_id IS NOT NULL;
CREATE INDEX idx_conteo_items_producto_id ON conteo_items (producto_id) WHERE producto_id IS NOT NULL;
CREATE INDEX idx_conteo_items_variante_id ON conteo_items (variante_id) WHERE variante_id IS NOT NULL;

-- movimientos_inventario
CREATE INDEX idx_movimientos_insumo_id   ON movimientos_inventario (insumo_id)   WHERE insumo_id IS NOT NULL;
CREATE INDEX idx_movimientos_producto_id ON movimientos_inventario (producto_id) WHERE producto_id IS NOT NULL;
CREATE INDEX idx_movimientos_variante_id ON movimientos_inventario (variante_id) WHERE variante_id IS NOT NULL;
CREATE INDEX idx_movimientos_usuario_id  ON movimientos_inventario (usuario_id)  WHERE usuario_id IS NOT NULL;
CREATE INDEX idx_movimientos_tipo        ON movimientos_inventario (tipo);
CREATE INDEX idx_movimientos_created_at  ON movimientos_inventario (created_at);
CREATE INDEX idx_movimientos_lote_id     ON movimientos_inventario (lote_id)     WHERE lote_id IS NOT NULL;
