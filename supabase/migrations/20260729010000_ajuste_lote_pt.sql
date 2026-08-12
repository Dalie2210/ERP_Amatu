-- ============================================================
-- MIGRACIÓN: Ajuste en sitio de un lote de producto terminado
--
-- Contexto: fn_ajuste_inventario resuelve el ajuste manual "por producto +
-- variante", pero su rama positiva de PT crea un lote sintético nuevo
-- ('AJUSTE-' || timestamp) sin fecha_vencimiento ni orden_produccion_id.
-- Para un alimento perecedero eso rompe FEFO y trazabilidad cuando la
-- diferencia pertenece físicamente a un lote concreto (ej: se produjeron
-- 120 porciones y al empacar salieron 121 por mejor rendimiento).
--
-- Esta función ajusta el lote EN SITIO, preservando codigo_lote,
-- fecha_vencimiento, orden_produccion_id y estado. Reutiliza el mismo
-- vocabulario ya establecido: enum tipo_movimiento (ajuste_positivo /
-- ajuste_negativo) y el ledger movimientos_inventario, por lo que los
-- ajustes aparecen automáticamente en fn_resumen_inventario (Balance).
--
-- Tratamiento del costo (asimétrico a propósito):
--   * Sobrante (+): el costo TOTAL del lote no cambia — se consumieron los
--     mismos insumos — y costo_unitario se recalcula a la baja. Refleja el
--     mejor rendimiento real y no infla el valor del inventario.
--   * Faltante (-): costo_unitario NO se toca. Una pérdida se gasta, no se
--     capitaliza encareciendo las unidades que quedan.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_ajustar_lote_pt(
  p_lote_id         UUID,
  p_cantidad        NUMERIC,                      -- firmado: >0 sobrante, <0 faltante
  p_motivo          TEXT,
  p_referencia_tipo TEXT DEFAULT 'ajuste_lote_pt'
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote         producto_lotes%ROWTYPE;
  v_user_id      UUID := auth.uid();
  v_tipo         tipo_movimiento;
  v_valor_total  NUMERIC;
  v_nueva_inicial NUMERIC;
  v_nuevo_costo  NUMERIC;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo del ajuste es requerido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad = 0 THEN
    RAISE EXCEPTION 'La cantidad del ajuste debe ser distinta de cero';
  END IF;

  SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;

  v_tipo := CASE WHEN p_cantidad > 0 THEN 'ajuste_positivo'::tipo_movimiento
                 ELSE 'ajuste_negativo'::tipo_movimiento END;

  IF p_cantidad > 0 THEN
    -- Guarda anti-tecleo: un sobrante que duplica el lote es un error de
    -- digitación (1210 en vez de 121), no un mejor rendimiento.
    IF p_cantidad > v_lote.cantidad_inicial THEN
      RAISE EXCEPTION 'Sobrante inválido: % supera el tamaño del lote (%). Verifica la cantidad ingresada',
        p_cantidad, v_lote.cantidad_inicial;
    END IF;

    -- Dilución: mismo valor total repartido entre más unidades.
    v_valor_total   := v_lote.cantidad_inicial * v_lote.costo_unitario;
    v_nueva_inicial := v_lote.cantidad_inicial + p_cantidad;
    v_nuevo_costo   := CASE WHEN v_nueva_inicial > 0 THEN v_valor_total / v_nueva_inicial
                            ELSE v_lote.costo_unitario END;

    UPDATE producto_lotes
    SET cantidad_inicial    = v_nueva_inicial,
        cantidad_disponible = cantidad_disponible + p_cantidad,
        costo_unitario      = v_nuevo_costo
    WHERE id = p_lote_id;
  ELSE
    IF v_lote.cantidad_disponible + p_cantidad < 0 THEN
      RAISE EXCEPTION 'Ajuste inválido: el lote solo tiene % disponible', v_lote.cantidad_disponible;
    END IF;

    v_nuevo_costo := v_lote.costo_unitario;

    UPDATE producto_lotes
    SET cantidad_disponible = cantidad_disponible + p_cantidad
    WHERE id = p_lote_id;
  END IF;

  INSERT INTO movimientos_inventario (
    tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad,
    costo_unitario, referencia_tipo, referencia_id, usuario_id, notas
  )
  VALUES (
    v_tipo, v_lote.producto_id, v_lote.variante_id, 'producto_lote', p_lote_id, p_cantidad,
    v_nuevo_costo, p_referencia_tipo, p_lote_id, v_user_id,
    btrim(p_motivo) || ' (lote ' || v_lote.codigo_lote || ')'
  );
END;
$$;

COMMENT ON FUNCTION fn_ajustar_lote_pt(UUID, NUMERIC, TEXT, TEXT) IS
  'Ajusta la cantidad de un lote de PT en sitio, preservando su identidad (código, vencimiento, orden de origen). Un sobrante diluye el costo unitario manteniendo el valor total del lote; un faltante deja el costo unitario intacto.';

GRANT EXECUTE ON FUNCTION fn_ajustar_lote_pt(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
