-- ============================================================
-- MIGRACIÓN: Cierre parcial de órdenes de producción
--
-- Contexto: al completar un ítem con cantidad_producida menor a la
-- planificada, hoy igual queda 'completada' y el faltante se pierde.
-- Se introduce el estado 'parcial' (agregado en la migración anterior):
-- el ítem/orden queda registrado como parcial con un motivo obligatorio,
-- y se ofrece una función para generar una nueva orden de producción
-- por el faltante, enlazada a la original (trazabilidad).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columnas nuevas
-- ------------------------------------------------------------
ALTER TABLE orden_produccion_items ADD COLUMN motivo_parcial TEXT;
ALTER TABLE ordenes_produccion ADD COLUMN orden_origen_id UUID REFERENCES ordenes_produccion(id);

COMMENT ON COLUMN orden_produccion_items.motivo_parcial IS
  'Motivo obligatorio cuando el ítem queda en estado parcial (cantidad_producida < cantidad_planificada).';
COMMENT ON COLUMN ordenes_produccion.orden_origen_id IS
  'Si esta orden fue generada como reposición del faltante de otra orden parcial, referencia a esa orden origen.';

-- ------------------------------------------------------------
-- 2. fn_completar_item_produccion: agrega p_motivo y estado 'parcial'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_completar_item_produccion(
  p_item_id UUID,
  p_cantidad_producida NUMERIC,
  p_motivo TEXT DEFAULT NULL
)
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
  v_nuevo_estado      estado_produccion;
  v_parciales         INTEGER;
  v_pendientes        INTEGER;
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;
  IF v_item.estado = 'completada' THEN RAISE EXCEPTION 'El ítem ya fue completado'; END IF;
  IF v_item.estado = 'parcial' THEN RAISE EXCEPTION 'El ítem ya fue cerrado como parcial'; END IF;
  IF v_item.estado = 'cancelada' THEN RAISE EXCEPTION 'El ítem está cancelado'; END IF;
  IF v_item.receta_id IS NULL THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;

  IF p_cantidad_producida < v_item.cantidad_planificada AND (p_motivo IS NULL OR btrim(p_motivo) = '') THEN
    RAISE EXCEPTION 'Debe indicar un motivo cuando la cantidad producida es menor a la planificada';
  END IF;

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

  v_nuevo_estado := CASE WHEN p_cantidad_producida < v_item.cantidad_planificada THEN 'parcial' ELSE 'completada' END;

  UPDATE orden_produccion_items
  SET cantidad_producida = p_cantidad_producida,
      estado = v_nuevo_estado,
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id,
      motivo_parcial = CASE WHEN v_nuevo_estado = 'parcial' THEN btrim(p_motivo) ELSE NULL END
  WHERE id = p_item_id;

  -- Recalcular estado del encabezado: si algún ítem quedó parcial, la
  -- orden completa se marca 'parcial' para que se note que necesita revisión.
  SELECT
    count(*) FILTER (WHERE estado = 'parcial'),
    count(*) FILTER (WHERE estado NOT IN ('completada', 'cancelada'))
  INTO v_parciales, v_pendientes
  FROM orden_produccion_items
  WHERE orden_id = v_item.orden_id;

  UPDATE ordenes_produccion
  SET estado = CASE
    WHEN v_parciales > 0 THEN 'parcial'::estado_produccion
    WHEN v_pendientes = 0 THEN 'completada'::estado_produccion
    ELSE 'en_proceso'::estado_produccion
  END
  WHERE id = v_item.orden_id;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_completar_item_produccion(UUID, NUMERIC, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3. fn_generar_orden_faltante: crea una nueva orden con el faltante
--    de cada ítem 'parcial' de la orden origen, enlazada por orden_origen_id.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generar_orden_faltante(p_orden_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden        ordenes_produccion%ROWTYPE;
  v_nueva_id     UUID;
  v_item         RECORD;
  v_creados      INTEGER := 0;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado <> 'parcial' THEN RAISE EXCEPTION 'Solo se puede generar reposición de una orden en estado parcial'; END IF;

  IF EXISTS (SELECT 1 FROM ordenes_produccion WHERE orden_origen_id = p_orden_id) THEN
    RAISE EXCEPTION 'Ya existe una orden de reposición generada para esta orden';
  END IF;

  INSERT INTO ordenes_produccion (estado, fecha, notas, created_by, orden_origen_id)
  VALUES ('planificada', CURRENT_DATE, 'Reposición de orden ' || COALESCE(v_orden.numero, p_orden_id::TEXT), auth.uid(), p_orden_id)
  RETURNING id INTO v_nueva_id;

  FOR v_item IN
    SELECT producto_id, variante_id, receta_id, (cantidad_planificada - COALESCE(cantidad_producida, 0)) AS faltante
    FROM orden_produccion_items
    WHERE orden_id = p_orden_id AND estado = 'parcial'
  LOOP
    IF v_item.faltante > 0 THEN
      INSERT INTO orden_produccion_items (orden_id, producto_id, variante_id, receta_id, cantidad_planificada, estado)
      VALUES (v_nueva_id, v_item.producto_id, v_item.variante_id, v_item.receta_id, v_item.faltante, 'planificada');
      v_creados := v_creados + 1;
    END IF;
  END LOOP;

  IF v_creados = 0 THEN
    RAISE EXCEPTION 'No hay faltante pendiente para generar una orden de reposición';
  END IF;

  RETURN v_nueva_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_generar_orden_faltante(UUID) TO authenticated;
