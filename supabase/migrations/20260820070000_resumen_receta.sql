-- ============================================================
-- MIGRACIÓN: ERP-PROD-08 — Desglose de receta por insumo
--
-- Contexto: hoy el equipo consulta un Excel ("resumen recetas" / "amarre de
-- cocción") para saber, dado un número de porciones de una dieta, qué insumos
-- necesita y en qué cantidad. Ese archivo se mantiene aparte del ERP, así que
-- puede diverger de la receta realmente cargada — y cuando diverge, la planta
-- cocina según el Excel.
--
-- Esta función lo reemplaza. La garantía de que "coincide exactamente con la
-- receta base" no viene de replicar el cálculo con cuidado, sino de NO
-- replicarlo: consume los mismos dos helpers (fn_porciones_base y
-- fn_crudo_desde_cocido) que fn_preview_consumo_item y
-- fn_get_or_create_procesos_orden. Si algún día cambia la fórmula, cambia para
-- los tres a la vez.
--
-- Requiere haber aplicado 20260820030000_rpc_base_gramos.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_resumen_receta(
  p_producto_id UUID,
  p_cantidad    NUMERIC,
  p_variante_id UUID DEFAULT NULL
)
RETURNS TABLE(
  insumo_id          UUID,
  insumo_codigo      TEXT,
  insumo_nombre      TEXT,
  unidad_medida      unidad_medida,
  cocido_por_porcion NUMERIC,
  merma_pct          NUMERIC,
  rendimiento_pct    NUMERIC,
  factor_conversion  NUMERIC,
  cocido_total       NUMERIC,
  crudo_total        NUMERIC,
  stock_disponible   NUMERIC,
  faltante           NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_receta    recetas%ROWTYPE;
  v_porciones NUMERIC;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  -- Misma resolución que fn_explosion_materiales: se prefiere la receta
  -- específica de la presentación y se cae a la genérica de la dieta.
  SELECT r.* INTO v_receta
  FROM recetas r
  WHERE r.producto_id = p_producto_id
    AND r.is_active = true
    AND (r.variante_id = p_variante_id OR r.variante_id IS NULL)
  ORDER BY (r.variante_id IS NOT NULL) DESC, r.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta dieta no tiene una receta activa';
  END IF;

  v_porciones := fn_porciones_base(v_receta.id, p_variante_id, p_cantidad);
  IF v_porciones IS NULL OR v_porciones <= 0 THEN
    RAISE EXCEPTION 'La receta "%" no tiene una base válida (revisa su base en gramos y el gramaje de la presentación)', v_receta.nombre;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.codigo,
    i.nombre,
    i.unidad_medida,
    ri.cantidad,
    i.merma_pct,
    i.rendimiento_pct,
    fn_crudo_desde_cocido(1, i.rendimiento_pct, i.merma_pct),
    ri.cantidad * v_porciones,
    fn_crudo_desde_cocido(ri.cantidad * v_porciones, i.rendimiento_pct, i.merma_pct),
    COALESCE(vsi.stock_disponible, 0),
    GREATEST(
      COALESCE(fn_crudo_desde_cocido(ri.cantidad * v_porciones, i.rendimiento_pct, i.merma_pct), 0)
        - COALESCE(vsi.stock_disponible, 0),
      0
    )
  FROM receta_items ri
  JOIN insumos i ON i.id = ri.insumo_id
  LEFT JOIN v_stock_insumos vsi ON vsi.insumo_id = i.id
  WHERE ri.receta_id = v_receta.id
  ORDER BY i.nombre;
END;
$$;

COMMENT ON FUNCTION fn_resumen_receta(UUID, NUMERIC, UUID) IS
  'Desglose de insumos de una dieta para una cantidad dada (ERP-PROD-08). Reemplaza el Excel "resumen recetas"/"amarre de cocción". Usa los mismos helpers que el resto de producción, así que no puede divergir de la receta cargada.';

GRANT EXECUTE ON FUNCTION fn_resumen_receta(UUID, NUMERIC, UUID) TO authenticated;
