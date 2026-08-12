-- ============================================================
-- MIGRACIÓN: Sobrante de empaque en fn_empacar_lote
--
-- Contexto: hoy empacar más de lo disponible en el lote lanza
-- 'Cantidad inválida...' y no hay salida. El caso real es que se
-- produjeron 120 porciones y al empacar salen 121 (mejor rendimiento).
--
-- Se agrega p_motivo_sobrante (opcional), siguiendo el mismo patrón con el
-- que la migración de parciales extendió fn_completar_item_produccion:
--   * sin motivo  -> se conserva el candado actual (protege contra tecleo)
--   * con motivo  -> se registra el excedente vía fn_ajustar_lote_pt y se
--                    continúa el empaque, todo en la misma transacción.
--
-- Importante: el sobrante NO debe corregirse inflando cantidad_producida en
-- la orden, porque fn_completar_item_produccion consume insumos de forma
-- proporcional y descontaría materia prima que nunca se usó.
-- ============================================================

-- La firma antigua (UUID, NUMERIC) quedaría como sobrecarga ambigua frente a
-- la nueva con DEFAULT; se elimina explícitamente.
DROP FUNCTION IF EXISTS fn_empacar_lote(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION fn_empacar_lote(
  p_lote_id         UUID,
  p_cantidad        NUMERIC,
  p_motivo_sobrante TEXT DEFAULT NULL
)
RETURNS TABLE(nuevo_lote_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote     producto_lotes%ROWTYPE;
  v_nuevo_id UUID;
  v_user_id  UUID := auth.uid();
  v_sobrante NUMERIC;
BEGIN
  SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF v_lote.estado <> 'producido' THEN
    RAISE EXCEPTION 'Solo se pueden empacar lotes en estado producido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Cantidad inválida: debe ser mayor a cero';
  END IF;

  IF p_cantidad > v_lote.cantidad_disponible THEN
    IF p_motivo_sobrante IS NULL OR btrim(p_motivo_sobrante) = '' THEN
      RAISE EXCEPTION 'Cantidad inválida: debe ser mayor a cero y no exceder el disponible (%). Si realmente salieron unidades de más, indica el motivo del sobrante',
        v_lote.cantidad_disponible;
    END IF;

    v_sobrante := p_cantidad - v_lote.cantidad_disponible;

    -- Registra el excedente sobre el mismo lote (conserva código, vencimiento
    -- y orden de origen) y diluye su costo unitario. No toca insumos.
    PERFORM fn_ajustar_lote_pt(p_lote_id, v_sobrante, btrim(p_motivo_sobrante), 'sobrante_empaque');

    -- Releer: cantidad_disponible y costo_unitario cambiaron.
    SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id FOR UPDATE;
  END IF;

  UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - p_cantidad WHERE id = p_lote_id;

  INSERT INTO producto_lotes (
    producto_id, variante_id, codigo_lote, cantidad_inicial, cantidad_disponible,
    estado, costo_unitario, fecha_produccion, fecha_vencimiento, orden_produccion_id
  )
  VALUES (
    v_lote.producto_id, v_lote.variante_id, v_lote.codigo_lote, p_cantidad, p_cantidad,
    'empacado', v_lote.costo_unitario, v_lote.fecha_produccion, v_lote.fecha_vencimiento, v_lote.orden_produccion_id
  )
  RETURNING id INTO v_nuevo_id;

  INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
  VALUES (
    'empaque', v_lote.producto_id, v_lote.variante_id, 'producto_lote', v_nuevo_id,
    p_cantidad, v_lote.costo_unitario, 'producto_lote', p_lote_id, v_user_id,
    'Empacado desde lote ' || v_lote.codigo_lote
  );

  RETURN QUERY SELECT v_nuevo_id;
END;
$$;

COMMENT ON FUNCTION fn_empacar_lote(UUID, NUMERIC, TEXT) IS
  'Mueve cantidad de un lote PT "producido" a un nuevo lote "empacado". Si la cantidad excede lo disponible, requiere p_motivo_sobrante y registra el excedente como ajuste sobre el lote origen (sin consumir insumos).';

GRANT EXECUTE ON FUNCTION fn_empacar_lote(UUID, NUMERIC, TEXT) TO authenticated;
