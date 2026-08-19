-- ============================================================
-- MIGRACIÓN: ERP-PROD-09 (3/3) — Los RPCs pasan a usar la base en gramos
--
-- Contexto: 20260820020000 normalizó las recetas a una base en gramos y las
-- deduplicó, pero los cuatro consumidores siguen dividiendo por
-- `recetas.rendimiento`. Aquí se reemplazan todos por el par de helpers
-- (fn_porciones_base + fn_crudo_desde_cocido), que es ahora el único sitio
-- donde vive la regla.
--
-- Los números NO cambian: fn_porciones_base con base_gramos = rendimiento ×
-- gramaje devuelve exactamente `cantidad / rendimiento`, y cae a ese cálculo
-- legado cuando falta el gramaje. La verificación obligatoria está en el plan:
-- comparar cant_requerida_crudo de una orden histórica antes y después.
--
-- ⚠ Además corrige un defecto latente en fn_explosion_materiales que la
-- deduplicación habría activado en silencio (ver sección 5).
--
-- Requiere haber aplicado 20260820020000_receta_base_gramos.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. fn_porciones_base: cuántas veces cabe la base de la receta en lo que se
--    va a producir. Es el multiplicador que escala cada receta_items.cantidad.
--    Gemelo TS en src/lib/inventario/receta.ts::porcionesBase.
--
--    Si falta el gramaje de la variante cae al cálculo legado en lugar de
--    fallar: es preferible seguir dando el número de siempre a bloquear una
--    orden de producción por un dato de catálogo incompleto.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_porciones_base(
  p_receta_id   UUID,
  p_variante_id UUID,
  p_cantidad    NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_r    recetas%ROWTYPE;
  v_base NUMERIC;
  v_gram NUMERIC;
BEGIN
  IF p_cantidad IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_r FROM recetas WHERE id = p_receta_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_r.base_modo = 'unidades' THEN
    v_base := COALESCE(v_r.base_gramos, v_r.rendimiento);
    IF v_base IS NULL OR v_base <= 0 THEN RETURN NULL; END IF;
    RETURN p_cantidad / v_base;
  END IF;

  SELECT pv.gramaje_g INTO v_gram FROM producto_variantes pv WHERE pv.id = p_variante_id;

  IF v_gram IS NOT NULL AND v_gram > 0
     AND v_r.base_gramos IS NOT NULL AND v_r.base_gramos > 0 THEN
    RETURN (p_cantidad * v_gram) / v_r.base_gramos;
  END IF;

  IF v_r.rendimiento IS NOT NULL AND v_r.rendimiento > 0 THEN
    RETURN p_cantidad / v_r.rendimiento;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_porciones_base(UUID, UUID, NUMERIC) IS
  'Multiplicador que escala receta_items.cantidad para una cantidad dada de una presentación. Con base_modo=''gramos'': cantidad × gramaje / base_gramos. Respaldo legado a cantidad / rendimiento si falta el gramaje.';

GRANT EXECUTE ON FUNCTION fn_porciones_base(UUID, UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 2. fn_get_or_create_procesos_orden (reemplaza 20260726010000)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_or_create_procesos_orden(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO orden_produccion_procesos (orden_id, insumo_id, cant_requerida_crudo, orden_index)
  SELECT
    p_orden_id,
    d.insumo_id,
    d.crudo_total,
    (ROW_NUMBER() OVER (ORDER BY d.insumo_nombre) - 1)::INT AS orden_index
  FROM (
    SELECT
      ri.insumo_id,
      i.nombre AS insumo_nombre,
      SUM(
        fn_crudo_desde_cocido(
          ri.cantidad * fn_porciones_base(r.id, opi.variante_id, opi.cantidad_planificada),
          i.rendimiento_pct,
          i.merma_pct
        )
      ) AS crudo_total
    FROM orden_produccion_items opi
    JOIN recetas r       ON r.id = opi.receta_id
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i       ON i.id = ri.insumo_id
    WHERE opi.orden_id = p_orden_id
      AND i.tipo = 'materia_prima'
    GROUP BY ri.insumo_id, i.nombre
  ) d
  ON CONFLICT (orden_id, insumo_id)
  DO UPDATE SET cant_requerida_crudo = EXCLUDED.cant_requerida_crudo;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_or_create_procesos_orden(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. fn_preview_consumo_item (reemplaza 20260724020000)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_preview_consumo_item(
  p_item_id UUID,
  p_cantidad_producida NUMERIC
)
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
  v_item             orden_produccion_items%ROWTYPE;
  v_receta           recetas%ROWTYPE;
  v_porciones        NUMERIC;
  v_ri               RECORD;
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

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;

  SELECT * INTO v_receta FROM recetas WHERE id = v_item.receta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;

  v_porciones := fn_porciones_base(v_receta.id, v_item.variante_id, p_cantidad_producida);
  IF v_porciones IS NULL OR v_porciones <= 0 THEN
    RAISE EXCEPTION 'La receta "%" no tiene una base válida (revisa su base en gramos y el gramaje de la presentación)', v_receta.nombre;
  END IF;

  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, ri.unidad_medida, i.nombre AS insumo_nombre, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * v_porciones;
    v_crudo_req := fn_crudo_desde_cocido(v_cocido_total, v_ri.rendimiento_pct, v_ri.merma_pct);

    IF v_crudo_req IS NULL THEN
      RAISE EXCEPTION 'El insumo "%" tiene factores inválidos (rendimiento %%%, merma %%%)',
        v_ri.insumo_nombre, v_ri.rendimiento_pct, v_ri.merma_pct;
    END IF;

    v_restante := v_crudo_req;

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0;

    FOR v_lote IN
      SELECT il.id, il.codigo_lote, il.fecha_vencimiento, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      insumo_id := v_ri.insumo_id;
      insumo_nombre := v_ri.insumo_nombre;
      unidad_medida := v_ri.unidad_medida;
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
      insumo_id := v_ri.insumo_id;
      insumo_nombre := v_ri.insumo_nombre;
      unidad_medida := v_ri.unidad_medida;
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

GRANT EXECUTE ON FUNCTION fn_preview_consumo_item(UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- 4. fn_completar_item_produccion (reemplaza 20260729030000)
--    SOLO cambia cómo se calcula la cantidad requerida. El consumo FEFO, el
--    costeo del lote de PT, la validación de motivo, el recálculo de estados y
--    la reposición automática quedan EXACTAMENTE como estaban.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_completar_item_produccion(
  p_item_id UUID,
  p_cantidad_producida NUMERIC,
  p_motivo TEXT DEFAULT NULL
)
RETURNS TABLE(producto_lote_id UUID, costo_total NUMERIC, costo_unitario NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_item              orden_produccion_items%ROWTYPE;
  v_orden             ordenes_produccion%ROWTYPE;
  v_receta            recetas%ROWTYPE;
  v_porciones         NUMERIC;
  v_ri                RECORD;
  v_lote              RECORD;
  v_cocido_total      NUMERIC;
  v_crudo_requerido   NUMERIC;
  v_restante          NUMERIC;
  v_a_consumir        NUMERIC;
  v_disponible_total  NUMERIC;
  v_costo_total       NUMERIC := 0;
  v_lote_pt_id        UUID;
  v_user_id           UUID := auth.uid();
  v_nuevo_estado      estado_produccion;
  v_parciales         INTEGER;
  v_pendientes        INTEGER;
  v_activos_pendientes INTEGER;
  v_hay_diferencia    BOOLEAN;
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;
  IF v_item.estado = 'completada' THEN RAISE EXCEPTION 'El ítem ya fue completado'; END IF;
  IF v_item.estado = 'parcial' THEN RAISE EXCEPTION 'El ítem ya fue cerrado como parcial'; END IF;
  IF v_item.estado = 'cancelada' THEN RAISE EXCEPTION 'El ítem está cancelado'; END IF;
  IF v_item.receta_id IS NULL THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;

  v_hay_diferencia := p_cantidad_producida <> v_item.cantidad_planificada;

  IF v_hay_diferencia AND (p_motivo IS NULL OR btrim(p_motivo) = '') THEN
    RAISE EXCEPTION 'Debe indicar un motivo cuando la cantidad producida difiere de la planificada';
  END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = v_item.orden_id FOR UPDATE;

  SELECT * INTO v_receta FROM recetas WHERE id = v_item.receta_id;
  IF NOT FOUND OR NOT v_receta.is_active THEN RAISE EXCEPTION 'Receta no encontrada o inactiva'; END IF;

  v_porciones := fn_porciones_base(v_receta.id, v_item.variante_id, p_cantidad_producida);
  IF v_porciones IS NULL OR v_porciones <= 0 THEN
    RAISE EXCEPTION 'La receta "%" no tiene una base válida (revisa su base en gramos y el gramaje de la presentación)', v_receta.nombre;
  END IF;

  -- Validación previa (todo o nada): stock crudo suficiente por insumo
  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, i.nombre AS insumo_nombre, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * v_porciones;
    v_crudo_requerido := fn_crudo_desde_cocido(v_cocido_total, v_ri.rendimiento_pct, v_ri.merma_pct);

    IF v_crudo_requerido IS NULL THEN
      RAISE EXCEPTION 'El insumo "%" tiene factores inválidos (rendimiento %%%, merma %%%)',
        v_ri.insumo_nombre, v_ri.rendimiento_pct, v_ri.merma_pct;
    END IF;

    SELECT COALESCE(SUM(il.cantidad_disponible), 0) INTO v_disponible_total
      FROM insumo_lotes il WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0;

    IF v_disponible_total < v_crudo_requerido THEN
      RAISE EXCEPTION 'Stock insuficiente de %: requiere % (crudo) pero hay % disponible',
        v_ri.insumo_nombre, round(v_crudo_requerido, 2), round(v_disponible_total, 2);
    END IF;
  END LOOP;

  -- Consumo real FEFO
  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * v_porciones;
    v_crudo_requerido := fn_crudo_desde_cocido(v_cocido_total, v_ri.rendimiento_pct, v_ri.merma_pct);
    v_restante := v_crudo_requerido;

    FOR v_lote IN
      SELECT il.id, il.cantidad_disponible, il.costo_unitario
      FROM insumo_lotes il
      WHERE il.insumo_id = v_ri.insumo_id AND il.cantidad_disponible > 0
      ORDER BY il.fecha_vencimiento ASC NULLS LAST, il.created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_restante <= 0;
      v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

      UPDATE insumo_lotes SET cantidad_disponible = cantidad_disponible - v_a_consumir WHERE id = v_lote.id;

      INSERT INTO produccion_consumo (orden_produccion_id, insumo_lote_id, cantidad_consumida, costo)
      VALUES (v_item.orden_id, v_lote.id, v_a_consumir, v_a_consumir * v_lote.costo_unitario);

      INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
      VALUES ('consumo_produccion', v_ri.insumo_id, 'insumo_lote', v_lote.id, -v_a_consumir, v_lote.costo_unitario, 'orden_produccion', v_item.orden_id, v_user_id);

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
    v_item.producto_id, v_item.variante_id,
    'LOTE-PT-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(COALESCE(v_orden.numero, ''), '-', ''), 1, 12),
    p_cantidad_producida, p_cantidad_producida, 'producido',
    v_costo_total / p_cantidad_producida, COALESCE(v_orden.fecha, CURRENT_DATE), v_item.orden_id
  )
  RETURNING id INTO v_lote_pt_id;

  INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
  VALUES (
    'entrada_produccion', v_item.producto_id, v_item.variante_id, 'producto_lote', v_lote_pt_id,
    p_cantidad_producida, v_costo_total / p_cantidad_producida, 'orden_produccion', v_item.orden_id, v_user_id
  );

  -- 'parcial' sigue siendo exclusivo del faltante; producir de más queda completada.
  v_nuevo_estado := CASE WHEN p_cantidad_producida < v_item.cantidad_planificada THEN 'parcial' ELSE 'completada' END;

  UPDATE orden_produccion_items
  SET cantidad_producida = p_cantidad_producida,
      estado = v_nuevo_estado,
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id,
      motivo_diferencia = CASE WHEN v_hay_diferencia THEN btrim(p_motivo) ELSE NULL END
  WHERE id = p_item_id;

  -- Recalcular estado del encabezado
  SELECT
    count(*) FILTER (WHERE estado = 'parcial'),
    count(*) FILTER (WHERE estado NOT IN ('completada', 'cancelada')),
    count(*) FILTER (WHERE estado IN ('planificada', 'en_proceso'))
  INTO v_parciales, v_pendientes, v_activos_pendientes
  FROM orden_produccion_items
  WHERE orden_id = v_item.orden_id;

  UPDATE ordenes_produccion
  SET estado = CASE
    WHEN v_parciales > 0 THEN 'parcial'::estado_produccion
    WHEN v_pendientes = 0 THEN 'completada'::estado_produccion
    ELSE 'en_proceso'::estado_produccion
  END
  WHERE id = v_item.orden_id;

  -- Reposición automática: solo cuando la orden queda definitivamente
  -- 'parcial' (no le quedan ítems planificada/en_proceso por resolver).
  IF v_parciales > 0 AND v_activos_pendientes = 0 THEN
    IF NOT EXISTS (SELECT 1 FROM ordenes_produccion WHERE orden_origen_id = v_item.orden_id) THEN
      PERFORM fn_generar_orden_faltante(v_item.orden_id);
    END IF;
  END IF;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_completar_item_produccion(UUID, NUMERIC, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 5. fn_explosion_materiales (reemplaza 20260724020000)
--
--    ⚠ CORRECCIÓN CRÍTICA, no cosmética. El CTE demanda_pedidos unía recetas
--    con `r.variante_id = dp.variante_id OR (ambos NULL)`. Tras la
--    deduplicación de ERP-PROD-09 la receta canónica tiene variante_id NULL
--    mientras que detalle_pedido SIEMPRE trae variante_id, así que ninguna fila
--    habría casado y la demanda de pedidos habría caído a CERO sin lanzar
--    error — el peor modo de fallo posible en un reporte de compras.
--
--    El LATERAL prefiere la receta específica de la variante si existe y cae a
--    la genérica del producto si no, que es la semántica que el modelo nuevo
--    necesita.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_explosion_materiales(
  p_ordenes_ids UUID[] DEFAULT NULL,
  p_pedidos_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  insumo_id        UUID,
  insumo_codigo    TEXT,
  insumo_nombre    TEXT,
  unidad_medida    unidad_medida,
  demanda_total    NUMERIC,
  stock_disponible NUMERIC,
  faltante         NUMERIC,
  sugerido_comprar NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH demanda_produccion AS (
    SELECT ri.insumo_id,
      SUM(
        fn_crudo_desde_cocido(
          ri.cantidad * fn_porciones_base(r.id, opi.variante_id, opi.cantidad_planificada),
          i.rendimiento_pct,
          i.merma_pct
        )
      ) AS cantidad
    FROM orden_produccion_items opi
    JOIN recetas r       ON r.id = opi.receta_id
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i       ON i.id = ri.insumo_id
    WHERE opi.orden_id = ANY(COALESCE(p_ordenes_ids, ARRAY[]::UUID[]))
      AND opi.estado = 'planificada'
    GROUP BY ri.insumo_id
  ),
  demanda_pedidos AS (
    SELECT ri.insumo_id,
      SUM(
        fn_crudo_desde_cocido(
          ri.cantidad * fn_porciones_base(
            r.id, dp.variante_id, (dp.cantidad - COALESCE(dp.cantidad_entregada, 0))
          ),
          i.rendimiento_pct,
          i.merma_pct
        )
      ) AS cantidad
    FROM detalle_pedido dp
    JOIN LATERAL (
      SELECT rr.*
      FROM recetas rr
      WHERE rr.producto_id = dp.producto_id
        AND rr.is_active = true
        AND (rr.variante_id = dp.variante_id OR rr.variante_id IS NULL)
      ORDER BY (rr.variante_id IS NOT NULL) DESC, rr.created_at
      LIMIT 1
    ) r ON true
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i       ON i.id = ri.insumo_id
    WHERE dp.pedido_id = ANY(COALESCE(p_pedidos_ids, ARRAY[]::UUID[]))
      AND (dp.cantidad - COALESCE(dp.cantidad_entregada, 0)) > 0
    GROUP BY ri.insumo_id
  ),
  demanda_total AS (
    SELECT u.insumo_id, SUM(u.cantidad) AS cantidad
    FROM (
      SELECT * FROM demanda_produccion
      UNION ALL
      SELECT * FROM demanda_pedidos
    ) u
    GROUP BY u.insumo_id
  )
  SELECT
    dt.insumo_id,
    i.codigo,
    i.nombre,
    i.unidad_medida,
    dt.cantidad AS demanda_total,
    COALESCE(vsi.stock_disponible, 0) AS stock_disponible,
    GREATEST(dt.cantidad - COALESCE(vsi.stock_disponible, 0), 0) AS faltante,
    GREATEST(dt.cantidad - COALESCE(vsi.stock_disponible, 0), 0) AS sugerido_comprar
  FROM demanda_total dt
  JOIN insumos i ON i.id = dt.insumo_id
  LEFT JOIN v_stock_insumos vsi ON vsi.insumo_id = dt.insumo_id
  WHERE dt.cantidad IS NOT NULL
  ORDER BY faltante DESC, i.nombre ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_explosion_materiales(UUID[], UUID[]) TO authenticated;
