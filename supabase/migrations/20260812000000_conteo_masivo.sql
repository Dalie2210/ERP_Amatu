-- ============================================================
-- MIGRACIÓN: Conteo masivo de inventario
-- ------------------------------------------------------------
-- Reactiva las tablas conteos_inventario / conteo_items (creadas en
-- 20260626_sprint_2a_01_schema.sql y sin uso hasta ahora — ver el encabezado de
-- 20260709_resumen_inventario_ajustes.sql) como registro formal de cada sesión
-- de conteo físico, y aplica todas las diferencias en una sola transacción.
--
-- SECURITY DEFINER + chequeo explícito de rol:
--   * insumo_lotes_insert / producto_lotes_update sólo admiten admin y logistica
--     (jefe_produccion nunca fue incluido en 20260726010000_produccion_procesos.sql),
--     así que con SECURITY INVOKER un jefe_produccion — que sí ve la página de
--     conteo — fallaría en ajustes positivos de insumo y dejaría el ledger
--     desincronizado del stock en PT.
--   * fn_get_user_role() devuelve NULL si el usuario está inactivo
--     (20260730000000_p0_hardening.sql), así que el chequeo también corta a
--     usuarios desactivados con JWT vigente.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_registrar_conteo(
  p_categoria categoria_conteo,
  p_motivo    TEXT,
  p_items     JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol        user_role := fn_get_user_role();
  v_conteo_id  UUID;
  v_item       JSONB;
  v_insumo_id  UUID;
  v_producto_id UUID;
  v_variante_id UUID;
  v_contada    NUMERIC;
  v_sistema    NUMERIC;
  v_diferencia NUMERIC;
  v_nota       TEXT;
  v_motivo     TEXT;
BEGIN
  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'logistica', 'jefe_produccion') THEN
    RAISE EXCEPTION 'No autorizado para registrar conteos de inventario';
  END IF;

  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo del conteo es requerido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El conteo no tiene ítems';
  END IF;

  INSERT INTO conteos_inventario (fecha, categoria, notas, created_by)
  VALUES (CURRENT_DATE, p_categoria, btrim(p_motivo), auth.uid())
  RETURNING id INTO v_conteo_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id   := NULLIF(v_item ->> 'insumo_id', '')::UUID;
    v_producto_id := NULLIF(v_item ->> 'producto_id', '')::UUID;
    v_variante_id := NULLIF(v_item ->> 'variante_id', '')::UUID;
    v_contada     := (v_item ->> 'cantidad_contada')::NUMERIC;
    v_nota        := NULLIF(btrim(COALESCE(v_item ->> 'nota', '')), '');

    IF v_contada IS NULL OR v_contada < 0 THEN
      RAISE EXCEPTION 'La cantidad contada debe ser un número mayor o igual a cero';
    END IF;

    IF (v_insumo_id IS NULL) = (v_producto_id IS NULL) THEN
      RAISE EXCEPTION 'Cada ítem debe referenciar exactamente un insumo o un producto';
    END IF;

    -- El stock del sistema se recalcula aquí: el valor que vio el navegador
    -- puede haber quedado obsoleto mientras se llenaba la planilla.
    IF v_insumo_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM insumos WHERE id = v_insumo_id) THEN
        RAISE EXCEPTION 'Insumo no encontrado';
      END IF;

      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_sistema
        FROM insumo_lotes
        WHERE insumo_id = v_insumo_id AND cantidad_disponible > 0;
    ELSE
      IF v_variante_id IS NULL THEN
        RAISE EXCEPTION 'Debe indicar la variante del producto';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM producto_variantes
        WHERE id = v_variante_id AND producto_id = v_producto_id
      ) THEN
        RAISE EXCEPTION 'Variante de producto no encontrada';
      END IF;

      -- Mismo criterio que la vista v_stock_productos usada por la página:
      -- el stock contable excluye lo ya despachado.
      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_sistema
        FROM producto_lotes
        WHERE variante_id = v_variante_id
          AND estado IN ('producido', 'empacado')
          AND cantidad_disponible > 0;
    END IF;

    -- Se registran todos los ítems contados, también los que coincidieron:
    -- "se contó y cuadró" es parte de la trazabilidad del conteo.
    INSERT INTO conteo_items (conteo_id, insumo_id, producto_id, variante_id, cantidad_sistema, cantidad_contada)
    VALUES (v_conteo_id, v_insumo_id, v_producto_id, v_variante_id, v_sistema, v_contada);

    v_diferencia := v_contada - v_sistema;

    IF v_diferencia <> 0 THEN
      v_motivo := btrim(p_motivo) || COALESCE(' — ' || v_nota, '');
      PERFORM fn_ajuste_inventario(
        v_insumo_id, v_producto_id, v_variante_id,
        v_diferencia, v_motivo, false
      );
    END IF;
  END LOOP;

  RETURN v_conteo_id;
END;
$$;

COMMENT ON FUNCTION fn_registrar_conteo(categoria_conteo, TEXT, JSONB) IS
  'Registra una sesión de conteo físico y aplica todas las diferencias vía fn_ajuste_inventario en una sola transacción. Devuelve el id del conteo.';

GRANT EXECUTE ON FUNCTION fn_registrar_conteo(categoria_conteo, TEXT, JSONB) TO authenticated;

-- Índices para la pestaña de histórico (listado por fecha y detalle por sesión).
CREATE INDEX IF NOT EXISTS idx_conteos_inventario_created_at ON conteos_inventario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conteos_inventario_categoria  ON conteos_inventario(categoria);
