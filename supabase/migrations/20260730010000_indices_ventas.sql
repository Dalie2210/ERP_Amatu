-- ============================================================================
-- FASE 2a — Índices del módulo de ventas (E1) y búsquedas trigram (E3)
-- ----------------------------------------------------------------------------
-- 20260616000000_baseline.sql crea 28 tablas y CERO índices: en Postgres las
-- claves foráneas no crean índice. Con RLS activo el costo se multiplica —
-- cada política con EXISTS sobre una tabla sin índice convierte una consulta
-- lineal en cuadrática (p. ej. clientes_select_auth sobre pedidos.cliente_id).
--
-- Nota sobre CONCURRENTLY: la auditoría lo propone, pero `supabase db push`
-- ejecuta cada archivo dentro de una transacción y CREATE INDEX CONCURRENTLY
-- no puede correr en una. Con el volumen actual (proyecto en fase 1) el lock
-- de un CREATE INDEX normal es de milisegundos. Si alguna de estas tablas
-- crece a millones de filas antes de aplicar la migración, ejecuta esos
-- índices a mano con CONCURRENTLY y deja que el IF NOT EXISTS los omita aquí.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- E1 — Claves foráneas y filtros calientes
-- ----------------------------------------------------------------------------

-- detalle_pedido: la tabla que más crece. Se recorre al abrir un pedido,
-- al despachar una ruta y al editar líneas.
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_pedido_id
  ON public.detalle_pedido (pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_producto_id
  ON public.detalle_pedido (producto_id);

-- pedidos: clientes_select_auth hace EXISTS (… WHERE cliente_id = …) por cada
-- fila de clientes, y fn_calcular_numero_venta_cliente lo mismo en cada alta.
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id
  ON public.pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado
  ON public.pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_pago
  ON public.pedidos (estado_pago);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at
  ON public.pedidos (created_at DESC);
-- Listados del vendedor: "mis pedidos, más recientes primero".
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_created_at
  ON public.pedidos (vendedor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_aliado_id
  ON public.pedidos (aliado_id) WHERE aliado_id IS NOT NULL;
-- fn_get_cierre_meta_actual / fn_calcular_pct_cierre_meta.
CREATE INDEX IF NOT EXISTS idx_pedidos_cierres_meta
  ON public.pedidos (vendedor_id, created_at)
  WHERE fuente = 'meta_ads' AND numero_venta_cliente = 1;

-- comisiones: filtro exacto de /api/comisiones/preview y de las dos RPC.
CREATE INDEX IF NOT EXISTS idx_comisiones_detalle_vendedor_periodo
  ON public.comisiones_detalle (vendedor_id, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_comisiones_detalle_liquidacion_id
  ON public.comisiones_detalle (liquidacion_id) WHERE liquidacion_id IS NOT NULL;
-- comisiones_detalle(pedido_id) ya está cubierto por comisiones_detalle_pedido_unique.

CREATE INDEX IF NOT EXISTS idx_comisiones_aliado_pedido_id
  ON public.comisiones_aliado (pedido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_aliado_referido_id
  ON public.comisiones_aliado (aliado_referido_id);
-- fn_activar_periodo_aliado busca por (aliado_id, cliente_id); el UNIQUE ya
-- cubre esa pareja, pero falta el acceso por cliente para las vistas de aliados.
CREATE INDEX IF NOT EXISTS idx_aliados_referidos_cliente_id
  ON public.aliados_referidos (cliente_id);

-- rutas y su tabla puente: el UNIQUE (ruta_id, pedido_id) cubre ruta_id,
-- no pedido_id (que es por donde se pregunta "¿en qué ruta va este pedido?").
CREATE INDEX IF NOT EXISTS idx_pedido_ruta_pedido_id
  ON public.pedido_ruta (pedido_id);
CREATE INDEX IF NOT EXISTS idx_rutas_estado_fecha
  ON public.rutas (estado, fecha DESC);

-- Bitácora y datos satélite del pedido.
CREATE INDEX IF NOT EXISTS idx_pedido_actividad_pedido_created
  ON public.pedido_actividad (pedido_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notas_logistica_pedido_id
  ON public.notas_logistica (pedido_id);
CREATE INDEX IF NOT EXISTS idx_mascotas_cliente_id
  ON public.mascotas (cliente_id);
-- pedido_mascotas(pedido_id) ya está cubierto por la PK (pedido_id, mascota_id).

CREATE INDEX IF NOT EXISTS idx_leads_meta_vendedor_periodo
  ON public.leads_meta_ads (vendedor_id, periodo_mes);

CREATE INDEX IF NOT EXISTS idx_clientes_zona_id
  ON public.clientes (zona_id) WHERE zona_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- E3 — Búsquedas ILIKE '%…%' (ocho en la app)
-- ----------------------------------------------------------------------------
-- Con comodín inicial ningún B-tree sirve: es seq scan siempre. pg_trgm + GIN
-- convierte esas búsquedas en acceso por índice.
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- pg_trgm puede estar instalado en `extensions` (convención Supabase) o en
-- `public` (instalaciones antiguas): se incluyen ambos para resolver
-- gin_trgm_ops sin depender de dónde quedó.
SET search_path TO public, extensions;

-- clientes/page.tsx y ClientSelector.tsx buscan por estos cuatro campos.
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON public.clientes USING gin (nombre_completo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_celular_trgm
  ON public.clientes USING gin (celular gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_documento_trgm
  ON public.clientes USING gin (numero_documento gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_trgm
  ON public.clientes USING gin (codigo_cliente gin_trgm_ops);

-- catalogo/page.tsx y ProductSearchBox.tsx.
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
  ON public.productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_sku_trgm
  ON public.productos USING gin (sku gin_trgm_ops);

-- inventario/insumos/page.tsx.
CREATE INDEX IF NOT EXISTS idx_insumos_nombre_trgm
  ON public.insumos USING gin (nombre gin_trgm_ops);

-- pedidos/page.tsx busca por numero_pedido con comodín inicial.
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_trgm
  ON public.pedidos USING gin (numero_pedido gin_trgm_ops);

-- TrazabilidadPanel.tsx busca sobre la vista v_trazabilidad_lote; los índices
-- tienen que ir en las tablas base que la alimentan.
CREATE INDEX IF NOT EXISTS idx_insumo_lotes_codigo_trgm
  ON public.insumo_lotes USING gin (codigo_lote gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_producto_lotes_codigo_trgm
  ON public.producto_lotes USING gin (codigo_lote gin_trgm_ops);
