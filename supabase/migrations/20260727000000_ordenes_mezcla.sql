-- ============================================================
-- MIGRACIÓN: Órdenes de mezcla (derivadas de la orden de producción)
--
-- Contexto: de una orden de producción nace, además de la hoja de cocción/
-- proceso (ya digitalizada en orden_produccion_procesos), la "hoja de mezcla".
-- Ésta le dice al equipo de mezcla cuántas "mezclas" hacer por DIETA. La lógica
-- del cliente: se calibra en porciones estándar de 1.200 g; por dieta se suman
-- los gramos requeridos y se dividen entre 1.200 → nº de mezclas. El redondeo a
-- múltiplo de 12 y la división en lotes de ≤58–60 kg (capacidad de la
-- mezcladora) quedan MANUALES; el ERP solo calcula el número sugerido y guarda
-- el nº final que fija la persona, más las firmas de trazabilidad.
--
-- Modelo: en este catálogo cada PRODUCTO es una dieta (ej. "Mid Power Res") con
-- producto_variantes por gramaje (300/500/1200g). Por eso se agrupa por
-- producto_id, y los gramos salen de cantidad_planificada × gramaje(presentacion).
--
-- Esta migración agrega:
--   1. orden_mezcla — una fila por dieta (producto) por orden
--   2. fn_get_or_create_mezclas_orden — genera/actualiza la hoja de mezcla
--   3. RLS que incluye el rol 'jefe_produccion'
--
-- El historial usa orden_produccion_actividad (tipo TEXT), con el nuevo tipo
-- 'mezcla_guardada' emitido desde el frontend; no requiere cambio de esquema.
--
-- Requiere haber aplicado 20260726010000_produccion_procesos.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla de mezcla por dieta (una fila por producto por orden)
-- ------------------------------------------------------------
CREATE TABLE orden_mezcla (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id             UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_id          UUID        NOT NULL REFERENCES productos(id),
  total_gramos         NUMERIC,                          -- snapshot calculado (referencia, no editable)
  num_mezclas_sugerido NUMERIC,                          -- total_gramos / porcion_estandar (referencia)
  num_mezclas          NUMERIC,                          -- nº final que fija la persona (redondeo/división manual)
  porcion_estandar     NUMERIC     NOT NULL DEFAULT 1200, -- base de la porción (g); configurable a futuro
  firma_mezclo         TEXT,                             -- quién mezcló
  firma_empaco         TEXT,                             -- quién empacó
  firma_fecho          TEXT,                             -- quién fechó
  firma_sello          TEXT,                             -- quién selló
  firma_verifico       TEXT,                             -- quién verificó
  observaciones        TEXT,
  orden_index          INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (orden_id, producto_id)
);

CREATE INDEX idx_om_orden ON orden_mezcla(orden_id);

COMMENT ON TABLE orden_mezcla IS
  'Hoja de mezcla por dieta (una fila por producto por orden de producción). El ERP calcula el nº de mezclas sugerido (total gramos / 1200); el nº final y las firmas de trazabilidad los diligencia el equipo de producción.';

-- ------------------------------------------------------------
-- 2. fn_get_or_create_mezclas_orden: genera/actualiza la hoja de mezcla
--    Idempotente. Lista las dietas (productos distintos) de los ítems de la
--    orden, agregando el total de gramos = SUM(cantidad_planificada × gramaje).
--    El gramaje se parsea del texto de la presentación ("1200g" → 1200); ítems
--    sin variante o sin gramaje parseable contribuyen 0. No pisa lo diligenciado
--    (num_mezclas, firmas): solo refresca total_gramos y num_mezclas_sugerido.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_or_create_mezclas_orden(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO orden_mezcla (orden_id, producto_id, total_gramos, num_mezclas_sugerido, orden_index)
  SELECT
    p_orden_id,
    d.producto_id,
    d.total_gramos,
    CASE WHEN d.total_gramos IS NULL THEN NULL ELSE d.total_gramos / 1200.0 END,
    (ROW_NUMBER() OVER (ORDER BY d.producto_nombre) - 1)::INT AS orden_index
  FROM (
    SELECT
      opi.producto_id,
      p.nombre AS producto_nombre,
      SUM(
        opi.cantidad_planificada
        * COALESCE(NULLIF(regexp_replace(pv.presentacion, '[^0-9.]', '', 'g'), '')::NUMERIC, 0)
      ) AS total_gramos
    FROM orden_produccion_items opi
    JOIN productos p           ON p.id = opi.producto_id
    LEFT JOIN producto_variantes pv ON pv.id = opi.variante_id
    WHERE opi.orden_id = p_orden_id
    GROUP BY opi.producto_id, p.nombre
  ) d
  ON CONFLICT (orden_id, producto_id)
  DO UPDATE SET
    total_gramos         = EXCLUDED.total_gramos,
    num_mezclas_sugerido = EXCLUDED.num_mezclas_sugerido;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_or_create_mezclas_orden(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. RLS (mismo patrón que orden_produccion_procesos)
-- ------------------------------------------------------------
ALTER TABLE orden_mezcla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "om_select" ON orden_mezcla FOR SELECT TO authenticated USING (true);
CREATE POLICY "om_insert" ON orden_mezcla FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "om_update" ON orden_mezcla FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "om_delete" ON orden_mezcla FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
