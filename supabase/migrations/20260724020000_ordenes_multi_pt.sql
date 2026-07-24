-- ============================================================
-- MIGRACIÓN: Órdenes de producción con varios PT (multi-ítem)
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
--
-- Contexto: en la operación real, una misma orden de producción
-- lleva varios productos terminados. Se introduce una tabla de
-- ítems (orden_produccion_items): la orden pasa a ser un encabezado
-- (numero/fecha/notas/estado) y cada PT es un ítem con su receta y
-- cantidad. El consumo de insumos y la creación del lote de PT se
-- resuelven por ítem al completar.
--
-- Requiere haber aplicado antes 20260724000000_insumos_rendimiento.sql
-- (fórmula merma + rendimiento_pct).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla de ítems (una orden -> N productos terminados)
-- ------------------------------------------------------------
CREATE TABLE orden_produccion_items (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id             UUID              NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_id          UUID              NOT NULL REFERENCES productos(id),
  variante_id          UUID              REFERENCES producto_variantes(id),
  receta_id            UUID              REFERENCES recetas(id),
  cantidad_planificada NUMERIC           NOT NULL,
  cantidad_producida   NUMERIC,
  costo_total          NUMERIC,
  producto_lote_id     UUID              REFERENCES producto_lotes(id),
  estado               estado_produccion NOT NULL DEFAULT 'planificada',
  created_at           TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_opi_orden ON orden_produccion_items(orden_id);

COMMENT ON TABLE orden_produccion_items IS
  'Ítems (productos terminados) de una orden de producción. Cada ítem se produce/completa por separado y genera su propio lote de PT.';

-- ------------------------------------------------------------
-- 2. RLS (mismo criterio que ordenes_produccion)
-- ------------------------------------------------------------
ALTER TABLE orden_produccion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orden_produccion_items_select" ON orden_produccion_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "orden_produccion_items_insert" ON orden_produccion_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "orden_produccion_items_update" ON orden_produccion_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "orden_produccion_items_delete" ON orden_produccion_items FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- ------------------------------------------------------------
-- 3. Migración de datos: cada orden existente -> un ítem
-- ------------------------------------------------------------
INSERT INTO orden_produccion_items (
  orden_id, producto_id, variante_id, receta_id,
  cantidad_planificada, cantidad_producida, costo_total, producto_lote_id, estado, created_at
)
SELECT id, producto_id, variante_id, receta_id,
  cantidad_planificada, cantidad_producida, costo_total, producto_lote_id, estado, created_at
FROM ordenes_produccion;

-- ------------------------------------------------------------
-- 4. El encabezado ya no requiere producto/cantidad (viven en los ítems).
--    Se conservan las columnas para históricos.
-- ------------------------------------------------------------
ALTER TABLE ordenes_produccion ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE ordenes_produccion ALTER COLUMN cantidad_planificada DROP NOT NULL;

-- ------------------------------------------------------------
-- 5. RPC: crear orden con varios ítems (atómico)
--    p_items: [{ "receta_id": uuid, "producto_id": uuid,
--                "variante_id": uuid|null, "cantidad": numeric }, ...]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_crear_orden_produccion(
  p_fecha DATE,
  p_notas TEXT,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden_id UUID;
  v_item     JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La orden debe tener al menos un producto';
  END IF;

  INSERT INTO ordenes_produccion (estado, fecha, notas, created_by)
  VALUES ('planificada', COALESCE(p_fecha, CURRENT_DATE), NULLIF(btrim(p_notas), ''), auth.uid())
  RETURNING id INTO v_orden_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'cantidad')::NUMERIC IS NULL OR (v_item->>'cantidad')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Cada ítem debe tener una cantidad mayor a cero';
    END IF;

    INSERT INTO orden_produccion_items (
      orden_id, producto_id, variante_id, receta_id, cantidad_planificada, estado
    ) VALUES (
      v_orden_id,
      (v_item->>'producto_id')::UUID,
      NULLIF(v_item->>'variante_id', '')::UUID,
      NULLIF(v_item->>'receta_id', '')::UUID,
      (v_item->>'cantidad')::NUMERIC,
      'planificada'
    );
  END LOOP;

  RETURN v_orden_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_crear_orden_produccion(DATE, TEXT, JSONB) TO authenticated;

-- ------------------------------------------------------------
-- 6. RPC: preview de consumo por ÍTEM (crudo, FEFO)
--    Sustituye a fn_preview_consumo_produccion (que operaba por orden).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_preview_consumo_item(p_item_id UUID, p_cantidad_producida NUMERIC)
RETURNS TABLE(
  insumo_id           UUID,
  insumo_nombre       TEXT,
  unidad_medida       unidad_medida,
  cocido_requerido    NUMERIC,
  crudo_requerido     NUMERIC,
  insumo_lote_id      UUID,
  codigo_lote         TEXT,
  fecha_vencimiento   DATE,
  cantidad_a_consumir NUMERIC,
  costo_unitario      NUMERIC,
  disponible_total    NUMERIC,
  suficiente          BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_item             orden_produccion_items%ROWTYPE;
  v_receta           recetas%ROWTYPE;
  v_ri               RECORD;
  v_lote             RECORD;
  v_cocido_total     NUMERIC;
  v_crudo_req        NUMERIC;
  v_restante         NUMERIC;
  v_a_consumir       NUMERIC;
  v_disponible_total NUMERIC;
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;

  SELECT * INTO v_receta FROM recetas WHERE id = v_item.receta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;
  IF v_receta.rendimiento <= 0 THEN RAISE EXCEPTION 'La receta tiene un rendimiento inválido'; END IF;

  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, ri.unidad_medida, i.nombre AS insumo_nombre, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_req := v_cocido_total / (v_ri.rendimiento_pct / 100.0) / (1 - (v_ri.merma_pct / 100.0));
    v_restante := v_crudo_req;

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0;

    FOR v_lote IN
      SELECT il.id, il.codigo_lote, il.fecha_vencimiento, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      insumo_id := v_ri.insumo_id;
      insumo_nombre := v_ri.insumo_nombre;
      unidad_medida := v_ri.unidad_medida;
      cocido_requerido := v_cocido_total;
      crudo_requerido := v_crudo_req;
      insumo_lote_id := v_lote.id;
      codigo_lote := v_lote.codigo_lote;
      fecha_vencimiento := v_lote.fecha_vencimiento;
      cantidad_a_consumir := v_a_consumir;
      costo_unitario := v_lote.costo_unitario;
      disponible_total := v_disponible_total;
      suficiente := v_disponible_total >= v_crudo_req;
      RETURN NEXT;

      v_restante := v_restante - v_a_consumir;
    END LOOP;

    IF v_restante > 0 THEN
      insumo_id := v_ri.insumo_id;
      insumo_nombre := v_ri.insumo_nombre;
      unidad_medida := v_ri.unidad_medida;
      cocido_requerido := v_cocido_total;
      crudo_requerido := v_crudo_req;
      insumo_lote_id := NULL;
      codigo_lote := NULL;
      fecha_vencimiento := NULL;
      cantidad_a_consumir := v_restante;
      costo_unitario := 0;
      disponible_total := v_disponible_total;
      suficiente := false;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_preview_consumo_item(UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 7. RPC: completar un ÍTEM (consume insumos FEFO, crea lote de PT,
--    actualiza el ítem y recalcula el estado del encabezado).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_completar_item_produccion(p_item_id UUID, p_cantidad_producida NUMERIC)
RETURNS TABLE(producto_lote_id UUID, costo_total NUMERIC, costo_unitario NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_item              orden_produccion_items%ROWTYPE;
  v_orden             ordenes_produccion%ROWTYPE;
  v_receta            recetas%ROWTYPE;
  v_ri                RECORD;
  v_lote              RECORD;
  v_cocido_total      NUMERIC;
  v_crudo_requerido   NUMERIC;
  v_restante          NUMERIC;
  v_a_consumir        NUMERIC;
  v_disponible_total  NUMERIC;
  v_costo_total       NUMERIC := 0;
  v_lote_pt_id        UUID;
  v_user_id           UUID := auth.uid();
  v_pendientes        INTEGER;
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;
  IF v_item.estado = 'completada' THEN RAISE EXCEPTION 'El ítem ya fue completado'; END IF;
  IF v_item.estado = 'cancelada' THEN RAISE EXCEPTION 'El ítem está cancelado'; END IF;
  IF v_item.receta_id IS NULL THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = v_item.orden_id FOR UPDATE;

  SELECT * INTO v_receta FROM recetas WHERE id = v_item.receta_id;
  IF NOT FOUND OR NOT v_receta.is_active THEN RAISE EXCEPTION 'Receta no encontrada o inactiva'; END IF;
  IF v_receta.rendimiento <= 0 THEN RAISE EXCEPTION 'La receta tiene un rendimiento inválido'; END IF;

  -- Validación previa (todo o nada): stock crudo suficiente por insumo
  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, i.nombre AS insumo_nombre, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (v_ri.rendimiento_pct / 100.0) / (1 - (v_ri.merma_pct / 100.0));

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0;

    IF v_disponible_total < v_crudo_requerido THEN
      RAISE EXCEPTION 'Stock insuficiente de %: requiere % (crudo) pero hay % disponible',
        v_ri.insumo_nombre, round(v_crudo_requerido, 2), round(v_disponible_total, 2);
    END IF;
  END LOOP;

  -- Consumo real FEFO
  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (v_ri.rendimiento_pct / 100.0) / (1 - (v_ri.merma_pct / 100.0));
    v_restante := v_crudo_requerido;

    FOR v_lote IN
      SELECT il.id, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      UPDATE insumo_lotes SET cantidad_disponible = cantidad_disponible - v_a_consumir WHERE id = v_lote.id;

      INSERT INTO produccion_consumo (orden_produccion_id, insumo_lote_id, cantidad_consumida, costo)
      VALUES (v_item.orden_id, v_lote.id, v_a_consumir, v_a_consumir * v_lote.costo_unitario);

      INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
      VALUES ('consumo_produccion', v_ri.insumo_id, 'insumo_lote', v_lote.id, -v_a_consumir, v_lote.costo_unitario, 'orden_produccion', v_item.orden_id, v_user_id);

      v_costo_total := v_costo_total + (v_a_consumir * v_lote.costo_unitario);
      v_restante := v_restante - v_a_consumir;
    END LOOP;
  END LOOP;

  -- Lote de producto terminado
  INSERT INTO producto_lotes (
    producto_id, variante_id, codigo_lote, cantidad_inicial, cantidad_disponible,
    estado, costo_unitario, fecha_produccion, orden_produccion_id
  )
  VALUES (
    v_item.producto_id, v_item.variante_id,
    'LOTE-PT-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(COALESCE(v_orden.numero, ''), '-', ''), 1, 12),
    p_cantidad_producida, p_cantidad_producida, 'producido',
    v_costo_total / p_cantidad_producida, COALESCE(v_orden.fecha, CURRENT_DATE), v_item.orden_id
  )
  RETURNING id INTO v_lote_pt_id;

  INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
  VALUES (
    'entrada_produccion', v_item.producto_id, v_item.variante_id, 'producto_lote', v_lote_pt_id,
    p_cantidad_producida, v_costo_total / p_cantidad_producida, 'orden_produccion', v_item.orden_id, v_user_id
  );

  UPDATE orden_produccion_items
  SET cantidad_producida = p_cantidad_producida,
      estado = 'completada',
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id
  WHERE id = p_item_id;

  -- Recalcular estado del encabezado
  SELECT COUNT(*) INTO v_pendientes
  FROM orden_produccion_items
  WHERE orden_id = v_item.orden_id AND estado NOT IN ('completada', 'cancelada');

  UPDATE ordenes_produccion
  SET estado = CASE WHEN v_pendientes = 0 THEN 'completada'::estado_produccion ELSE 'en_proceso'::estado_produccion END
  WHERE id = v_item.orden_id;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_completar_item_produccion(UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 8. fn_explosion_materiales: la demanda de producción ahora sale de los ítems
-- ------------------------------------------------------------
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
        (ri.cantidad * (opi.cantidad_planificada / NULLIF(r.rendimiento, 0)))
        / (i.rendimiento_pct / 100.0)
        / (1 - (i.merma_pct / 100.0))
      ) AS cantidad
    FROM orden_produccion_items opi
    JOIN recetas r ON r.id = opi.receta_id
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i ON i.id = ri.insumo_id
    WHERE opi.orden_id = ANY(COALESCE(p_ordenes_ids, ARRAY[]::UUID[]))
      AND opi.estado = 'planificada'
    GROUP BY ri.insumo_id
  ),
  demanda_pedidos AS (
    SELECT ri.insumo_id,
      SUM(
        (ri.cantidad * ((dp.cantidad - COALESCE(dp.cantidad_entregada, 0)) / NULLIF(r.rendimiento, 0)))
        / (i.rendimiento_pct / 100.0)
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

-- ------------------------------------------------------------
-- 9. Limpieza: funciones por-orden obsoletas
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_preview_consumo_produccion(UUID, NUMERIC);
DROP FUNCTION IF EXISTS fn_completar_produccion(UUID, NUMERIC);
