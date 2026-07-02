-- ============================================================
-- MIGRACIÓN: Sprint 2D — Ajuste manual de inventario (insumo o PT)
-- Usado por /inventario/ajustes y para aplicar diferencias de /inventario/conteo
-- ============================================================

CREATE OR REPLACE FUNCTION fn_ajuste_inventario(
  p_insumo_id UUID,
  p_producto_id UUID,
  p_variante_id UUID,
  p_cantidad NUMERIC,
  p_motivo TEXT,
  p_es_merma BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_tipo        tipo_movimiento;
  v_cantidad    NUMERIC;
  v_restante    NUMERIC;
  v_a_mover     NUMERIC;
  v_lote        RECORD;
  v_lote_id     UUID;
  v_costo       NUMERIC;
  v_total_disp  NUMERIC;
  v_total_valor NUMERIC;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo del ajuste es requerido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad = 0 THEN
    RAISE EXCEPTION 'La cantidad del ajuste debe ser distinta de cero';
  END IF;
  IF (p_insumo_id IS NULL) = (p_producto_id IS NULL) THEN
    RAISE EXCEPTION 'Debe indicar exactamente un insumo o un producto';
  END IF;
  IF p_producto_id IS NOT NULL AND p_variante_id IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la variante del producto';
  END IF;

  v_cantidad := CASE WHEN p_es_merma THEN -ABS(p_cantidad) ELSE p_cantidad END;
  v_tipo := CASE WHEN p_es_merma THEN 'merma'::tipo_movimiento
                 WHEN v_cantidad > 0 THEN 'ajuste_positivo'::tipo_movimiento
                 ELSE 'ajuste_negativo'::tipo_movimiento END;

  IF p_insumo_id IS NOT NULL THEN
    SELECT costo_promedio INTO v_costo FROM insumos WHERE id = p_insumo_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

    IF v_cantidad > 0 THEN
      INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, fecha_ingreso)
      VALUES (p_insumo_id, 'AJUSTE-' || to_char(now(), 'YYYYMMDDHH24MISS'), v_cantidad, v_cantidad, COALESCE(v_costo, 0), CURRENT_DATE)
      RETURNING id INTO v_lote_id;

      INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
      VALUES (v_tipo, p_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo);
    ELSE
      v_restante := ABS(v_cantidad);

      FOR v_lote IN
        SELECT id, cantidad_disponible, costo_unitario FROM insumo_lotes
        WHERE insumo_id = p_insumo_id AND cantidad_disponible > 0
        ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_mover := LEAST(v_restante, v_lote.cantidad_disponible);
        UPDATE insumo_lotes SET cantidad_disponible = cantidad_disponible - v_a_mover WHERE id = v_lote.id;

        INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_insumo_id, 'insumo_lote', v_lote.id, -v_a_mover, v_lote.costo_unitario, 'ajuste_manual', v_user_id, p_motivo);

        v_restante := v_restante - v_a_mover;
      END LOOP;

      IF v_restante > 0 THEN
        INSERT INTO movimientos_inventario (tipo, insumo_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_insumo_id, -v_restante, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo || ' (saldo negativo)');
      END IF;
    END IF;

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = p_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE costo_promedio END
      WHERE id = p_insumo_id;
  ELSE
    IF v_cantidad > 0 THEN
      SELECT costo_unitario INTO v_costo FROM producto_lotes
        WHERE producto_id = p_producto_id AND variante_id = p_variante_id
        ORDER BY created_at DESC LIMIT 1;

      INSERT INTO producto_lotes (producto_id, variante_id, codigo_lote, cantidad_inicial, cantidad_disponible, estado, costo_unitario, fecha_produccion)
      VALUES (p_producto_id, p_variante_id, 'AJUSTE-' || to_char(now(), 'YYYYMMDDHH24MISS'), v_cantidad, v_cantidad, 'producido', COALESCE(v_costo, 0), CURRENT_DATE)
      RETURNING id INTO v_lote_id;

      INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
      VALUES (v_tipo, p_producto_id, p_variante_id, 'producto_lote', v_lote_id, v_cantidad, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo);
    ELSE
      v_restante := ABS(v_cantidad);

      FOR v_lote IN
        SELECT id, cantidad_disponible, costo_unitario FROM producto_lotes
        WHERE producto_id = p_producto_id AND variante_id = p_variante_id
          AND estado IN ('empacado', 'producido') AND cantidad_disponible > 0
        ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_mover := LEAST(v_restante, v_lote.cantidad_disponible);
        UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_a_mover WHERE id = v_lote.id;

        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_producto_id, p_variante_id, 'producto_lote', v_lote.id, -v_a_mover, v_lote.costo_unitario, 'ajuste_manual', v_user_id, p_motivo);

        v_restante := v_restante - v_a_mover;
      END LOOP;

      IF v_restante > 0 THEN
        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_producto_id, p_variante_id, -v_restante, 0, 'ajuste_manual', v_user_id, p_motivo || ' (saldo negativo)');
      END IF;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_ajuste_inventario(UUID, UUID, UUID, NUMERIC, TEXT, BOOLEAN) TO authenticated;
