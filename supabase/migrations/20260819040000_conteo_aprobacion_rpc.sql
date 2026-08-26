-- ============================================================
-- MIGRACIÓN: ERP-ADM-02 — Flujo de aprobación de conteos (RPC)
-- ------------------------------------------------------------
-- Reemplaza fn_registrar_conteo (misma firma) para que YA NO aplique los
-- ajustes de inventario al registrar — solo dejan la sesión en 'pendiente'
-- (o 'aplicado' directo si no hay ninguna diferencia, porque no hay nada que
-- aprobar). Agrega fn_aprobar_conteo / fn_rechazar_conteo, admin-only, que
-- son el único camino para transicionar el estado y — en el caso de
-- aprobar — el único lugar donde el stock realmente cambia.
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
  v_rol         user_role := fn_get_user_role();
  v_conteo_id   UUID;
  v_item        JSONB;
  v_insumo_id   UUID;
  v_producto_id UUID;
  v_variante_id UUID;
  v_contada     NUMERIC;
  v_sistema     NUMERIC;
  v_nota        TEXT;
  v_tiene_diferencias BOOLEAN := false;
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

  -- Se inserta como 'pendiente' (default de la columna); si al final no hay
  -- ninguna diferencia se corrige a 'aplicado' sin pasar por aprobación.
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

    -- Snapshot del stock del sistema al momento del registro (solo para
    -- mostrar al usuario que contó); fn_aprobar_conteo lo recalcula en vivo
    -- antes de aplicar, porque el stock pudo moverse mientras el conteo
    -- esperaba aprobación.
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

      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_sistema
        FROM producto_lotes
        WHERE variante_id = v_variante_id
          AND estado IN ('producido', 'empacado')
          AND cantidad_disponible > 0;
    END IF;

    INSERT INTO conteo_items (conteo_id, insumo_id, producto_id, variante_id, cantidad_sistema, cantidad_contada)
    VALUES (v_conteo_id, v_insumo_id, v_producto_id, v_variante_id, v_sistema, v_contada);

    IF v_contada <> v_sistema THEN
      v_tiene_diferencias := true;
    END IF;
  END LOOP;

  IF v_tiene_diferencias THEN
    INSERT INTO notificaciones (tipo, titulo, mensaje, entidad_tipo, entidad_id, destinatario_id)
    VALUES (
      'conteo_pendiente',
      'Conteo pendiente de aprobación',
      'Conteo de ' || p_categoria || ' con diferencias registrado por revisar',
      'conteo_inventario', v_conteo_id, NULL
    );
  ELSE
    -- Nada que aprobar: no quedan diferencias que autorizar.
    UPDATE conteos_inventario SET estado = 'aplicado' WHERE id = v_conteo_id;
  END IF;

  RETURN v_conteo_id;
END;
$$;

COMMENT ON FUNCTION fn_registrar_conteo(categoria_conteo, TEXT, JSONB) IS
  'Registra una sesión de conteo físico. Si hay diferencias queda pendiente de aprobación (ver fn_aprobar_conteo); si no, se marca aplicada de inmediato sin tocar stock.';

GRANT EXECUTE ON FUNCTION fn_registrar_conteo(categoria_conteo, TEXT, JSONB) TO authenticated;


CREATE OR REPLACE FUNCTION fn_aprobar_conteo(p_conteo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol                user_role := fn_get_user_role();
  v_estado              estado_conteo;
  v_notas                TEXT;
  v_item                RECORD;
  v_sistema_actual      NUMERIC;
  v_diferencia_actual   NUMERIC;
BEGIN
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar conteos';
  END IF;

  SELECT estado, notas INTO v_estado, v_notas
    FROM conteos_inventario WHERE id = p_conteo_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Conteo no encontrado'; END IF;
  IF v_estado <> 'pendiente' THEN RAISE EXCEPTION 'El conteo ya fue revisado'; END IF;

  -- Recalcula el sistema en vivo: el stock pudo moverse desde el registro
  -- (ventas, producción, otro ajuste) mientras el conteo esperaba aprobación.
  FOR v_item IN SELECT * FROM conteo_items WHERE conteo_id = p_conteo_id LOOP
    IF v_item.insumo_id IS NOT NULL THEN
      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_sistema_actual
        FROM insumo_lotes WHERE insumo_id = v_item.insumo_id AND cantidad_disponible > 0;
    ELSE
      SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_sistema_actual
        FROM producto_lotes WHERE variante_id = v_item.variante_id
          AND estado IN ('producido', 'empacado') AND cantidad_disponible > 0;
    END IF;

    v_diferencia_actual := v_item.cantidad_contada - v_sistema_actual;

    -- diferencia es GENERATED ALWAYS AS (cantidad_contada - cantidad_sistema)
    -- STORED: no se asigna directamente, se recalcula sola al actualizar
    -- cantidad_sistema.
    UPDATE conteo_items
      SET cantidad_sistema = v_sistema_actual
      WHERE id = v_item.id;

    IF v_diferencia_actual <> 0 THEN
      PERFORM fn_ajuste_inventario(
        v_item.insumo_id, v_item.producto_id, v_item.variante_id,
        v_diferencia_actual, 'Conteo aprobado #' || p_conteo_id, false
      );
    END IF;
  END LOOP;

  UPDATE conteos_inventario
    SET estado = 'aplicado', revisado_por = auth.uid(), revisado_at = now()
    WHERE id = p_conteo_id;
END;
$$;

COMMENT ON FUNCTION fn_aprobar_conteo(UUID) IS
  'Admin-only. Recalcula las diferencias en vivo y aplica los ajustes de inventario vía fn_ajuste_inventario; marca el conteo como aplicado.';

GRANT EXECUTE ON FUNCTION fn_aprobar_conteo(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION fn_rechazar_conteo(p_conteo_id UUID, p_motivo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol    user_role := fn_get_user_role();
  v_estado estado_conteo;
BEGIN
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede rechazar conteos';
  END IF;
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de rechazo es requerido';
  END IF;

  SELECT estado INTO v_estado FROM conteos_inventario WHERE id = p_conteo_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Conteo no encontrado'; END IF;
  IF v_estado <> 'pendiente' THEN RAISE EXCEPTION 'El conteo ya fue revisado'; END IF;

  UPDATE conteos_inventario
    SET estado = 'rechazado', motivo_rechazo = btrim(p_motivo),
        revisado_por = auth.uid(), revisado_at = now()
    WHERE id = p_conteo_id;
END;
$$;

COMMENT ON FUNCTION fn_rechazar_conteo(UUID, TEXT) IS
  'Admin-only. Marca el conteo como rechazado sin tocar stock; requiere un motivo.';

GRANT EXECUTE ON FUNCTION fn_rechazar_conteo(UUID, TEXT) TO authenticated;
