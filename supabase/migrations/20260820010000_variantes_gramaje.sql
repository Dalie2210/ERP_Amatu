-- ============================================================
-- MIGRACIÓN: ERP-PROD-09 (1/3) — Gramaje numérico de las presentaciones
--
-- Contexto: toda la aritmética de mezclas (nº de mezclas, múltiplos de 1.200 g,
-- fusión de dietas, ajuste de sobrante) es aritmética de gramos, pero hoy su
-- única fuente es el TEXTO LIBRE de producto_variantes.presentacion, parseado
-- por regex en dos lenguajes distintos:
--   · TS  → src/lib/inventario/mezcla.ts::parseGramaje
--   · SQL → fn_get_or_create_mezclas_orden, con regexp_replace(...,'[^0-9.]','')
-- Ese parseo es frágil de formas que no se notan: "Única" da 0 y la dieta
-- desaparece silenciosamente del plan de mezcla; "1,2 kg" da 1.2 en vez de 1200
-- y lo descuadra por un factor de mil.
--
-- Esta migración materializa el gramaje como columna numérica, que pasa a ser
-- la fuente de verdad. `presentacion` queda como etiqueta para mostrar.
--
-- Requiere haber aplicado 20260820000000_helpers_receta.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columna
--    Se admite NULL a propósito: NULL significa "desconocido, revísalo" y se
--    propaga de forma visible, mientras que un 0 se confundiría con un peso
--    real. El CHECK impide justamente que alguien lo rellene con 0.
-- ------------------------------------------------------------
ALTER TABLE producto_variantes
  ADD COLUMN IF NOT EXISTS gramaje_g INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'producto_variantes_gramaje_positivo'
  ) THEN
    ALTER TABLE producto_variantes
      ADD CONSTRAINT producto_variantes_gramaje_positivo
      CHECK (gramaje_g IS NULL OR gramaje_g > 0);
  END IF;
END;
$$;

COMMENT ON COLUMN producto_variantes.gramaje_g IS
  'Peso de la presentación en gramos. Fuente de verdad para todo el cálculo de producción y mezclas; producto_variantes.presentacion queda como etiqueta legible. NULL = sin resolver (ver v_variantes_sin_gramaje).';

-- ------------------------------------------------------------
-- 2. Backfill idempotente (solo toca lo que está sin resolver)
--    Se distingue explícitamente kg de g, y se acepta la coma decimal que usa
--    la localización es-CO ("1,2 kg"). Lo que no encaje queda en NULL para que
--    una persona lo revise, en vez de inventar un número.
-- ------------------------------------------------------------
UPDATE producto_variantes
SET gramaje_g = sub.valor
FROM (
  SELECT
    id,
    CASE
      -- "1,2 kg" / "1.2kg" / "2 KG"
      WHEN presentacion ~* '(\d+([.,]\d+)?)\s*kg'
        THEN ROUND(
          replace(substring(presentacion from '(\d+(?:[.,]\d+)?)\s*[kK][gG]'), ',', '.')::NUMERIC
          * 1000
        )::INTEGER
      -- "500g" / "300 g" / "1200 G"
      WHEN presentacion ~* '(\d+([.,]\d+)?)\s*g'
        THEN ROUND(
          replace(substring(presentacion from '(\d+(?:[.,]\d+)?)\s*[gG]'), ',', '.')::NUMERIC
        )::INTEGER
      -- solo dígitos, sin unidad: se asume gramos (convención del catálogo)
      WHEN presentacion ~ '^\s*\d+\s*$'
        THEN btrim(presentacion)::INTEGER
      ELSE NULL
    END AS valor
  FROM producto_variantes
) sub
WHERE producto_variantes.id = sub.id
  AND producto_variantes.gramaje_g IS NULL
  AND sub.valor IS NOT NULL
  AND sub.valor > 0;

-- ------------------------------------------------------------
-- 3. Vista de control: qué quedó sin resolver
--    Debe quedar VACÍA (o solo con variantes inactivas conscientemente
--    ignoradas) antes de aplicar 20260820020000_receta_base_gramos.sql, porque
--    ese backfill deriva la base de la receta del gramaje.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_variantes_sin_gramaje
WITH (security_invoker = on) AS
SELECT
  pv.id            AS variante_id,
  pv.producto_id,
  p.nombre         AS producto_nombre,
  pv.presentacion,
  pv.sku,
  pv.is_active
FROM producto_variantes pv
JOIN productos p ON p.id = pv.producto_id
WHERE pv.gramaje_g IS NULL
ORDER BY pv.is_active DESC, p.nombre, pv.presentacion;

COMMENT ON VIEW v_variantes_sin_gramaje IS
  'Presentaciones cuyo gramaje no pudo derivarse del texto. Deben resolverse a mano antes de migrar las recetas a base en gramos (ERP-PROD-09).';
