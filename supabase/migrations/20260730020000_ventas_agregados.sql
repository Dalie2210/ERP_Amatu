-- ============================================================================
-- FASE 2b — E2: agregaciones sin cota → RPC con SUM()/COUNT() en SQL
-- ----------------------------------------------------------------------------
-- Seis consultas traían el histórico completo al cliente para reducirlo en JS
-- (una de ellas, el desglose por aliado de /ventas, con un .find() anidado en
-- el bucle → O(n²)). Aquí se agregan en la base y se devuelve solo el resumen,
-- de modo que el costo de los dashboards deja de crecer con el histórico.
--
-- Todas son SECURITY INVOKER a propósito: el aislamiento por vendedor lo sigue
-- aplicando RLS (un vendedor agrega solo sus pedidos, admin/contable todos).
--
-- Las tres funciones existentes de 20260710160000_ventas_stats_agregadas.sql se
-- recrean con parámetros de período: se hace DROP previo porque añadir
-- parámetros con DEFAULT crea una sobrecarga ambigua en vez de reemplazar.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Resumen de ventas por rango (sustituye ventas/page.tsx:122-125 y
--    getDashboardStats.ts:38-42)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_ventas_resumen_periodo(
  p_desde           timestamptz DEFAULT NULL,
  p_hasta           timestamptz DEFAULT NULL,
  p_estados         text[]      DEFAULT NULL,
  p_excluir_estados text[]      DEFAULT NULL
)
  RETURNS TABLE(revenue numeric, pedidos_count bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(p.total), 0)::numeric AS revenue,
         COUNT(*)::bigint                   AS pedidos_count
  FROM pedidos p
  WHERE (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
    AND (p_estados IS NULL OR p.estado::text = ANY (p_estados))
    AND (p_excluir_estados IS NULL OR NOT (p.estado::text = ANY (p_excluir_estados)));
$$;

-- ----------------------------------------------------------------------------
-- 2. Resumen de comisiones por rango (sustituye ventas/page.tsx:128-131 y
--    getDashboardStats.ts:317-321)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_comisiones_resumen(
  p_desde             timestamptz DEFAULT NULL,
  p_hasta             timestamptz DEFAULT NULL,
  p_solo_sin_liquidar boolean     DEFAULT false,
  p_solo_aplica       boolean     DEFAULT false
)
  RETURNS TABLE(monto_total numeric, comisiones_count bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(cd.monto_comision), 0)::numeric AS monto_total,
         COUNT(*)::bigint                             AS comisiones_count
  FROM comisiones_detalle cd
  WHERE (p_desde IS NULL OR cd.created_at >= p_desde)
    AND (p_hasta IS NULL OR cd.created_at <  p_hasta)
    AND (NOT p_solo_sin_liquidar OR cd.liquidacion_id IS NULL)
    AND (NOT p_solo_aplica       OR cd.aplica_comision = true);
$$;

-- ----------------------------------------------------------------------------
-- 3. Meta Ads del período (sustituye ventas/page.tsx:132-139)
-- ----------------------------------------------------------------------------
-- Antes: `count` de filas de leads_meta_ads sobre TODO el histórico (no la suma
-- de cantidad_leads, que es la métrica real) y `count` de cierres también sobre
-- todo el histórico. La tasa de cierre resultante no correspondía a ningún
-- período. Aquí se replica el criterio de fn_get_cierre_meta_actual: leads por
-- periodo_mes y cierres en la ventana 25-a-25 de ese período.
CREATE OR REPLACE FUNCTION public.fn_meta_ads_resumen(p_periodo_mes text)
  RETURNS TABLE(total_leads bigint, total_cierres bigint)
  LANGUAGE plpgsql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
DECLARE
  -- Ventana 25-a-25 del período, igual que fn_get_cierre_meta_actual.
  v_base_date     DATE := TO_DATE(p_periodo_mes || '-01', 'YYYY-MM-DD');
  v_periodo_start DATE := (v_base_date - INTERVAL '6 days')::DATE;
  v_periodo_end   DATE := (v_base_date + INTERVAL '24 days')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(l.cantidad_leads), 0)::bigint
     FROM leads_meta_ads l WHERE l.periodo_mes = p_periodo_mes),
    (SELECT COUNT(*)::bigint
     FROM pedidos p
     WHERE p.fuente = 'meta_ads'
       AND p.numero_venta_cliente = 1
       AND p.estado <> 'devolucion'
       AND p.created_at AT TIME ZONE 'America/Bogota' >= v_periodo_start::timestamp
       AND p.created_at AT TIME ZONE 'America/Bogota' <  v_periodo_end::timestamp);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Desglose por aliado (sustituye ventas/page.tsx:146-150 + el O(n²) de JS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_ventas_aliado_breakdown(
  p_desde timestamptz DEFAULT NULL,
  p_hasta timestamptz DEFAULT NULL
)
  RETURNS TABLE(
    fuente        fuente_cliente,
    aliado_id     uuid,
    aliado_nombre text,
    pedidos_count bigint,
    total         numeric
  )
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT p.fuente, p.aliado_id, a.nombre,
         COUNT(*)::bigint,
         COALESCE(SUM(p.total), 0)::numeric
  FROM pedidos p
  JOIN aliados a ON a.id = p.aliado_id
  WHERE p.fuente IN ('referido_veterinario', 'referido_entrenador')
    AND p.aliado_id IS NOT NULL
    AND (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
  GROUP BY p.fuente, p.aliado_id, a.nombre
  ORDER BY COALESCE(SUM(p.total), 0) DESC;
$$;

-- ----------------------------------------------------------------------------
-- 5. Resumen de inventario (sustituye getDashboardStats.ts:65-67, que traía las
--    tres vistas completas para reducirlas en JS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_inventario_resumen()
  RETURNS TABLE(
    valor_total         numeric,
    insumos_bajo_minimo bigint,
    lotes_por_vencer    bigint,
    pt_producido        numeric,
    pt_empacado         numeric,
    pt_despachado       numeric
  )
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COALESCE(SUM(v.valor_total), 0)::numeric FROM v_valor_inventario v),
    (SELECT COUNT(*)::bigint FROM v_stock_insumos s WHERE s.bajo_minimo),
    (SELECT COALESCE(SUM(s.lotes_por_vencer), 0)::bigint FROM v_stock_insumos s),
    (SELECT COALESCE(SUM(pr.stock_disponible), 0)::numeric FROM v_stock_productos pr WHERE pr.estado::text = 'producido'),
    (SELECT COALESCE(SUM(pr.stock_disponible), 0)::numeric FROM v_stock_productos pr WHERE pr.estado::text = 'empacado'),
    (SELECT COALESCE(SUM(pr.stock_disponible), 0)::numeric FROM v_stock_productos pr WHERE pr.estado::text = 'despachado');
$$;

-- ----------------------------------------------------------------------------
-- 6. Las tres RPC de 20260710160000 pasan a aceptar período
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_pedidos_estado_counts();
CREATE FUNCTION public.fn_pedidos_estado_counts(
  p_desde timestamptz DEFAULT NULL,
  p_hasta timestamptz DEFAULT NULL
)
  RETURNS TABLE(estado estado_pedido, total bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT p.estado, COUNT(*)::bigint
  FROM pedidos p
  WHERE (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
  GROUP BY p.estado;
$$;

DROP FUNCTION IF EXISTS public.fn_pedidos_fuente_counts();
CREATE FUNCTION public.fn_pedidos_fuente_counts(
  p_desde timestamptz DEFAULT NULL,
  p_hasta timestamptz DEFAULT NULL
)
  RETURNS TABLE(fuente fuente_cliente, total bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT p.fuente, COUNT(*)::bigint
  FROM pedidos p
  WHERE p.fuente IS NOT NULL
    AND (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
  GROUP BY p.fuente;
$$;

DROP FUNCTION IF EXISTS public.fn_top_productos_vendidos(integer);
CREATE FUNCTION public.fn_top_productos_vendidos(
  p_limit integer     DEFAULT 5,
  p_desde timestamptz DEFAULT NULL,
  p_hasta timestamptz DEFAULT NULL
)
  RETURNS TABLE(nombre text, unidades numeric, revenue numeric)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(pr.nombre, 'Desconocido') AS nombre,
         SUM(dp.cantidad)  AS unidades,
         SUM(dp.subtotal)  AS revenue
  FROM detalle_pedido dp
  JOIN pedidos ped     ON ped.id = dp.pedido_id
  LEFT JOIN productos pr ON pr.id = dp.producto_id
  WHERE (p_desde IS NULL OR ped.created_at >= p_desde)
    AND (p_hasta IS NULL OR ped.created_at <  p_hasta)
  GROUP BY COALESCE(pr.nombre, 'Desconocido')
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.fn_ventas_resumen_periodo(timestamptz, timestamptz, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_comisiones_resumen(timestamptz, timestamptz, boolean, boolean)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_meta_ads_resumen(text)                                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ventas_aliado_breakdown(timestamptz, timestamptz)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_inventario_resumen()                                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_pedidos_estado_counts(timestamptz, timestamptz)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_pedidos_fuente_counts(timestamptz, timestamptz)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_top_productos_vendidos(integer, timestamptz, timestamptz)        TO authenticated;

COMMIT;
