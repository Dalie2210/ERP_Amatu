-- ============================================================
-- MIGRACIÓN: Motivo obligatorio en ambas direcciones al cerrar producción
--
-- Contexto: fn_completar_item_produccion solo valida el caso "se produjo de
-- menos" (exige motivo, marca 'parcial', genera reposición). Cerrar con más
-- de lo planificado pasa en silencio, pese a que el consumo de insumos es
-- proporcional a cantidad_producida — es decir, produce un descuento real de
-- materia prima que nadie justificó.
--
-- Se generaliza la validación a cualquier diferencia y se renombra
-- motivo_parcial -> motivo_diferencia, que ya no describe solo el faltante.
--
-- NO cambia la lógica de estados: 'parcial' sigue siendo exclusivo del caso
-- "<" y la reposición automática se mantiene igual. Producir de más queda
-- 'completada' con su motivo registrado.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Renombrar la columna
-- ------------------------------------------------------------
ALTER TABLE orden_produccion_items RENAME COLUMN motivo_parcial TO motivo_diferencia;

COMMENT ON COLUMN orden_produccion_items.motivo_diferencia IS
  'Motivo obligatorio cuando cantidad_producida difiere de cantidad_planificada, en cualquier dirección. Si es menor el ítem queda en estado parcial; si es mayor queda completada.';

-- ------------------------------------------------------------
-- 2. fn_completar_item_produccion: validación simétrica
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
  v_activos_pendientes INTEGER;
  v_hay_diferencia    BOOLEAN;
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

  v_hay_diferencia := p_cantidad_producida <> v_item.cantidad_planificada;

  IF v_hay_diferencia AND (p_motivo IS NULL OR btrim(p_motivo) = '') THEN
    RAISE EXCEPTION 'Debe indicar un motivo cuando la cantidad producida difiere de la planificada';
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

  -- 'parcial' sigue siendo exclusivo del faltante; producir de más queda completada.
  v_nuevo_estado := CASE WHEN p_cantidad_producida < v_item.cantidad_planificada THEN 'parcial' ELSE 'completada' END;

  UPDATE orden_produccion_items
  SET cantidad_producida = p_cantidad_producida,
      estado = v_nuevo_estado,
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id,
      motivo_diferencia = CASE WHEN v_hay_diferencia THEN btrim(p_motivo) ELSE NULL END
  WHERE id = p_item_id;

  -- Recalcular estado del encabezado
  SELECT
    count(*) FILTER (WHERE estado = 'parcial'),
    count(*) FILTER (WHERE estado NOT IN ('completada', 'cancelada')),
    count(*) FILTER (WHERE estado IN ('planificada', 'en_proceso'))
  INTO v_parciales, v_pendientes, v_activos_pendientes
  FROM orden_produccion_items
  WHERE orden_id = v_item.orden_id;

  UPDATE ordenes_produccion
  SET estado = CASE
    WHEN v_parciales > 0 THEN 'parcial'::estado_produccion
    WHEN v_pendientes = 0 THEN 'completada'::estado_produccion
    ELSE 'en_proceso'::estado_produccion
  END
  WHERE id = v_item.orden_id;

  -- Reposición automática: solo cuando la orden queda definitivamente
  -- 'parcial' (no le quedan ítems planificada/en_proceso por resolver).
  IF v_parciales > 0 AND v_activos_pendientes = 0 THEN
    IF NOT EXISTS (SELECT 1 FROM ordenes_produccion WHERE orden_origen_id = v_item.orden_id) THEN
      PERFORM fn_generar_orden_faltante(v_item.orden_id);
    END IF;
  END IF;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_completar_item_produccion(UUID, NUMERIC, TEXT) TO authenticated;
