-- ============================================================
-- MIGRACIÓN: Sprint 2B — Insumos, ingresos y costo promedio
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ============================================================

-- 1. NUMERACIÓN AUTOMÁTICA DE insumos.codigo (por tipo_insumo)
CREATE TABLE insumo_codigo_seq (
  tipo           tipo_insumo PRIMARY KEY,
  ultimo_numero  INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE insumo_codigo_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insumo_codigo_seq_rw" ON insumo_codigo_seq FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_generar_codigo_insumo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  IF NEW.codigo IS NOT NULL THEN RETURN NEW; END IF;

  v_prefix := CASE NEW.tipo
    WHEN 'materia_prima'  THEN 'MP'
    WHEN 'producto_seco'  THEN 'PS'
    WHEN 'aseo'           THEN 'AS'
    WHEN 'empaque'        THEN 'EMP'
  END;

  INSERT INTO insumo_codigo_seq (tipo, ultimo_numero) VALUES (NEW.tipo, 1)
    ON CONFLICT (tipo) DO UPDATE SET ultimo_numero = insumo_codigo_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;

  NEW.codigo := v_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_insumo_codigo BEFORE INSERT ON insumos FOR EACH ROW EXECUTE FUNCTION fn_generar_codigo_insumo();

-- 2. fn_registrar_ingreso(cabecera, items[])
-- cabecera: { tipo_ingreso, proveedor, fecha, temperatura_llegada, placa_vehiculo, notas }
-- items[]:  { insumo_id, cantidad, precio_compra, codigo_lote, fecha_vencimiento }
-- Inserta ingresos + ingreso_items, crea un insumo_lotes por ítem, registra movimiento
-- ingreso_compra y recalcula insumos.costo_promedio (promedio ponderado de lotes con saldo positivo).
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
    VALUES (v_ingreso_id, v_insumo_id, v_cantidad, v_precio_compra, v_codigo_lote, v_fecha_venc);

    INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento)
    VALUES (v_insumo_id, v_codigo_lote, v_cantidad, v_cantidad, v_precio_unitario, NULLIF(p_cabecera->>'proveedor', ''), v_fecha_ingreso, v_fecha_venc)
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
