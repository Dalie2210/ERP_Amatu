-- ============================================================
-- MIGRACIÓN: Editar y anular ingresos de compra
--
-- Contexto: hasta ahora un ingreso de materia prima solo se podía crear
-- (fn_registrar_ingreso). Si se registraba mal (cantidad, precio, insumo
-- equivocado) la única salida era un Ajuste de Inventario manual, sin
-- ningún vínculo con el ingreso original. Esta migración agrega:
--   1. Un vínculo insumo_lotes -> ingreso_items para poder ubicar
--      exactamente el lote que generó cada ítem de un ingreso.
--   2. Columnas de anulación (soft-delete) en ingresos.
--   3. fn_registrar_ingreso actualizado para poblar ese vínculo.
--   4. fn_anular_ingreso: revierte el efecto en inventario y marca el
--      ingreso como anulado, dejando rastro completo en
--      movimientos_inventario.
--   5. fn_editar_ingreso: revierte los ítems actuales y registra los
--      nuevos, preservando en movimientos_inventario la traza completa
--      (compra original -> reversión -> compra corregida).
-- Ambas funciones bloquean la operación si algún lote del ingreso ya fue
-- consumido (producción, ajuste, etc.), igual que
-- fn_cancelar_orden_produccion bloquea si ya hay producción registrada.
-- ============================================================

-- 1. Vínculo lote <-> ítem de ingreso
ALTER TABLE insumo_lotes ADD COLUMN IF NOT EXISTS ingreso_item_id UUID REFERENCES ingreso_items(id);

-- Backfill best-effort para lotes creados antes de esta migración,
-- emparejando por movimientos_inventario (ingreso_compra) + insumo_id.
-- Si un ingreso tiene varios ítems del mismo insumo, puede quedar sin
-- backfillear (ambiguo); en ese caso fn_anular_ingreso/fn_editar_ingreso
-- bloquearán la operación pidiendo usar un Ajuste de Inventario.
WITH candidatos AS (
  SELECT DISTINCT ON (mi.lote_id)
    mi.lote_id,
    ii.id AS ingreso_item_id
  FROM movimientos_inventario mi
  JOIN ingreso_items ii
    ON ii.ingreso_id = mi.referencia_id
   AND ii.insumo_id = mi.insumo_id
  WHERE mi.tipo = 'ingreso_compra'
    AND mi.referencia_tipo = 'ingreso'
    AND mi.lote_id IS NOT NULL
  ORDER BY mi.lote_id, mi.created_at
)
UPDATE insumo_lotes il
SET ingreso_item_id = c.ingreso_item_id
FROM candidatos c
WHERE il.id = c.lote_id
  AND il.ingreso_item_id IS NULL;

-- 2. Columnas de anulación (soft-delete) en ingresos
ALTER TABLE ingresos
  ADD COLUMN IF NOT EXISTS anulado        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anulado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS anulado_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anulado_por    UUID        REFERENCES users(id);

-- 3. fn_registrar_ingreso: igual que antes, pero guarda ingreso_item_id
--    en el lote que crea.
CREATE OR REPLACE FUNCTION fn_registrar_ingreso(p_cabecera JSONB, p_items JSONB)
RETURNS TABLE(ingreso_id UUID, numero TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_ingreso_id      UUID;
  v_user_id         UUID := auth.uid();
  v_item            JSONB;
  v_item_id         UUID;
  v_insumo_id       UUID;
  v_cantidad        NUMERIC;
  v_precio_compra   NUMERIC;
  v_precio_unitario NUMERIC;
  v_codigo_lote     TEXT;
  v_fecha_venc      DATE;
  v_fecha_ingreso   DATE;
  v_lote_id         UUID;
  v_total_disp      NUMERIC;
  v_total_valor     NUMERIC;
  v_total_costo     NUMERIC := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos un ítem';
  END IF;

  v_fecha_ingreso := COALESCE((p_cabecera->>'fecha')::DATE, CURRENT_DATE);

  INSERT INTO ingresos (tipo_ingreso, proveedor, fecha, temperatura_llegada, placa_vehiculo, notas, created_by)
  VALUES (
    (p_cabecera->>'tipo_ingreso')::tipo_insumo,
    NULLIF(p_cabecera->>'proveedor', ''),
    v_fecha_ingreso,
    NULLIF(p_cabecera->>'temperatura_llegada', '')::NUMERIC,
    NULLIF(p_cabecera->>'placa_vehiculo', ''),
    NULLIF(p_cabecera->>'notas', ''),
    v_user_id
  )
  RETURNING id INTO v_ingreso_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id     := (v_item->>'insumo_id')::UUID;
    v_cantidad      := (v_item->>'cantidad')::NUMERIC;
    v_precio_compra := (v_item->>'precio_compra')::NUMERIC;
    v_codigo_lote   := COALESCE(NULLIF(v_item->>'codigo_lote', ''), 'LOTE-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(v_insumo_id::TEXT, 1, 4));
    v_fecha_venc    := NULLIF(v_item->>'fecha_vencimiento', '')::DATE;

    IF v_insumo_id IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 OR v_precio_compra IS NULL OR v_precio_compra < 0 THEN
      RAISE EXCEPTION 'Ítem de ingreso inválido: insumo_id, cantidad (>0) y precio_compra (>=0) son requeridos';
    END IF;

    v_precio_unitario := v_precio_compra / v_cantidad;

    INSERT INTO ingreso_items (ingreso_id, insumo_id, cantidad, precio_compra, codigo_lote, fecha_vencimiento)
    VALUES (v_ingreso_id, v_insumo_id, v_cantidad, v_precio_compra, v_codigo_lote, v_fecha_venc)
    RETURNING id INTO v_item_id;

    INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento, ingreso_item_id)
    VALUES (v_insumo_id, v_codigo_lote, v_cantidad, v_cantidad, v_precio_unitario, NULLIF(p_cabecera->>'proveedor', ''), v_fecha_ingreso, v_fecha_venc, v_item_id)
    RETURNING id INTO v_lote_id;

    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
    VALUES ('ingreso_compra', v_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, v_precio_unitario, 'ingreso', v_ingreso_id, v_user_id);

    -- Costo promedio ponderado sobre todos los lotes con saldo positivo del insumo
    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_insumo_id;

    v_total_costo := v_total_costo + v_precio_compra;
  END LOOP;

  UPDATE ingresos SET total_costo = v_total_costo WHERE id = v_ingreso_id;

  RETURN QUERY SELECT v_ingreso_id, i.numero FROM ingresos i WHERE i.id = v_ingreso_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_registrar_ingreso(JSONB, JSONB) TO authenticated;

-- 4. fn_reversar_ingreso_items (interna): revierte todos los ítems
--    actuales de un ingreso -- usada tanto por fn_anular_ingreso como por
--    fn_editar_ingreso. Bloquea si algún lote ya fue consumido/ajustado
--    (cantidad_disponible <> cantidad_inicial) o si no tiene vínculo
--    (dato previo a esta migración que no se pudo emparejar).
CREATE OR REPLACE FUNCTION fn_reversar_ingreso_items(p_ingreso_id UUID, p_referencia_tipo TEXT, p_notas TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_row         RECORD;
  v_total_disp  NUMERIC;
  v_total_valor NUMERIC;
BEGIN
  -- Guardia: todos los lotes de este ingreso deben seguir intactos
  FOR v_row IN
    SELECT ii.id AS item_id, i.nombre AS insumo_nombre, il.id AS lote_id,
           il.cantidad_inicial, il.cantidad_disponible
    FROM ingreso_items ii
    JOIN insumos i ON i.id = ii.insumo_id
    LEFT JOIN insumo_lotes il ON il.ingreso_item_id = ii.id
    WHERE ii.ingreso_id = p_ingreso_id
  LOOP
    IF v_row.lote_id IS NULL THEN
      RAISE EXCEPTION 'No se puede modificar el ingreso: el ítem de "%" no tiene un lote vinculado (registro anterior a esta funcionalidad). Usa un Ajuste de Inventario para corregirlo.', v_row.insumo_nombre;
    END IF;
    IF v_row.cantidad_disponible <> v_row.cantidad_inicial THEN
      RAISE EXCEPTION 'No se puede modificar el ingreso: el lote de "%" ya fue consumido o ajustado parcialmente. Usa un Ajuste de Inventario para corregir el saldo.', v_row.insumo_nombre;
    END IF;
  END LOOP;

  -- Reversión: pone cada lote en 0 y registra el movimiento de reversión
  FOR v_row IN
    SELECT ii.insumo_id, il.id AS lote_id, il.cantidad_inicial, il.costo_unitario
    FROM ingreso_items ii
    JOIN insumo_lotes il ON il.ingreso_item_id = ii.id
    WHERE ii.ingreso_id = p_ingreso_id
  LOOP
    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES ('ajuste_negativo', v_row.insumo_id, 'insumo_lote', v_row.lote_id, -v_row.cantidad_inicial, v_row.costo_unitario, p_referencia_tipo, p_ingreso_id, v_user_id, p_notas);

    UPDATE insumo_lotes SET cantidad_disponible = 0 WHERE id = v_row.lote_id;

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_row.insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_row.insumo_id;
  END LOOP;
END;
$$;

-- 5. fn_anular_ingreso: revierte el efecto en inventario y marca el
--    ingreso como anulado (soft-delete, con trazabilidad completa).
CREATE OR REPLACE FUNCTION fn_anular_ingreso(p_ingreso_id UUID, p_motivo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_anulado BOOLEAN;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de anulación es requerido';
  END IF;

  SELECT anulado INTO v_anulado FROM ingresos WHERE id = p_ingreso_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'El ingreso ya está anulado';
  END IF;

  PERFORM fn_reversar_ingreso_items(p_ingreso_id, 'ingreso_anulado', p_motivo);

  UPDATE ingresos
    SET anulado = true, anulado_motivo = p_motivo, anulado_at = now(), anulado_por = v_user_id
    WHERE id = p_ingreso_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_anular_ingreso(UUID, TEXT) TO authenticated;

-- 6. fn_editar_ingreso: revierte los ítems actuales y registra los
--    nuevos, dejando en movimientos_inventario la traza completa
--    (compra original -> reversión -> compra corregida).
CREATE OR REPLACE FUNCTION fn_editar_ingreso(p_ingreso_id UUID, p_cabecera JSONB, p_items JSONB)
RETURNS TABLE(ingreso_id UUID, numero TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_anulado         BOOLEAN;
  v_item            JSONB;
  v_item_id         UUID;
  v_insumo_id       UUID;
  v_cantidad        NUMERIC;
  v_precio_compra   NUMERIC;
  v_precio_unitario NUMERIC;
  v_codigo_lote     TEXT;
  v_fecha_venc      DATE;
  v_fecha_ingreso   DATE;
  v_lote_id         UUID;
  v_total_disp      NUMERIC;
  v_total_valor     NUMERIC;
  v_total_costo     NUMERIC := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos un ítem';
  END IF;

  SELECT anulado INTO v_anulado FROM ingresos WHERE id = p_ingreso_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'No se puede editar un ingreso anulado';
  END IF;

  PERFORM fn_reversar_ingreso_items(p_ingreso_id, 'ingreso_editado', 'Reversión por edición de ingreso');

  DELETE FROM ingreso_items WHERE ingreso_id = p_ingreso_id;

  v_fecha_ingreso := COALESCE((p_cabecera->>'fecha')::DATE, CURRENT_DATE);

  UPDATE ingresos
    SET tipo_ingreso        = (p_cabecera->>'tipo_ingreso')::tipo_insumo,
        proveedor           = NULLIF(p_cabecera->>'proveedor', ''),
        fecha               = v_fecha_ingreso,
        temperatura_llegada = NULLIF(p_cabecera->>'temperatura_llegada', '')::NUMERIC,
        placa_vehiculo      = NULLIF(p_cabecera->>'placa_vehiculo', ''),
        notas               = NULLIF(p_cabecera->>'notas', '')
    WHERE id = p_ingreso_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id     := (v_item->>'insumo_id')::UUID;
    v_cantidad      := (v_item->>'cantidad')::NUMERIC;
    v_precio_compra := (v_item->>'precio_compra')::NUMERIC;
    v_codigo_lote   := COALESCE(NULLIF(v_item->>'codigo_lote', ''), 'LOTE-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(v_insumo_id::TEXT, 1, 4));
    v_fecha_venc    := NULLIF(v_item->>'fecha_vencimiento', '')::DATE;

    IF v_insumo_id IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 OR v_precio_compra IS NULL OR v_precio_compra < 0 THEN
      RAISE EXCEPTION 'Ítem de ingreso inválido: insumo_id, cantidad (>0) y precio_compra (>=0) son requeridos';
    END IF;

    v_precio_unitario := v_precio_compra / v_cantidad;

    INSERT INTO ingreso_items (ingreso_id, insumo_id, cantidad, precio_compra, codigo_lote, fecha_vencimiento)
    VALUES (p_ingreso_id, v_insumo_id, v_cantidad, v_precio_compra, v_codigo_lote, v_fecha_venc)
    RETURNING id INTO v_item_id;

    INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento, ingreso_item_id)
    VALUES (v_insumo_id, v_codigo_lote, v_cantidad, v_cantidad, v_precio_unitario, NULLIF(p_cabecera->>'proveedor', ''), v_fecha_ingreso, v_fecha_venc, v_item_id)
    RETURNING id INTO v_lote_id;

    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES ('ingreso_compra', v_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, v_precio_unitario, 'ingreso_editado', p_ingreso_id, v_user_id, 'Corrección de ingreso');

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_insumo_id;

    v_total_costo := v_total_costo + v_precio_compra;
  END LOOP;

  UPDATE ingresos SET total_costo = v_total_costo WHERE id = p_ingreso_id;

  RETURN QUERY SELECT p_ingreso_id, i.numero FROM ingresos i WHERE i.id = p_ingreso_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_editar_ingreso(UUID, JSONB, JSONB) TO authenticated;
