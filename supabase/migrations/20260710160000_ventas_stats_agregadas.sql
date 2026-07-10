-- ============================================================================
-- P4.2 — Agregación de ventas/page.tsx en el servidor (SQL) en vez de traer
-- todas las filas de `pedidos`/`detalle_pedido` al cliente para reducirlas ahí.
-- ----------------------------------------------------------------------------
-- Antes: `ventas/page.tsx` hacía
--   supabase.from("pedidos").select("estado, fuente")            -- SIN filtro
--   supabase.from("detalle_pedido").select("cantidad, subtotal, productos(nombre)") -- SIN filtro
-- y reducía todo en JS. Ambas queries crecen sin cota con el histórico.
--
-- Estas 3 funciones agregan en SQL y devuelven solo el resultado ya resumido:
--   fn_pedidos_estado_counts()      -> conteo de pedidos por estado (histórico)
--   fn_pedidos_fuente_counts()      -> conteo de pedidos por fuente (histórico)
--   fn_top_productos_vendidos(n)    -> top N productos por revenue (histórico)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_pedidos_estado_counts()
  RETURNS TABLE(estado estado_pedido, total bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT p.estado, COUNT(*)::bigint AS total
  FROM pedidos p
  GROUP BY p.estado;
$$;

CREATE OR REPLACE FUNCTION public.fn_pedidos_fuente_counts()
  RETURNS TABLE(fuente fuente_cliente, total bigint)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT p.fuente, COUNT(*)::bigint AS total
  FROM pedidos p
  WHERE p.fuente IS NOT NULL
  GROUP BY p.fuente;
$$;

CREATE OR REPLACE FUNCTION public.fn_top_productos_vendidos(p_limit integer DEFAULT 5)
  RETURNS TABLE(nombre text, unidades numeric, revenue numeric)
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(p.nombre, 'Desconocido') AS nombre,
    SUM(dp.cantidad) AS unidades,
    SUM(dp.subtotal) AS revenue
  FROM detalle_pedido dp
  LEFT JOIN productos p ON p.id = dp.producto_id
  GROUP BY COALESCE(p.nombre, 'Desconocido')
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;
