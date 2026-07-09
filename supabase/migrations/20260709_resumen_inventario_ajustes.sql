-- ============================================================
-- MIGRACIÓN: Resumen de inventario — reemplaza "conteo/diferencia" por "ajustes"
-- Usado por la pestaña Balance del dashboard de inventario (/inventario?tab=balance)
--
-- Motivo: el flujo de Conteo ya no registra un conteo formal en
-- conteos_inventario/conteo_items — el botón "Ajustar" llama directo a
-- fn_ajuste_inventario, que solo escribe en movimientos_inventario. Por lo tanto
-- las columnas conteo/diferencia de la versión anterior de esta función siempre
-- devolvían NULL (nunca había filas en conteo_items que unir).
--
-- Esta versión reemplaza esa comparación muerta por los AJUSTES realmente
-- registrados en el período (tipo ajuste_positivo / ajuste_negativo / merma),
-- que es la señal real de "diferencia encontrada y corregida" en el flujo actual.
-- ============================================================

-- El shape de las columnas de retorno cambió (conteo/diferencia -> ajustes/num_ajustes),
-- así que CREATE OR REPLACE no basta: hay que eliminar la función existente primero.
DROP FUNCTION IF EXISTS fn_resumen_inventario(DATE, DATE, TEXT);

CREATE FUNCTION fn_resumen_inventario(
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
  ajustes            NUMERIC,
  num_ajustes        INTEGER
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
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')), 0) AS ajustes,
      COUNT(*) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')) AS num_ajustes
    FROM movimientos_inventario m
    WHERE m.insumo_id IS NOT NULL
    GROUP BY m.insumo_id
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
      COALESCE(mv.ajustes, 0) AS ajustes,
      COALESCE(mv.num_ajustes, 0)::integer AS num_ajustes
    FROM insumo_base b
    LEFT JOIN insumo_mov mv ON mv.id = b.id
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
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')), 0) AS ajustes,
      COUNT(*) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')) AS num_ajustes
    FROM movimientos_inventario m
    WHERE m.variante_id IS NOT NULL
    GROUP BY m.variante_id
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
      COALESCE(mv.ajustes, 0) AS ajustes,
      COALESCE(mv.num_ajustes, 0)::integer AS num_ajustes
    FROM variante_base b
    LEFT JOIN variante_mov mv ON mv.id = b.id
  )
  SELECT * FROM insumos_res
  UNION ALL
  SELECT * FROM variantes_res
  ORDER BY tipo_item, nombre, presentacion;
$$;
