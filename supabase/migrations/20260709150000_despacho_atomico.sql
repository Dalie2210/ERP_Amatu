-- ============================================================================
-- P1.7 + P1.6 — Despacho de ruta atómico + advertencia de magistrales
-- ----------------------------------------------------------------------------
-- Antes el despacho corría remisiones (N RPC) y luego 2 UPDATE sueltos sin
-- transacción ni control de error: si el 2º UPDATE fallaba, la ruta quedaba
-- 'despachada' con pedidos inconsistentes.
--
-- fn_despachar_ruta ejecuta TODO en una sola transacción (la función plpgsql es
-- atómica): despacha remisiones por FEFO de cada pedido, marca la ruta y los
-- pedidos como despachados. Si algo lanza excepción, se revierte completo.
--
-- P1.6: los ítems magistrales se entregan sin descuento FEFO (consumo por gramo
-- pendiente). Aquí se emite una advertencia explícita para que quede VISIBLE en
-- el resultado del despacho y ops sepa que ese stock no se descontó.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_despachar_ruta(p_ruta_id uuid)
  RETURNS TABLE(
    numero_pedido   text,
    producto_nombre text,
    mensaje         text,
    advertencia     boolean
  ) LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_pedido        RECORD;
  v_items         JSONB;
  v_res           RECORD;
  v_mag           RECORD;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Recorrer los pedidos de la ruta
  FOR v_pedido IN
    SELECT pr.pedido_id, p.numero_pedido
    FROM pedido_ruta pr
    JOIN pedidos p ON p.id = pr.pedido_id
    WHERE pr.ruta_id = p_ruta_id
  LOOP
    -- Ítems pendientes de entregar (cantidad - cantidad_entregada > 0)
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('detalle_id', d.id, 'cantidad', d.cantidad - COALESCE(d.cantidad_entregada, 0))),
      '[]'::jsonb
    )
    INTO v_items
    FROM detalle_pedido d
    WHERE d.pedido_id = v_pedido.pedido_id
      AND (d.cantidad - COALESCE(d.cantidad_entregada, 0)) > 0;

    IF jsonb_array_length(v_items) > 0 THEN
      -- Despachar remisión (descuenta PT por FEFO, registra movimientos)
      FOR v_res IN SELECT * FROM fn_despachar_remision(v_pedido.pedido_id, v_items)
      LOOP
        IF v_res.advertencia THEN
          numero_pedido := v_pedido.numero_pedido;
          producto_nombre := v_res.producto_nombre;
          mensaje := v_res.mensaje;
          advertencia := true;
          RETURN NEXT;
        END IF;
      END LOOP;

      -- P1.6: advertencia explícita por cada línea magistral entregada sin
      -- descuento de inventario.
      FOR v_mag IN
        SELECT p.nombre AS prod_nombre
        FROM detalle_pedido d
        JOIN productos p ON p.id = d.producto_id
        WHERE d.pedido_id = v_pedido.pedido_id AND d.es_magistral = true
      LOOP
        numero_pedido := v_pedido.numero_pedido;
        producto_nombre := v_mag.prod_nombre;
        mensaje := 'Magistral entregado sin descuento de inventario (consumo por gramo pendiente)';
        advertencia := true;
        RETURN NEXT;
      END LOOP;
    END IF;
  END LOOP;

  -- Marcar ruta y pedidos como despachados (misma transacción)
  UPDATE rutas SET estado = 'despachada', despachada_en = v_now WHERE id = p_ruta_id;

  UPDATE pedidos SET estado = 'despachado', fecha_entrega_real = v_now
  WHERE id IN (SELECT pedido_id FROM pedido_ruta WHERE ruta_id = p_ruta_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_despachar_ruta(uuid) TO authenticated;
