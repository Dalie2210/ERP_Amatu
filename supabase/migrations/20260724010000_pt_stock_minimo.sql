-- ============================================================
-- MIGRACIÓN: Mínimo de stock de Producto Terminado por variante
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
--
-- Contexto: la empresa lleva un registro de cuánto PT debería
-- haber en stock (un mínimo por presentación/variante). Con ese
-- dato la vista PT/Stock puede mostrar la diferencia frente a lo
-- producido y sugerir cuánto falta producir.
-- Default 0 => no cambia el comportamiento de ninguna variante.
-- ============================================================

ALTER TABLE producto_variantes
  ADD COLUMN stock_minimo NUMERIC NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0);

COMMENT ON COLUMN producto_variantes.stock_minimo IS
  'Mínimo de producto terminado que debería existir en stock para esta presentación. Se compara contra el PT en estado producido para calcular cuánto falta producir.';

-- v_stock_productos: incluir stock_minimo de la variante.
-- NOTA: CREATE OR REPLACE VIEW no permite reordenar/renombrar columnas
-- existentes, por eso stock_minimo se agrega al final del SELECT.
CREATE OR REPLACE VIEW v_stock_productos WITH (security_invoker = on) AS
SELECT p.id AS producto_id, p.nombre AS producto_nombre, pv.id AS variante_id,
  pv.presentacion AS variante_presentacion, pl.estado,
  COALESCE(SUM(pl.cantidad_disponible), 0) AS stock_disponible,
  COALESCE(SUM(pl.cantidad_disponible * pl.costo_unitario) / NULLIF(SUM(pl.cantidad_disponible), 0), 0) AS costo_promedio_lote,
  pv.stock_minimo
FROM productos p JOIN producto_variantes pv ON pv.producto_id = p.id
LEFT JOIN producto_lotes pl ON pl.producto_id = p.id AND pl.variante_id = pv.id AND pl.cantidad_disponible > 0
GROUP BY p.id, p.nombre, pv.id, pv.presentacion, pl.estado, pv.stock_minimo;
