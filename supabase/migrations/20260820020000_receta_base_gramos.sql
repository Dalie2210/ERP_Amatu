-- ============================================================
-- MIGRACIÓN: ERP-PROD-09 (2/3) — Recetas con base en gramos (porción de 1.200 g)
--
-- Contexto: hoy `recetas.rendimiento` significa "unidades de PT por corrida" y
-- cada receta está atada a una VARIANTE (una presentación). Eso obliga a cargar
-- la misma dieta tres veces (1200 g, 500 g, 300 g), con tres oportunidades de
-- que se desincronicen. El negocio calibra la producción en porciones estándar
-- de 1.200 g y deriva las demás presentaciones de ahí.
--
-- Esta migración normaliza las recetas a una base en gramos y deduplica las
-- que resultan idénticas, SIN cambiar ni un decimal de lo que el sistema
-- calcula hoy. La identidad que lo garantiza:
--
--     base_gramos := rendimiento × gramaje(variante)
--
--   fórmula nueva : cocido = ri.cantidad × (cantidad × gramaje) / base_gramos
--   sustituyendo  : cocido = ri.cantidad × cantidad / rendimiento
--   fórmula vieja : cocido = ri.cantidad × (cantidad / rendimiento)   ← idéntica
--
-- Por eso el backfill es NEUTRO: ninguna orden, histórica o futura, cambia de
-- números. La reescala a base 1200 (paso 4) también lo es, porque multiplica
-- las cantidades y la base por el mismo factor.
--
-- Además deja lista la FIRMA de receta, que ERP-PROD-05 usa para detectar
-- dietas que comparten fórmula y pueden mezclarse juntas.
--
-- Requiere haber aplicado 20260820010000_variantes_gramaje.sql, y que
-- `SELECT * FROM v_variantes_sin_gramaje WHERE is_active` esté VACÍA.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columnas nuevas
-- ------------------------------------------------------------
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS base_gramos     NUMERIC;
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS base_modo       TEXT NOT NULL DEFAULT 'gramos';
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS firma           TEXT;
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS reemplazada_por UUID REFERENCES recetas(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recetas_base_modo_valido') THEN
    ALTER TABLE recetas ADD CONSTRAINT recetas_base_modo_valido
      CHECK (base_modo IN ('gramos', 'unidades'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recetas_base_gramos_positiva') THEN
    ALTER TABLE recetas ADD CONSTRAINT recetas_base_gramos_positiva
      CHECK (base_gramos IS NULL OR base_gramos > 0);
  END IF;
END;
$$;

COMMENT ON COLUMN recetas.base_gramos IS
  'Base sobre la que están expresadas las cantidades de receta_items. Con base_modo=''gramos'' son gramos de masa (tras esta migración, 1200 = la porción estándar). Con base_modo=''unidades'' conserva la semántica legada de recetas.rendimiento.';
COMMENT ON COLUMN recetas.base_modo IS
  '''gramos'' = receta por porción de masa (dietas, caso normal). ''unidades'' = receta por unidades de PT por corrida (legado, para productos sin gramaje resoluble).';
COMMENT ON COLUMN recetas.firma IS
  'Hash canónico del contenido de la receta (insumos + cantidades normalizadas + base). Dos dietas con la misma firma comparten fórmula y pueden mezclarse juntas (ERP-PROD-05). La mantiene el trigger trg_recetas_firma.';
COMMENT ON COLUMN recetas.reemplazada_por IS
  'Si esta receta fue deduplicada, apunta a la receta canónica que la sustituye. Nunca se borran recetas: las órdenes históricas conservan su receta_id.';

-- ------------------------------------------------------------
-- 2. Backfill NEUTRO de la base
--    'gramos'   → hay variante con gramaje: base = rendimiento × gramaje
--    'unidades' → sin variante o sin gramaje: se conserva el legado tal cual
-- ------------------------------------------------------------
UPDATE recetas r
SET base_gramos = r.rendimiento * pv.gramaje_g,
    base_modo   = 'gramos'
FROM producto_variantes pv
WHERE pv.id = r.variante_id
  AND pv.gramaje_g IS NOT NULL
  AND r.rendimiento > 0
  AND r.base_gramos IS NULL;

UPDATE recetas
SET base_gramos = rendimiento,
    base_modo   = 'unidades'
WHERE base_gramos IS NULL
  AND rendimiento > 0;

-- ------------------------------------------------------------
-- 3. Consolidar insumos repetidos dentro de una misma receta
--    Sin esto la firma sería inestable (el mismo insumo aportaría dos entradas
--    y el resultado dependería del orden físico de las filas). receta_items
--    nunca tuvo UNIQUE(receta_id, insumo_id); se impone ahora.
-- ------------------------------------------------------------
WITH agregados AS (
  SELECT receta_id, insumo_id,
         SUM(cantidad)  AS cantidad_total,
         MIN(id::TEXT)::UUID AS conservar
  FROM receta_items
  GROUP BY receta_id, insumo_id
  HAVING COUNT(*) > 1
)
UPDATE receta_items ri
SET cantidad = a.cantidad_total
FROM agregados a
WHERE ri.id = a.conservar;

DELETE FROM receta_items ri
USING (
  SELECT receta_id, insumo_id, MIN(id::TEXT)::UUID AS conservar
  FROM receta_items
  GROUP BY receta_id, insumo_id
  HAVING COUNT(*) > 1
) a
WHERE ri.receta_id = a.receta_id
  AND ri.insumo_id = a.insumo_id
  AND ri.id <> a.conservar;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receta_items_receta_insumo_unq') THEN
    ALTER TABLE receta_items ADD CONSTRAINT receta_items_receta_insumo_unq
      UNIQUE (receta_id, insumo_id);
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 4. Normalización a la porción estándar de 1.200 g
--    Neutro: se multiplica cada cantidad y la base por el mismo factor, así
--    que la razón cantidad/base —que es lo único que usa el cálculo— no cambia.
--    Idempotente por la condición `<> 1200`.
-- ------------------------------------------------------------
UPDATE receta_items ri
SET cantidad = ri.cantidad * (1200.0 / r.base_gramos)
FROM recetas r
WHERE r.id = ri.receta_id
  AND r.base_modo = 'gramos'
  AND r.base_gramos IS NOT NULL
  AND r.base_gramos <> 1200;

UPDATE recetas
SET base_gramos = 1200
WHERE base_modo = 'gramos'
  AND base_gramos IS NOT NULL
  AND base_gramos <> 1200;

-- ------------------------------------------------------------
-- 5. Firma de receta
--    Cadena canónica: ordenada por insumo_id y redondeada a 1 decimal de gramo.
--    Sobre una base de 1.200 g, 0,1 g es ~0,01 % en ingredientes de decenas o
--    cientos de gramos: absorbe el ruido de coma flotante de la reescala del
--    paso 4 sin llegar a fusionar recetas que de verdad difieren.
--    Gemelo TS en src/lib/inventario/receta.ts::cadenaFirmaReceta (sin el md5).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_firma_receta(
  p_base_modo   TEXT,
  p_base_gramos NUMERIC,
  p_receta_id   UUID
)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT md5(
    COALESCE(p_base_modo, 'gramos')
    || '#' || COALESCE(ROUND(p_base_gramos)::TEXT, '0')
    || '|' || COALESCE((
      SELECT string_agg(
               ri.insumo_id::TEXT || ':' || to_char(ROUND(ri.cantidad, 1), 'FM999999990.0'),
               '|' ORDER BY ri.insumo_id
             )
      FROM receta_items ri
      WHERE ri.receta_id = p_receta_id
    ), '')
  );
$$;

CREATE OR REPLACE FUNCTION fn_calcular_firma_receta(p_receta_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT fn_firma_receta(r.base_modo, r.base_gramos, r.id)
  FROM recetas r WHERE r.id = p_receta_id;
$$;

COMMENT ON FUNCTION fn_calcular_firma_receta(UUID) IS
  'Firma canónica del contenido de una receta (md5 de insumos+cantidades ordenados y la base). Dos recetas con la misma firma son la misma fórmula.';

GRANT EXECUTE ON FUNCTION fn_firma_receta(TEXT, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_calcular_firma_receta(UUID) TO authenticated;

-- Trigger en la cabecera: recalcula al crear o al cambiar la base.
CREATE OR REPLACE FUNCTION fn_set_firma_receta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.firma := fn_firma_receta(NEW.base_modo, NEW.base_gramos, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recetas_firma ON recetas;
CREATE TRIGGER trg_recetas_firma
  BEFORE INSERT OR UPDATE OF base_gramos, base_modo ON recetas
  FOR EACH ROW EXECUTE FUNCTION fn_set_firma_receta();

-- Trigger en los items, a nivel STATEMENT (no FOR EACH ROW) a propósito:
-- RecetaFormDialog edita una receta borrando TODOS sus items y reinsertándolos.
-- Con un trigger por fila, el DELETE masivo dejaría la firma calculada sobre
-- una receta vacía en el estado intermedio. A nivel statement se recalcula una
-- sola vez, sobre el conjunto final de cada sentencia.
CREATE OR REPLACE FUNCTION fn_touch_firma_receta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT receta_id) INTO v_ids FROM nuevas;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT receta_id) INTO v_ids FROM viejas;
  ELSE
    SELECT array_agg(DISTINCT receta_id) INTO v_ids
    FROM (SELECT receta_id FROM nuevas UNION SELECT receta_id FROM viejas) u;
  END IF;

  IF v_ids IS NOT NULL THEN
    UPDATE recetas r
    SET firma = fn_firma_receta(r.base_modo, r.base_gramos, r.id)
    WHERE r.id = ANY(v_ids);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_receta_items_firma_ins ON receta_items;
CREATE TRIGGER trg_receta_items_firma_ins
  AFTER INSERT ON receta_items
  REFERENCING NEW TABLE AS nuevas
  FOR EACH STATEMENT EXECUTE FUNCTION fn_touch_firma_receta();

DROP TRIGGER IF EXISTS trg_receta_items_firma_del ON receta_items;
CREATE TRIGGER trg_receta_items_firma_del
  AFTER DELETE ON receta_items
  REFERENCING OLD TABLE AS viejas
  FOR EACH STATEMENT EXECUTE FUNCTION fn_touch_firma_receta();

DROP TRIGGER IF EXISTS trg_receta_items_firma_upd ON receta_items;
CREATE TRIGGER trg_receta_items_firma_upd
  AFTER UPDATE ON receta_items
  REFERENCING NEW TABLE AS nuevas OLD TABLE AS viejas
  FOR EACH STATEMENT EXECUTE FUNCTION fn_touch_firma_receta();

-- Backfill de la firma
UPDATE recetas r SET firma = fn_firma_receta(r.base_modo, r.base_gramos, r.id);

CREATE INDEX IF NOT EXISTS idx_recetas_firma ON recetas(firma) WHERE is_active;

-- ------------------------------------------------------------
-- 6. Deduplicación — sin romper la historia
--    Por cada (producto_id, firma) con más de una receta activa se conserva la
--    más antigua como canónica y las demás quedan inactivas apuntando a ella.
--    NUNCA se borra una receta ni sus items: orden_produccion_items.receta_id
--    de las órdenes ya cerradas sigue resolviendo a los mismos números.
-- ------------------------------------------------------------
WITH grupos AS (
  SELECT id, producto_id, firma,
         ROW_NUMBER() OVER (PARTITION BY producto_id, firma ORDER BY created_at, id) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY producto_id, firma ORDER BY created_at, id) AS canonica
  FROM recetas
  WHERE is_active AND base_modo = 'gramos' AND firma IS NOT NULL
)
UPDATE recetas r
SET is_active = false,
    reemplazada_por = g.canonica
FROM grupos g
WHERE r.id = g.id AND g.rn > 1;

-- Las órdenes AÚN ABIERTAS deben apuntar a la canónica: fn_completar_item_produccion
-- rechaza recetas inactivas. Es un cambio neutro — misma firma, misma base.
UPDATE orden_produccion_items opi
SET receta_id = r.reemplazada_por
FROM recetas r
WHERE r.id = opi.receta_id
  AND r.reemplazada_por IS NOT NULL
  AND opi.estado IN ('planificada', 'en_proceso');

-- La canónica deja de estar atada a una presentación: sirve para todas, porque
-- el gramaje ya lo aporta la variante del ítem de la orden. Solo se desata
-- cuando el producto quedó con UNA sola fórmula activa; si un producto tiene
-- varias recetas realmente distintas, se dejan como están para no perder
-- información y quedan listadas en v_recetas_multi_firma.
WITH unicas AS (
  SELECT producto_id
  FROM recetas
  WHERE is_active AND base_modo = 'gramos'
  GROUP BY producto_id
  HAVING COUNT(DISTINCT firma) = 1
)
UPDATE recetas r
SET variante_id = NULL
FROM unicas u
WHERE r.producto_id = u.producto_id
  AND r.is_active
  AND r.base_modo = 'gramos'
  AND r.variante_id IS NOT NULL;

CREATE OR REPLACE VIEW v_recetas_multi_firma
WITH (security_invoker = on) AS
SELECT r.producto_id, p.nombre AS producto_nombre,
       COUNT(DISTINCT r.firma) AS formulas_distintas,
       array_agg(DISTINCT COALESCE(pv.presentacion, 'todas')) AS presentaciones
FROM recetas r
JOIN productos p ON p.id = r.producto_id
LEFT JOIN producto_variantes pv ON pv.id = r.variante_id
WHERE r.is_active AND r.base_modo = 'gramos'
GROUP BY r.producto_id, p.nombre
HAVING COUNT(DISTINCT r.firma) > 1;

COMMENT ON VIEW v_recetas_multi_firma IS
  'Productos que conservan más de una fórmula activa tras la deduplicación de ERP-PROD-09. Requieren revisión manual: o son dietas legítimamente distintas por presentación, o son datos a unificar.';

-- ------------------------------------------------------------
-- 7. Unicidad de la receta de dieta
--    Impide que vuelvan a convivir dos recetas genéricas activas para el mismo
--    producto (hoy el cliente resuelve con un `find()` y se queda con la
--    primera que aparezca, lo que hace el cálculo dependiente del orden).
-- ------------------------------------------------------------
DO $$
DECLARE
  v_conflictos TEXT;
BEGIN
  SELECT string_agg(p.nombre, ', ')
  INTO v_conflictos
  FROM (
    SELECT producto_id FROM recetas
    WHERE is_active AND variante_id IS NULL
    GROUP BY producto_id HAVING COUNT(*) > 1
  ) c
  JOIN productos p ON p.id = c.producto_id;

  IF v_conflictos IS NOT NULL THEN
    RAISE EXCEPTION
      'No se puede imponer una receta genérica única: estos productos tienen varias recetas activas sin presentación y con fórmulas distintas: %. Unifícalas o asígnales presentación antes de aplicar esta migración.',
      v_conflictos;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS recetas_producto_activa_unq
  ON recetas(producto_id)
  WHERE variante_id IS NULL AND is_active;
