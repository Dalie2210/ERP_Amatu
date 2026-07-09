-- ============================================================
-- MIGRACIÓN: Sprint 2C — Recetas, producción, PT
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ============================================================

-- 1. fn_preview_consumo_produccion(orden_id, cantidad_producida)
-- Simula (sin escribir) el consumo FEFO de insumos para una orden de producción,
-- devolviendo el detalle por lote y si hay stock suficiente por insumo.
CREATE OR REPLACE FUNCTION fn_preview_consumo_produccion(p_orden_id UUID, p_cantidad_producida NUMERIC)
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
  v_orden            ordenes_produccion%ROWTYPE;
  v_receta           recetas%ROWTYPE;
  v_item             RECORD;
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

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;

  SELECT * INTO v_receta FROM recetas WHERE id = v_orden.receta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no tiene receta asociada'; END IF;
  IF v_receta.rendimiento <= 0 THEN RAISE EXCEPTION 'La receta tiene un rendimiento inválido'; END IF;

  FOR v_item IN
    SELECT ri.insumo_id, ri.cantidad, ri.unidad_medida, i.nombre AS insumo_nombre, i.merma_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_item.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_req := v_cocido_total / (1 - (v_item.merma_pct / 100.0));
    v_restante := v_crudo_req;

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_item.insumo_id AND il.cantidad_disponible > 0;

    FOR v_lote IN
      SELECT il.id, il.codigo_lote, il.fecha_vencimiento, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_item.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      insumo_id := v_item.insumo_id;
      insumo_nombre := v_item.insumo_nombre;
      unidad_medida := v_item.unidad_medida;
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
      insumo_id := v_item.insumo_id;
      insumo_nombre := v_item.insumo_nombre;
      unidad_medida := v_item.unidad_medida;
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

GRANT EXECUTE ON FUNCTION fn_preview_consumo_produccion(UUID, NUMERIC) TO authenticated;

-- 2. fn_completar_produccion(orden_id, cantidad_producida)
-- Explota la receta (cocido -> crudo por merma), consume insumo_lotes por FEFO
-- (fecha_vencimiento ASC NULLS LAST, created_at ASC), registra produccion_consumo,
-- crea producto_lotes (estado producido) y movimientos consumo_produccion + entrada_produccion.
-- Todo o nada: si no hay stock crudo suficiente de algún insumo, aborta sin escribir nada.
CREATE OR REPLACE FUNCTION fn_completar_produccion(p_orden_id UUID, p_cantidad_producida NUMERIC)
RETURNS TABLE(producto_lote_id UUID, costo_total NUMERIC, costo_unitario NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden             ordenes_produccion%ROWTYPE;
  v_receta            recetas%ROWTYPE;
  v_item              RECORD;
  v_lote              RECORD;
  v_cocido_total      NUMERIC;
  v_crudo_requerido   NUMERIC;
  v_restante          NUMERIC;
  v_a_consumir        NUMERIC;
  v_disponible_total  NUMERIC;
  v_costo_total       NUMERIC := 0;
  v_lote_pt_id        UUID;
  v_user_id           UUID := auth.uid();
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado = 'completada' THEN RAISE EXCEPTION 'La orden ya fue completada'; END IF;
  IF v_orden.estado = 'cancelada' THEN RAISE EXCEPTION 'La orden está cancelada'; END IF;
  IF v_orden.receta_id IS NULL THEN RAISE EXCEPTION 'La orden no tiene receta asociada'; END IF;

  SELECT * INTO v_receta FROM recetas WHERE id = v_orden.receta_id;
  IF NOT FOUND OR NOT v_receta.is_active THEN RAISE EXCEPTION 'Receta no encontrada o inactiva'; END IF;
  IF v_receta.rendimiento <= 0 THEN RAISE EXCEPTION 'La receta tiene un rendimiento inválido'; END IF;

  -- Validación previa (todo o nada): stock crudo suficiente por insumo
  FOR v_item IN
    SELECT ri.insumo_id, ri.cantidad, i.nombre AS insumo_nombre, i.merma_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_item.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (1 - (v_item.merma_pct / 100.0));

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_item.insumo_id AND il.cantidad_disponible > 0;

    IF v_disponible_total < v_crudo_requerido THEN
      RAISE EXCEPTION 'Stock insuficiente de %: requiere % (crudo) pero hay % disponible',
        v_item.insumo_nombre, round(v_crudo_requerido, 2), round(v_disponible_total, 2);
    END IF;
  END LOOP;

  -- Consumo real FEFO
  FOR v_item IN
    SELECT ri.insumo_id, ri.cantidad, i.merma_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_item.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (1 - (v_item.merma_pct / 100.0));
    v_restante := v_crudo_requerido;

    FOR v_lote IN
      SELECT il.id, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_item.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      UPDATE insumo_lotes SET cantidad_disponible = cantidad_disponible - v_a_consumir WHERE id = v_lote.id;

      INSERT INTO produccion_consumo (orden_produccion_id, insumo_lote_id, cantidad_consumida, costo)
      VALUES (p_orden_id, v_lote.id, v_a_consumir, v_a_consumir * v_lote.costo_unitario);

      INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
      VALUES ('consumo_produccion', v_item.insumo_id, 'insumo_lote', v_lote.id, -v_a_consumir, v_lote.costo_unitario, 'orden_produccion', p_orden_id, v_user_id);

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
    v_orden.producto_id, v_orden.variante_id,
    'LOTE-PT-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(v_orden.numero, '-', ''), 1, 12),
    p_cantidad_producida, p_cantidad_producida, 'producido',
    v_costo_total / p_cantidad_producida, v_orden.fecha, p_orden_id
  )
  RETURNING id INTO v_lote_pt_id;

  INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
  VALUES (
    'entrada_produccion', v_orden.producto_id, v_orden.variante_id, 'producto_lote', v_lote_pt_id,
    p_cantidad_producida, v_costo_total / p_cantidad_producida, 'orden_produccion', p_orden_id, v_user_id
  );

  UPDATE ordenes_produccion
  SET cantidad_producida = p_cantidad_producida,
      estado = 'completada',
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id
  WHERE id = p_orden_id;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_completar_produccion(UUID, NUMERIC) TO authenticated;

-- 3. fn_empacar_lote(lote_id, cantidad)
-- Divide (parcial o totalmente) un producto_lotes en estado 'producido' hacia 'empacado':
-- descuenta cantidad_disponible del lote origen y crea un nuevo lote 'empacado' con esa cantidad.
CREATE OR REPLACE FUNCTION fn_empacar_lote(p_lote_id UUID, p_cantidad NUMERIC)
RETURNS TABLE(nuevo_lote_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote     producto_lotes%ROWTYPE;
  v_nuevo_id UUID;
  v_user_id  UUID := auth.uid();
BEGIN
  SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF v_lote.estado <> 'producido' THEN
    RAISE EXCEPTION 'Solo se pueden empacar lotes en estado producido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > v_lote.cantidad_disponible THEN
    RAISE EXCEPTION 'Cantidad inválida: debe ser mayor a cero y no exceder el disponible (%)', v_lote.cantidad_disponible;
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

GRANT EXECUTE ON FUNCTION fn_empacar_lote(UUID, NUMERIC) TO authenticated;
