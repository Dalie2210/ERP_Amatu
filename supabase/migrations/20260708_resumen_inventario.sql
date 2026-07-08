-- ============================================================
-- MIGRACIÓN: Resumen de inventario por período
-- Usado por /inventario/resumen
-- Devuelve por ítem (insumo o variante de PT):
--   inventario_inicial (saldo antes de p_desde), entradas, salidas,
--   total_teorico (= inicial + entradas - salidas), conteo (último del rango)
--   y diferencia (= conteo - total_teorico).
-- Entradas/salidas se calculan por signo de movimientos_inventario.cantidad
-- para ser robustos ante el tipo de movimiento.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_resumen_inventario(
  p_desde DATE,
  p_hasta DATE,
  p_categoria TEXT DEFAULT NULL
)
RETURNS TABLE (
  item_id            UUID,
  tipo_item          TEXT,
  nombre             TEXT,
  presentacion       TEXT,
  inventario_inicial NUMERIC,
  entradas           NUMERIC,
  salidas            NUMERIC,
  total_teorico      NUMERIC,
  conteo             NUMERIC,
  diferencia         NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  WITH
  -- ----- INSUMOS -----
  insumo_base AS (
    SELECT i.id, i.nombre, i.unidad_medida::text AS presentacion
    FROM insumos i
    WHERE i.is_active = true
      AND (p_categoria IS NULL
           OR (p_categoria <> 'producto_terminado' AND i.tipo::text = p_categoria))
      AND p_categoria IS DISTINCT FROM 'producto_terminado'
  ),
  insumo_mov AS (
    SELECT m.insumo_id AS id,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at < p_desde), 0) AS inicial,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad > 0), 0) AS entradas,
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas
    FROM movimientos_inventario m
    WHERE m.insumo_id IS NOT NULL
    GROUP BY m.insumo_id
  ),
  insumo_conteo AS (
    SELECT DISTINCT ON (ci.insumo_id) ci.insumo_id AS id, ci.cantidad_contada
    FROM conteo_items ci
    JOIN conteos_inventario c ON c.id = ci.conteo_id
    WHERE ci.insumo_id IS NOT NULL AND c.fecha >= p_desde AND c.fecha <= p_hasta
    ORDER BY ci.insumo_id, c.fecha DESC
  ),
  insumos_res AS (
    SELECT
      b.id AS item_id,
      'insumo'::text AS tipo_item,
      b.nombre,
      b.presentacion,
      COALESCE(mv.inicial, 0) AS inventario_inicial,
      COALESCE(mv.entradas, 0) AS entradas,
      COALESCE(mv.salidas, 0) AS salidas,
      COALESCE(mv.inicial, 0) + COALESCE(mv.entradas, 0) - COALESCE(mv.salidas, 0) AS total_teorico,
      ct.cantidad_contada AS conteo
    FROM insumo_base b
    LEFT JOIN insumo_mov mv ON mv.id = b.id
    LEFT JOIN insumo_conteo ct ON ct.id = b.id
  ),
  -- ----- PRODUCTO TERMINADO (variantes) -----
  variante_base AS (
    SELECT v.id, p.nombre, v.presentacion
    FROM producto_variantes v
    JOIN productos p ON p.id = v.producto_id
    WHERE v.is_active = true
      AND (p_categoria IS NULL OR p_categoria = 'producto_terminado')
  ),
  variante_mov AS (
    SELECT m.variante_id AS id,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at < p_desde), 0) AS inicial,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad > 0), 0) AS entradas,
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas
    FROM movimientos_inventario m
    WHERE m.variante_id IS NOT NULL
    GROUP BY m.variante_id
  ),
  variante_conteo AS (
    SELECT DISTINCT ON (ci.variante_id) ci.variante_id AS id, ci.cantidad_contada
    FROM conteo_items ci
    JOIN conteos_inventario c ON c.id = ci.conteo_id
    WHERE ci.variante_id IS NOT NULL AND c.fecha >= p_desde AND c.fecha <= p_hasta
    ORDER BY ci.variante_id, c.fecha DESC
  ),
  variantes_res AS (
    SELECT
      b.id AS item_id,
      'producto'::text AS tipo_item,
      b.nombre,
      b.presentacion,
      COALESCE(mv.inicial, 0) AS inventario_inicial,
      COALESCE(mv.entradas, 0) AS entradas,
      COALESCE(mv.salidas, 0) AS salidas,
      COALESCE(mv.inicial, 0) + COALESCE(mv.entradas, 0) - COALESCE(mv.salidas, 0) AS total_teorico,
      ct.cantidad_contada AS conteo
    FROM variante_base b
    LEFT JOIN variante_mov mv ON mv.id = b.id
    LEFT JOIN variante_conteo ct ON ct.id = b.id
  ),
  unidos AS (
    SELECT * FROM insumos_res
    UNION ALL
    SELECT * FROM variantes_res
  )
  SELECT
    u.item_id,
    u.tipo_item,
    u.nombre,
    u.presentacion,
    u.inventario_inicial,
    u.entradas,
    u.salidas,
    u.total_teorico,
    u.conteo,
    CASE WHEN u.conteo IS NULL THEN NULL ELSE u.conteo - u.total_teorico END AS diferencia
  FROM unidos u
  ORDER BY u.tipo_item, u.nombre, u.presentacion;
$$;
