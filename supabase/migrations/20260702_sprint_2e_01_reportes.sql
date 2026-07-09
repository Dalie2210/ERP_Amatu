-- ============================================================
-- MIGRACIÓN: Sprint 2E — Reportes, trazabilidad, explosión de materiales
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ============================================================

-- 1. v_trazabilidad_lote (reemplaza la vista creada en 2A)
-- Punta a punta: insumo_lotes (recepción) -> produccion_consumo -> ordenes_produccion
-- -> producto_lotes (PT) -> remision_items -> remisiones -> pedidos -> clientes.
-- Union de dos ramas para no perder lotes sin consumo (insumo aún no usado) ni
-- lotes PT sin origen de producción (p.ej. ajustes manuales AJUSTE-...).
DROP VIEW IF EXISTS v_trazabilidad_lote;

CREATE OR REPLACE VIEW v_trazabilidad_lote WITH (security_invoker = on) AS
-- Rama 1: ancla en insumo_lotes, sigue hacia adelante hasta remisión/pedido
SELECT
  il.id                AS insumo_lote_id,
  il.codigo_lote        AS codigo_lote_insumo,
  il.insumo_id,
  ins.nombre            AS insumo_nombre,
  il.proveedor,
  il.fecha_ingreso,
  il.fecha_vencimiento  AS insumo_fecha_vencimiento,
  il.cantidad_inicial   AS insumo_cantidad_inicial,
  pc.cantidad_consumida,
  op.id                 AS orden_produccion_id,
  op.numero             AS numero_op,
  op.fecha              AS fecha_produccion,
  op.estado             AS estado_op,
  pl.id                 AS producto_lote_id,
  pl.codigo_lote        AS codigo_lote_pt,
  pl.producto_id,
  p.nombre              AS producto_nombre,
  pl.variante_id,
  pv.presentacion        AS variante_presentacion,
  pl.estado              AS estado_pt,
  pl.cantidad_inicial     AS pt_cantidad_inicial,
  pl.fecha_vencimiento    AS pt_fecha_vencimiento,
  ri.id                   AS remision_item_id,
  ri.cantidad_entregada,
  rem.id                  AS remision_id,
  rem.numero              AS numero_remision,
  rem.fecha               AS fecha_remision,
  ped.id                  AS pedido_id,
  ped.numero_pedido,
  cli.nombre_completo     AS cliente_nombre
FROM insumo_lotes il
JOIN insumos ins ON ins.id = il.insumo_id
LEFT JOIN produccion_consumo pc ON pc.insumo_lote_id = il.id
LEFT JOIN ordenes_produccion op ON op.id = pc.orden_produccion_id
LEFT JOIN producto_lotes pl ON pl.orden_produccion_id = op.id
LEFT JOIN productos p ON p.id = pl.producto_id
LEFT JOIN producto_variantes pv ON pv.id = pl.variante_id
LEFT JOIN remision_items ri ON ri.producto_lote_id = pl.id
LEFT JOIN remisiones rem ON rem.id = ri.remision_id
LEFT JOIN pedidos ped ON ped.id = rem.pedido_id
LEFT JOIN clientes cli ON cli.id = ped.cliente_id

UNION ALL

-- Rama 2: lotes PT sin orden_produccion (ajustes manuales / origen desconocido)
SELECT
  NULL::UUID            AS insumo_lote_id,
  NULL::TEXT             AS codigo_lote_insumo,
  NULL::UUID             AS insumo_id,
  NULL::TEXT             AS insumo_nombre,
  NULL::TEXT             AS proveedor,
  NULL::DATE             AS fecha_ingreso,
  NULL::DATE             AS insumo_fecha_vencimiento,
  NULL::NUMERIC          AS insumo_cantidad_inicial,
  NULL::NUMERIC          AS cantidad_consumida,
  NULL::UUID             AS orden_produccion_id,
  NULL::TEXT             AS numero_op,
  NULL::DATE             AS fecha_produccion,
  NULL::estado_produccion AS estado_op,
  pl.id                  AS producto_lote_id,
  pl.codigo_lote         AS codigo_lote_pt,
  pl.producto_id,
  p.nombre               AS producto_nombre,
  pl.variante_id,
  pv.presentacion         AS variante_presentacion,
  pl.estado               AS estado_pt,
  pl.cantidad_inicial      AS pt_cantidad_inicial,
  pl.fecha_vencimiento     AS pt_fecha_vencimiento,
  ri.id                    AS remision_item_id,
  ri.cantidad_entregada,
  rem.id                   AS remision_id,
  rem.numero               AS numero_remision,
  rem.fecha                AS fecha_remision,
  ped.id                   AS pedido_id,
  ped.numero_pedido,
  cli.nombre_completo      AS cliente_nombre
FROM producto_lotes pl
JOIN productos p ON p.id = pl.producto_id
LEFT JOIN producto_variantes pv ON pv.id = pl.variante_id
LEFT JOIN remision_items ri ON ri.producto_lote_id = pl.id
LEFT JOIN remisiones rem ON rem.id = ri.remision_id
LEFT JOIN pedidos ped ON ped.id = rem.pedido_id
LEFT JOIN clientes cli ON cli.id = ped.cliente_id
WHERE pl.orden_produccion_id IS NULL;

-- 2. fn_explosion_materiales(ordenes_ids[], pedidos_ids[])
-- Agrega la demanda de insumos (en crudo) de un conjunto de órdenes de producción
-- planificadas (vía receta_items + merma) y de un conjunto de pedidos pendientes
-- (vía detalle_pedido -> receta activa de esa variante + merma), la compara contra
-- v_stock_insumos y devuelve faltantes con sugerencia de compra.
CREATE OR REPLACE FUNCTION fn_explosion_materiales(p_ordenes_ids UUID[] DEFAULT NULL, p_pedidos_ids UUID[] DEFAULT NULL)
RETURNS TABLE(
  insumo_id        UUID,
  insumo_codigo    TEXT,
  insumo_nombre    TEXT,
  unidad_medida    unidad_medida,
  demanda_total    NUMERIC,
  stock_disponible NUMERIC,
  faltante         NUMERIC,
  sugerido_comprar NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH demanda_produccion AS (
    SELECT ri.insumo_id,
      SUM(
        (ri.cantidad * (op.cantidad_planificada / NULLIF(r.rendimiento, 0)))
        / (1 - (i.merma_pct / 100.0))
      ) AS cantidad
    FROM ordenes_produccion op
    JOIN recetas r ON r.id = op.receta_id
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i ON i.id = ri.insumo_id
    WHERE op.id = ANY(COALESCE(p_ordenes_ids, ARRAY[]::UUID[]))
      AND op.estado = 'planificada'
    GROUP BY ri.insumo_id
  ),
  demanda_pedidos AS (
    SELECT ri.insumo_id,
      SUM(
        (ri.cantidad * ((dp.cantidad - COALESCE(dp.cantidad_entregada, 0)) / NULLIF(r.rendimiento, 0)))
        / (1 - (i.merma_pct / 100.0))
      ) AS cantidad
    FROM detalle_pedido dp
    JOIN recetas r ON r.producto_id = dp.producto_id
      AND (r.variante_id = dp.variante_id OR (r.variante_id IS NULL AND dp.variante_id IS NULL))
      AND r.is_active = true
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i ON i.id = ri.insumo_id
    WHERE dp.pedido_id = ANY(COALESCE(p_pedidos_ids, ARRAY[]::UUID[]))
      AND (dp.cantidad - COALESCE(dp.cantidad_entregada, 0)) > 0
    GROUP BY ri.insumo_id
  ),
  demanda_total AS (
    SELECT u.insumo_id, SUM(u.cantidad) AS cantidad
    FROM (
      SELECT * FROM demanda_produccion
      UNION ALL
      SELECT * FROM demanda_pedidos
    ) u
    GROUP BY u.insumo_id
  )
  SELECT
    dt.insumo_id,
    i.codigo,
    i.nombre,
    i.unidad_medida,
    dt.cantidad AS demanda_total,
    COALESCE(vsi.stock_disponible, 0) AS stock_disponible,
    GREATEST(dt.cantidad - COALESCE(vsi.stock_disponible, 0), 0) AS faltante,
    GREATEST(dt.cantidad - COALESCE(vsi.stock_disponible, 0), 0) AS sugerido_comprar
  FROM demanda_total dt
  JOIN insumos i ON i.id = dt.insumo_id
  LEFT JOIN v_stock_insumos vsi ON vsi.insumo_id = dt.insumo_id
  ORDER BY faltante DESC, i.nombre ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_explosion_materiales(UUID[], UUID[]) TO authenticated;
