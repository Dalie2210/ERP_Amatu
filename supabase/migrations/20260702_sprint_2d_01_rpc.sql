-- ============================================================
-- MIGRACIÓN: Sprint 2D — Confirmación de venta, despacho con remisiones
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ============================================================

-- 0. RLS: logística necesita poder actualizar detalle_pedido.cantidad_entregada
-- al despachar (la política existente solo permitía admin/vendedor).
CREATE POLICY "detalle_update_logistica" ON detalle_pedido
  FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'logistica'::user_role)
  WITH CHECK (fn_get_user_role() = 'logistica'::user_role);

-- 1. fn_confirmar_venta(pedido_id, confirmar_pago)
-- Pasa el pedido a estado 'confirmado' (reserva lógica, no descuenta stock).
-- La demanda comprometida se calcula en vivo por la vista v_demanda_comprometida
-- (Σ de detalle_pedido de pedidos en confirmado/en_preparacion/listo_despacho).
-- Devuelve la explosión de componentes de ESTE pedido (vía v_componentes_venta)
-- como confirmación informativa de lo que quedó reservado.
CREATE OR REPLACE FUNCTION fn_confirmar_venta(p_pedido_id UUID, p_confirmar_pago BOOLEAN DEFAULT false)
RETURNS TABLE(producto_id UUID, variante_id UUID, cantidad_comprometida NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pedidos
  SET estado = 'confirmado',
      estado_pago = CASE WHEN p_confirmar_pago AND estado_pago = 'pendiente' THEN 'confirmado' ELSE estado_pago END
  WHERE id = p_pedido_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  RETURN QUERY
  SELECT cv.componente_producto_id, cv.componente_variante_id, SUM(cv.cantidad_componente)::NUMERIC
  FROM v_componentes_venta cv
  WHERE cv.pedido_id = p_pedido_id
  GROUP BY cv.componente_producto_id, cv.componente_variante_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_confirmar_venta(UUID, BOOLEAN) TO authenticated;

-- 2. fn_despachar_remision(pedido_id, items[{detalle_id, cantidad}])
-- Crea una remisión (entrega parcial o total) para un pedido: descuenta
-- producto_lotes por FEFO (estado empacado/producido), suma cantidad_entregada
-- en detalle_pedido y registra movimientos salida_despacho. Permite resultado
-- negativo en stock (alerta, no bloquea). Ítems magistrales (sin variante fija)
-- se registran como entregados sin descuento FEFO — v1, TODO: consumo por gramo.
CREATE OR REPLACE FUNCTION fn_despachar_remision(p_pedido_id UUID, p_items JSONB)
RETURNS TABLE(
  detalle_pedido_id UUID,
  producto_id UUID,
  variante_id UUID,
  producto_nombre TEXT,
  cantidad_solicitada NUMERIC,
  cantidad_entregada NUMERIC,
  advertencia BOOLEAN,
  mensaje TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_remision_id       UUID;
  v_user_id           UUID := auth.uid();
  v_item              JSONB;
  v_detalle           detalle_pedido%ROWTYPE;
  v_cantidad_solic    NUMERIC;
  v_restante          NUMERIC;
  v_disponible_total  NUMERIC;
  v_lote              RECORD;
  v_a_consumir        NUMERIC;
  v_entregado_total   NUMERIC;
  v_last_lote_id      UUID;
  v_last_costo        NUMERIC;
  v_producto_nombre   TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un ítem a despachar';
  END IF;

  INSERT INTO remisiones (pedido_id, fecha, created_by)
  VALUES (p_pedido_id, CURRENT_DATE, v_user_id)
  RETURNING id INTO v_remision_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_detalle
      FROM detalle_pedido
      WHERE id = (v_item->>'detalle_id')::UUID AND pedido_id = p_pedido_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ítem de pedido % no encontrado', v_item->>'detalle_id';
    END IF;

    v_cantidad_solic := (v_item->>'cantidad')::NUMERIC;
    IF v_cantidad_solic IS NULL OR v_cantidad_solic <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para el ítem %', v_detalle.id;
    END IF;

    SELECT p.nombre INTO v_producto_nombre FROM productos p WHERE p.id = v_detalle.producto_id;

    v_entregado_total := 0;
    v_disponible_total := NULL;

    IF v_detalle.es_magistral OR v_detalle.variante_id IS NULL THEN
      -- Magistral / sin variante fija: entrega sin descuento FEFO
      INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
      VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_cantidad_solic, NULL);
      v_entregado_total := v_cantidad_solic;
    ELSE
      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_disponible_total
        FROM producto_lotes
        WHERE producto_id = v_detalle.producto_id AND variante_id = v_detalle.variante_id
          AND estado IN ('empacado', 'producido') AND cantidad_disponible > 0;

      v_restante := v_cantidad_solic;
      v_last_lote_id := NULL;
      v_last_costo := 0;

      FOR v_lote IN
        SELECT id, cantidad_disponible, costo_unitario
        FROM producto_lotes
        WHERE producto_id = v_detalle.producto_id AND variante_id = v_detalle.variante_id
          AND estado IN ('empacado', 'producido') AND cantidad_disponible > 0
        ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

        UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_a_consumir WHERE id = v_lote.id;

        INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
        VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_a_consumir, v_lote.id);

        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
        VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, 'producto_lote', v_lote.id, -v_a_consumir, v_lote.costo_unitario, 'remision', v_remision_id, v_user_id);

        v_last_lote_id := v_lote.id;
        v_last_costo := v_lote.costo_unitario;
        v_entregado_total := v_entregado_total + v_a_consumir;
        v_restante := v_restante - v_a_consumir;
      END LOOP;

      IF v_restante > 0 THEN
        -- Stock insuficiente: se permite saldo negativo (alerta, no bloquea)
        IF v_last_lote_id IS NOT NULL THEN
          UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_restante WHERE id = v_last_lote_id;

          INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
          VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_restante, v_last_lote_id);

          INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
          VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, 'producto_lote', v_last_lote_id, -v_restante, v_last_costo, 'remision', v_remision_id, v_user_id, 'Stock insuficiente: saldo negativo');
        ELSE
          INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
          VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_restante, NULL);

          INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
          VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, NULL, NULL, -v_restante, 0, 'remision', v_remision_id, v_user_id, 'Stock insuficiente: sin lotes disponibles');
        END IF;
        v_entregado_total := v_entregado_total + v_restante;
      END IF;
    END IF;

    UPDATE detalle_pedido SET cantidad_entregada = cantidad_entregada + v_entregado_total WHERE id = v_detalle.id;

    detalle_pedido_id := v_detalle.id;
    producto_id := v_detalle.producto_id;
    variante_id := v_detalle.variante_id;
    producto_nombre := v_producto_nombre;
    cantidad_solicitada := v_cantidad_solic;
    cantidad_entregada := v_entregado_total;
    advertencia := v_disponible_total IS NOT NULL AND v_disponible_total < v_cantidad_solic;
    mensaje := CASE WHEN advertencia THEN
      'Stock insuficiente: disponible ' || round(v_disponible_total, 2) || ', solicitado ' || round(v_cantidad_solic, 2)
      ELSE NULL END;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_despachar_remision(UUID, JSONB) TO authenticated;
