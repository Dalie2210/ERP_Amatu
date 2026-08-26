-- ============================================================
-- MIGRACIÓN: ERP-PROD-05 — Combinar dietas que comparten receta en una mezcla
--
-- Contexto: cuando dos o más dietas usan la misma fórmula y solo difieren en la
-- presentación, hacerles mezclas separadas produce varias corridas pequeñas
-- —cada una de ~45 min— y a veces ninguna alcanza el mínimo de la mezcladora.
-- Físicamente es la misma masa: puede mezclarse junta y empacarse después por
-- dieta.
--
-- La detección es automática: dos dietas comparten fórmula si sus recetas
-- tienen la misma `firma` (ver 20260820020000). Como ERP-PROD-09 normalizó
-- todas las recetas a la misma base de 1.200 g, esas firmas son directamente
-- comparables.
--
-- La agrupación es un atributo de la fila, no una tabla aparte: deshacerla es
-- un UPDATE a NULL. Y NUNCA se aplica sola — la propone el sistema y la
-- confirma una persona, porque el empaque y las firmas de calidad siguen siendo
-- por dieta.
--
-- Requiere haber aplicado 20260820020000_receta_base_gramos.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Agrupación en la hoja de mezcla
-- ------------------------------------------------------------
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS grupo_id    UUID;
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS grupo_firma TEXT;

CREATE INDEX IF NOT EXISTS idx_om_grupo ON orden_mezcla(orden_id, grupo_id);

COMMENT ON COLUMN orden_mezcla.grupo_id IS
  'Dietas con el mismo grupo_id se mezclan físicamente juntas (ERP-PROD-05). NULL = mezcla independiente.';
COMMENT ON COLUMN orden_mezcla.grupo_firma IS
  'Firma de receta compartida por el grupo, para poder auditar por qué se combinaron.';

-- ------------------------------------------------------------
-- 2. fn_sugerir_grupos_mezcla: qué dietas de la orden comparten fórmula
--    Devuelve la firma por dieta; el agrupamiento y la evaluación de si
--    conviene se hacen en el cliente, porque hay que poder previsualizarlo
--    antes de confirmar nada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sugerir_grupos_mezcla(p_orden_id UUID)
RETURNS TABLE(
  orden_mezcla_id UUID,
  producto_id     UUID,
  producto_nombre TEXT,
  firma           TEXT,
  total_gramos    NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id,
    om.producto_id,
    p.nombre,
    r.firma,
    om.total_gramos
  FROM orden_mezcla om
  JOIN productos p ON p.id = om.producto_id
  LEFT JOIN LATERAL (
    SELECT rr.firma
    FROM recetas rr
    WHERE rr.producto_id = om.producto_id
      AND rr.is_active
      AND rr.base_modo = 'gramos'
    ORDER BY (rr.variante_id IS NULL) DESC, rr.created_at
    LIMIT 1
  ) r ON true
  WHERE om.orden_id = p_orden_id
  ORDER BY om.orden_index;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_sugerir_grupos_mezcla(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. fn_agrupar_mezclas: confirma (o deshace) una agrupación
--    p_grupos = [{"producto_ids": [uuid, ...]}, ...]
--    Un grupo con menos de dos dietas se interpreta como "separar".
--
--    Va por RPC y no por UPDATE desde el cliente porque cruza varias filas y
--    tiene una invariante que hay que hacer cumplir: todas las dietas de un
--    grupo deben compartir firma. Sin esa validación se podrían mezclar
--    fórmulas distintas en el mismo tambor.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_agrupar_mezclas(
  p_orden_id UUID,
  p_grupos   JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden   ordenes_produccion%ROWTYPE;
  v_grupo   JSONB;
  v_ids     UUID[];
  v_firmas  TEXT[];
  v_firma   TEXT;
  v_nuevo   UUID;
  v_n       INTEGER := 0;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se puede cambiar la agrupación de mezclas';
  END IF;

  -- Se reconstruye la agrupación completa desde cero: así el cliente manda un
  -- estado deseado y no una secuencia de operaciones que pueda desincronizarse.
  UPDATE orden_mezcla SET grupo_id = NULL, grupo_firma = NULL WHERE orden_id = p_orden_id;

  FOR v_grupo IN SELECT * FROM jsonb_array_elements(COALESCE(p_grupos, '[]'::JSONB))
  LOOP
    SELECT array_agg((value #>> '{}')::UUID)
    INTO v_ids
    FROM jsonb_array_elements(v_grupo->'producto_ids');

    IF v_ids IS NULL OR array_length(v_ids, 1) < 2 THEN
      CONTINUE; -- una dieta sola no es un grupo
    END IF;

    SELECT array_agg(DISTINCT r.firma)
    INTO v_firmas
    FROM unnest(v_ids) AS pid
    LEFT JOIN LATERAL (
      SELECT rr.firma FROM recetas rr
      WHERE rr.producto_id = pid AND rr.is_active AND rr.base_modo = 'gramos'
      ORDER BY (rr.variante_id IS NULL) DESC, rr.created_at
      LIMIT 1
    ) r ON true;

    IF array_length(v_firmas, 1) IS DISTINCT FROM 1 OR v_firmas[1] IS NULL THEN
      RAISE EXCEPTION 'No se pueden combinar dietas con recetas distintas en una misma mezcla';
    END IF;

    v_firma := v_firmas[1];
    v_nuevo := gen_random_uuid();

    UPDATE orden_mezcla
    SET grupo_id = v_nuevo, grupo_firma = v_firma
    WHERE orden_id = p_orden_id AND producto_id = ANY(v_ids);

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_agrupar_mezclas(UUID, JSONB) TO authenticated;
