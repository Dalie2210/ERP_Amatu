-- =============================================================================
-- BASELINE MIGRATION — Amatu ERP
-- Generated: 2026-06-16
-- Source: Production project jpdospwrcrbbwiwbedya
-- Captures all 20 tables, 15 enums, 12+ functions, triggers, and RLS policies.
-- Apply to new environments with: npx supabase db push --project-ref <ref>
-- =============================================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.estado_comision_aliado AS ENUM ('pendiente', 'liquidada');
CREATE TYPE public.estado_liquidacion AS ENUM ('borrador', 'cerrado', 'pagado');
CREATE TYPE public.estado_pago AS ENUM ('pendiente', 'confirmado');
CREATE TYPE public.estado_pedido AS ENUM (
  'fecha_tentativa', 'confirmado', 'en_preparacion', 'espera_produccion',
  'listo_despacho', 'despachado', 'devolucion', 'parcial', 'cambio'
);
CREATE TYPE public.estado_ruta AS ENUM ('en_preparacion', 'despachada');
CREATE TYPE public.franja_horaria AS ENUM ('AM', 'PM', 'intermedia', 'sin_franja');
CREATE TYPE public.fuente_cliente AS ENUM (
  'meta_ads', 'referido_cliente', 'referido_veterinario',
  'referido_entrenador', 'distribuidor', 'otro'
);
CREATE TYPE public.metodo_pago AS ENUM (
  'nequi', 'daviplata', 'efectivo', 'bancolombia',
  'pse_openpay', 'bold', 'contraentrega'
);
CREATE TYPE public.tipo_aliado AS ENUM ('veterinario', 'entrenador_canino', 'otro');
CREATE TYPE public.tipo_cliente AS ENUM ('publico', 'distribuidor');
CREATE TYPE public.tipo_comision_aliado AS ENUM ('primera_compra', 'recompra');
CREATE TYPE public.tipo_documento AS ENUM ('CC', 'CE', 'NIT', 'Pasaporte');
CREATE TYPE public.tipo_precio AS ENUM ('fijo', 'por_variante', 'por_gramo', 'escala');
CREATE TYPE public.tipo_promocion AS ENUM ('paga_x_lleva_mas', 'producto_gratis');
CREATE TYPE public.user_role AS ENUM ('admin', 'vendedor', 'logistica', 'contable');

-- ============================================================
-- 2. TABLES (in dependency order)
-- ============================================================

-- users: extends auth.users
CREATE TABLE public.users (
  id          uuid NOT NULL,
  full_name   text NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'vendedor',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.users IS 'Application user profiles extending Supabase Auth';

-- ============================================================
-- 3. HELPER FUNCTIONS (require public.users to exist)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_get_user_role()
  RETURNS public.user_role
  LANGUAGE sql STABLE
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_get_user_role(user_id uuid)
  RETURNS text
  LANGUAGE sql STABLE
  SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.users WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. REMAINING TABLES (in dependency order)
-- ============================================================

-- zonas_envio
CREATE TABLE public.zonas_envio (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre           text NOT NULL,
  localidades      text NOT NULL,
  tarifa_cliente   numeric(10,2) NOT NULL,
  tarifa_mensajero numeric(10,2) NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.zonas_envio IS 'Shipping zones with rates for clients and couriers';

-- categorias_producto
CREATE TABLE public.categorias_producto (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  slug       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_producto_pkey    PRIMARY KEY (id),
  CONSTRAINT categorias_producto_nombre_key UNIQUE (nombre),
  CONSTRAINT categorias_producto_slug_key   UNIQUE (slug)
);
COMMENT ON TABLE public.categorias_producto IS 'Product categories: dietas, kits, snacks, accesorios, magistral';

-- reglas_descuento
CREATE TABLE public.reglas_descuento (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  monto_minimo         numeric(12,2) NOT NULL,
  pct_descuento_compra numeric(5,2) NOT NULL DEFAULT 0,
  descuento_envio_fijo numeric(10,2) NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reglas_descuento_pkey              PRIMARY KEY (id),
  CONSTRAINT reglas_descuento_monto_minimo_unique UNIQUE (monto_minimo)
);
COMMENT ON TABLE public.reglas_descuento IS 'Discount tiers by order subtotal (food only)';

-- config_comisiones
CREATE TABLE public.config_comisiones (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  cierre_min  numeric(5,2) NOT NULL,
  cierre_max  numeric(5,2) NOT NULL,
  venta_2_pct numeric(5,2) NOT NULL DEFAULT 0,
  venta_3_pct numeric(5,2) NOT NULL DEFAULT 0,
  venta_4_pct numeric(5,2) NOT NULL DEFAULT 0,
  venta_5_pct numeric(5,2) NOT NULL DEFAULT 0,
  venta_6_pct numeric(5,2) NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_comisiones_pkey        PRIMARY KEY (id),
  CONSTRAINT config_comisiones_rango_check CHECK (cierre_min < cierre_max)
);
COMMENT ON TABLE public.config_comisiones IS 'Commission % matrix by Meta Ads close rate range and sale number';

-- aliados
CREATE TABLE public.aliados (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  tipo       public.tipo_aliado NOT NULL,
  celular    text,
  correo     text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aliados_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.aliados IS 'External partners (vets, trainers) who refer clients';

-- productos
CREATE TABLE public.productos (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  sku                   text,
  nombre                text NOT NULL,
  categoria_id          uuid NOT NULL,
  tipo_precio           public.tipo_precio NOT NULL DEFAULT 'por_variante',
  es_magistral          boolean NOT NULL DEFAULT false,
  aplica_descuento_compra boolean NOT NULL DEFAULT true,
  is_active             boolean NOT NULL DEFAULT true,
  notas                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT productos_pkey        PRIMARY KEY (id),
  CONSTRAINT productos_sku_key     UNIQUE (sku),
  CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_producto(id)
);
COMMENT ON TABLE public.productos IS 'Product catalog: dietas, kits, snacks, accessories, magistral diets';

-- producto_variantes
CREATE TABLE public.producto_variantes (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id     uuid NOT NULL,
  presentacion    text NOT NULL,
  precio_publico  numeric(10,2) NOT NULL,
  precio_por_gramo numeric(8,4),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sku             text NOT NULL,
  CONSTRAINT producto_variantes_pkey      PRIMARY KEY (id),
  CONSTRAINT producto_variantes_sku_key   UNIQUE (sku),
  CONSTRAINT producto_variantes_unique    UNIQUE (producto_id, presentacion),
  CONSTRAINT producto_variantes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.producto_variantes IS 'Product size variants (300g, 500g, 1200g) with prices';

-- precios_escala
CREATE TABLE public.precios_escala (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id     uuid NOT NULL,
  cantidad_minima integer NOT NULL,
  precio_total    numeric(10,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT precios_escala_pkey   PRIMARY KEY (id),
  CONSTRAINT precios_escala_unique UNIQUE (producto_id, cantidad_minima),
  CONSTRAINT precios_escala_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.precios_escala IS 'Volume-based pricing (e.g. compostable bags: 3+ rolls = discount)';

-- pesos_magistrales
CREATE TABLE public.pesos_magistrales (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  peso_g     integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pesos_magistrales_pkey      PRIMARY KEY (id),
  CONSTRAINT pesos_magistrales_peso_g_key UNIQUE (peso_g)
);

-- kits
CREATE TABLE public.kits (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  descripcion text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kits_pkey PRIMARY KEY (id)
);

-- kit_items
CREATE TABLE public.kit_items (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  kit_id      uuid NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  cantidad    integer NOT NULL DEFAULT 1,
  CONSTRAINT kit_items_pkey          PRIMARY KEY (id),
  CONSTRAINT kit_items_cantidad_check CHECK (cantidad >= 1),
  CONSTRAINT kit_items_kit_id_fkey      FOREIGN KEY (kit_id) REFERENCES public.kits(id) ON DELETE CASCADE,
  CONSTRAINT kit_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT kit_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id)
);

-- promociones
CREATE TABLE public.promociones (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre              text NOT NULL,
  tipo                public.tipo_promocion NOT NULL,
  is_active           boolean NOT NULL DEFAULT true,
  producto_id         uuid,
  variante_id         uuid,
  paga_x              integer,
  lleva_extra         integer,
  trigger_producto_id uuid,
  trigger_variante_id uuid,
  regalo_producto_id  uuid,
  regalo_variante_id  uuid,
  regalo_cantidad     integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promociones_pkey             PRIMARY KEY (id),
  CONSTRAINT promociones_paga_x_check     CHECK (paga_x >= 1),
  CONSTRAINT promociones_lleva_extra_check CHECK (lleva_extra >= 1),
  CONSTRAINT promociones_producto_id_fkey         FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_variante_id_fkey         FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT promociones_trigger_producto_id_fkey FOREIGN KEY (trigger_producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_trigger_variante_id_fkey FOREIGN KEY (trigger_variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT promociones_regalo_producto_id_fkey  FOREIGN KEY (regalo_producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_regalo_variante_id_fkey  FOREIGN KEY (regalo_variante_id) REFERENCES public.producto_variantes(id)
);

-- clientes
CREATE TABLE public.clientes (
  id                         uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo_cliente             text NOT NULL,
  nombre_completo            text NOT NULL,
  tipo_documento             public.tipo_documento NOT NULL DEFAULT 'CC',
  numero_documento           text NOT NULL,
  celular                    text NOT NULL,
  correo                     text,
  direccion                  text NOT NULL,
  complemento_direccion      text,
  zona_id                    uuid,
  fuente                     public.fuente_cliente NOT NULL DEFAULT 'otro',
  fuente_subtipo             text,
  tipo_cliente               public.tipo_cliente NOT NULL DEFAULT 'publico',
  pct_descuento_distribuidor numeric(5,2) NOT NULL DEFAULT 0,
  kommo_contact_id           text,
  is_active                  boolean NOT NULL DEFAULT true,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  barrio                     text,
  notas_defecto              text,
  CONSTRAINT clientes_pkey                  PRIMARY KEY (id),
  CONSTRAINT clientes_codigo_cliente_key    UNIQUE (codigo_cliente),
  CONSTRAINT clientes_numero_documento_key  UNIQUE (numero_documento),
  CONSTRAINT clientes_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id)
);
COMMENT ON TABLE public.clientes IS 'Client master data with document, address, source, and Kommo integration';

-- mascotas
CREATE TABLE public.mascotas (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL,
  nombre          text NOT NULL,
  raza            text,
  peso_kg         numeric(5,2),
  edad_meses      integer,
  necesidad_dolor text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mascotas_pkey          PRIMARY KEY (id),
  CONSTRAINT mascotas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.mascotas IS 'Client pets with health/nutrition needs';

-- mensajeros
CREATE TABLE public.mensajeros (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  placa_vehiculo  text,
  telefono        text NOT NULL,
  zona_id         uuid,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mensajeros_pkey        PRIMARY KEY (id),
  CONSTRAINT mensajeros_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id) ON DELETE SET NULL
);

-- pedido_numero_seq
CREATE TABLE public.pedido_numero_seq (
  year          integer NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  CONSTRAINT pedido_numero_seq_pkey PRIMARY KEY (year)
);

-- pedidos
CREATE TABLE public.pedidos (
  id                      uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_pedido           text NOT NULL,
  cliente_id              uuid NOT NULL,
  vendedor_id             uuid NOT NULL,
  mascota_id              uuid,
  zona_id                 uuid,
  aliado_id               uuid,
  estado                  public.estado_pedido NOT NULL DEFAULT 'fecha_tentativa',
  estado_pago             public.estado_pago NOT NULL DEFAULT 'pendiente',
  metodo_pago             public.metodo_pago,
  fuente                  public.fuente_cliente NOT NULL DEFAULT 'otro',
  fuente_subtipo          text,
  numero_venta_cliente    integer NOT NULL DEFAULT 1,
  subtotal_alimento       numeric(12,2) NOT NULL DEFAULT 0,
  subtotal_snacks         numeric(12,2) NOT NULL DEFAULT 0,
  subtotal_otros          numeric(12,2) NOT NULL DEFAULT 0,
  pct_descuento_compra    numeric(5,2) NOT NULL DEFAULT 0,
  monto_descuento_compra  numeric(12,2) NOT NULL DEFAULT 0,
  tarifa_envio_cliente    numeric(10,2) NOT NULL DEFAULT 0,
  descuento_envio         numeric(10,2) NOT NULL DEFAULT 0,
  total_envio_cobrado     numeric(10,2) NOT NULL DEFAULT 0,
  total                   numeric(12,2) NOT NULL DEFAULT 0,
  notas_ventas            text,
  notas_despacho          text,
  franja_horaria          public.franja_horaria NOT NULL DEFAULT 'sin_franja',
  es_contraentrega        boolean NOT NULL DEFAULT false,
  fecha_tentativa_entrega date,
  fecha_confirmacion_pago timestamptz,
  fecha_entrega_real      timestamptz,
  fue_editado             boolean NOT NULL DEFAULT false,
  editado_por_id          uuid,
  editado_en              timestamptz,
  kommo_lead_id           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  direccion_entrega       text,
  complemento_entrega     text,
  barrio_entrega          text,
  zona_entrega_id         uuid,
  numero_bolsas           integer NOT NULL DEFAULT 0,
  CONSTRAINT pedidos_pkey              PRIMARY KEY (id),
  CONSTRAINT pedidos_numero_pedido_key UNIQUE (numero_pedido),
  CONSTRAINT pedidos_cliente_id_fkey      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT pedidos_vendedor_id_fkey     FOREIGN KEY (vendedor_id) REFERENCES public.users(id),
  CONSTRAINT pedidos_mascota_id_fkey      FOREIGN KEY (mascota_id) REFERENCES public.mascotas(id),
  CONSTRAINT pedidos_zona_id_fkey         FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id),
  CONSTRAINT pedidos_zona_entrega_id_fkey FOREIGN KEY (zona_entrega_id) REFERENCES public.zonas_envio(id),
  CONSTRAINT pedidos_aliado_id_fkey       FOREIGN KEY (aliado_id) REFERENCES public.aliados(id),
  CONSTRAINT pedidos_editado_por_id_fkey  FOREIGN KEY (editado_por_id) REFERENCES public.users(id)
);
COMMENT ON TABLE public.pedidos IS 'Orders with full financial snapshot, state, and edit audit trail';

-- detalle_pedido
CREATE TABLE public.detalle_pedido (
  id                       uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id                uuid NOT NULL,
  producto_id              uuid NOT NULL,
  variante_id              uuid,
  nombre_snapshot          text NOT NULL,
  precio_unitario_snapshot numeric(10,2) NOT NULL,
  es_magistral             boolean NOT NULL DEFAULT false,
  gramaje_magistral        numeric(8,2),
  cantidad                 integer NOT NULL DEFAULT 1,
  subtotal                 numeric(12,2) NOT NULL,
  aplica_descuento         boolean NOT NULL DEFAULT true,
  notas_magistral          text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  justificacion_precio     text,
  es_promo                 boolean NOT NULL DEFAULT false,
  promo_id                 uuid,
  CONSTRAINT detalle_pedido_pkey          PRIMARY KEY (id),
  CONSTRAINT detalle_pedido_pedido_id_fkey   FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT detalle_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT detalle_pedido_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT detalle_pedido_promo_id_fkey    FOREIGN KEY (promo_id) REFERENCES public.promociones(id)
);
COMMENT ON TABLE public.detalle_pedido IS 'Order line items with price snapshots for audit integrity';

-- rutas (references mensajeros and users)
CREATE TABLE public.rutas (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre                text NOT NULL,
  fecha                 date NOT NULL,
  franja                public.franja_horaria NOT NULL DEFAULT 'AM',
  mensajero_nombre      text,
  mensajero_celular     text,
  estado                public.estado_ruta NOT NULL DEFAULT 'en_preparacion',
  ajuste_extra_mensajero numeric(10,2) NOT NULL DEFAULT 0,
  motivo_ajuste         text,
  notas                 text,
  despachada_en         timestamptz,
  created_by            uuid NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  mensajero_id          uuid,
  CONSTRAINT rutas_pkey              PRIMARY KEY (id),
  CONSTRAINT rutas_created_by_fkey   FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT rutas_mensajero_id_fkey FOREIGN KEY (mensajero_id) REFERENCES public.mensajeros(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.rutas IS 'Delivery routes grouping orders by date, time slot, and courier';

-- pedido_ruta
CREATE TABLE public.pedido_ruta (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  ruta_id        uuid NOT NULL,
  pedido_id      uuid NOT NULL,
  numero_bolsas  integer NOT NULL DEFAULT 0,
  orden_entrega  integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedido_ruta_pkey   PRIMARY KEY (id),
  CONSTRAINT pedido_ruta_unique UNIQUE (ruta_id, pedido_id),
  CONSTRAINT pedido_ruta_ruta_id_fkey  FOREIGN KEY (ruta_id) REFERENCES public.rutas(id) ON DELETE CASCADE,
  CONSTRAINT pedido_ruta_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
COMMENT ON TABLE public.pedido_ruta IS 'Junction table assigning orders to routes with bag count and delivery order';

-- leads_meta_ads
CREATE TABLE public.leads_meta_ads (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  vendedor_id     uuid NOT NULL,
  fecha_registro  date NOT NULL DEFAULT CURRENT_DATE,
  periodo_mes     text NOT NULL,
  cantidad_leads  integer NOT NULL DEFAULT 0,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_meta_ads_pkey       PRIMARY KEY (id),
  CONSTRAINT leads_meta_unique         UNIQUE (vendedor_id, fecha_registro),
  CONSTRAINT leads_meta_ads_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);
COMMENT ON TABLE public.leads_meta_ads IS 'Manual daily entry of Meta Ads leads per salesperson for close rate calculation';

-- liquidaciones_comision
CREATE TABLE public.liquidaciones_comision (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  vendedor_id           uuid NOT NULL,
  periodo_mes           text NOT NULL,
  total_leads_meta      integer NOT NULL DEFAULT 0,
  total_cierres_meta    integer NOT NULL DEFAULT 0,
  pct_cierre_meta       numeric(5,2) NOT NULL DEFAULT 0,
  rango_cierre          text,
  monto_total_comisiones numeric(12,2) NOT NULL DEFAULT 0,
  estado                public.estado_liquidacion NOT NULL DEFAULT 'borrador',
  fecha_liquidacion     timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liquidaciones_comision_pkey   PRIMARY KEY (id),
  CONSTRAINT liquidaciones_unique          UNIQUE (vendedor_id, periodo_mes),
  CONSTRAINT liquidaciones_comision_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);
COMMENT ON TABLE public.liquidaciones_comision IS 'Monthly commission settlement per salesperson';

-- comisiones_detalle
CREATE TABLE public.comisiones_detalle (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  liquidacion_id      uuid,
  pedido_id           uuid NOT NULL,
  numero_venta_cliente integer NOT NULL,
  base_calculo        numeric(12,2) NOT NULL,
  pct_comision        numeric(5,2) NOT NULL DEFAULT 0,
  monto_comision      numeric(12,2) NOT NULL DEFAULT 0,
  aplica_comision     boolean NOT NULL DEFAULT false,
  razon_no_comision   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  vendedor_id         uuid,
  periodo_mes         text,
  is_provisional      boolean NOT NULL DEFAULT true,
  CONSTRAINT comisiones_detalle_pkey         PRIMARY KEY (id),
  CONSTRAINT comisiones_detalle_pedido_unique UNIQUE (pedido_id),
  CONSTRAINT comisiones_detalle_pedido_id_fkey      FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT comisiones_detalle_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones_comision(id),
  CONSTRAINT comisiones_detalle_vendedor_id_fkey    FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);
COMMENT ON TABLE public.comisiones_detalle IS 'Per-order commission breakdown within a monthly settlement';

-- aliados_referidos
CREATE TABLE public.aliados_referidos (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  aliado_id                 uuid NOT NULL,
  cliente_id                uuid NOT NULL,
  fecha_inicio_comision     date,
  fecha_fin_comision        date,
  periodo_activo            boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  pedido_primera_entrega_id uuid,
  CONSTRAINT aliados_referidos_pkey   PRIMARY KEY (id),
  CONSTRAINT aliados_referidos_unique UNIQUE (aliado_id, cliente_id),
  CONSTRAINT aliados_referidos_aliado_id_fkey              FOREIGN KEY (aliado_id) REFERENCES public.aliados(id),
  CONSTRAINT aliados_referidos_cliente_id_fkey             FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT aliados_referidos_pedido_primera_entrega_id_fkey FOREIGN KEY (pedido_primera_entrega_id) REFERENCES public.pedidos(id) ON DELETE RESTRICT
);
COMMENT ON TABLE public.aliados_referidos IS 'Tracks which partner referred which client and their 6-month commission window';

-- comisiones_aliado
CREATE TABLE public.comisiones_aliado (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  aliado_referido_id uuid NOT NULL,
  pedido_id         uuid NOT NULL,
  tipo              public.tipo_comision_aliado NOT NULL,
  base_calculo      numeric(12,2) NOT NULL,
  porcentaje        numeric(5,2) NOT NULL,
  monto             numeric(12,2) NOT NULL,
  estado            public.estado_comision_aliado NOT NULL DEFAULT 'pendiente',
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comisiones_aliado_pkey                PRIMARY KEY (id),
  CONSTRAINT comisiones_aliado_aliado_referido_id_fkey FOREIGN KEY (aliado_referido_id) REFERENCES public.aliados_referidos(id),
  CONSTRAINT comisiones_aliado_pedido_id_fkey          FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
COMMENT ON TABLE public.comisiones_aliado IS 'Partner/vet commissions per order with type (first purchase vs repeat)';

-- notas_logistica
CREATE TABLE public.notas_logistica (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id      uuid NOT NULL,
  texto          text NOT NULL,
  creado_por     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completada     boolean NOT NULL DEFAULT false,
  completada_por uuid,
  completada_en  timestamptz,
  CONSTRAINT notas_logistica_pkey        PRIMARY KEY (id),
  CONSTRAINT notas_logistica_texto_check CHECK (char_length(TRIM(BOTH FROM texto)) > 0),
  CONSTRAINT notas_logistica_pedido_id_fkey      FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT notas_logistica_creado_por_fkey     FOREIGN KEY (creado_por) REFERENCES public.users(id),
  CONSTRAINT notas_logistica_completada_por_fkey FOREIGN KEY (completada_por) REFERENCES public.users(id)
);

-- pedido_actividad
CREATE TABLE public.pedido_actividad (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id    uuid NOT NULL,
  tipo         text NOT NULL,
  usuario_id   uuid,
  usuario_nombre text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  payload      jsonb,
  CONSTRAINT pedido_actividad_pkey          PRIMARY KEY (id),
  CONSTRAINT pedido_actividad_pedido_id_fkey   FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT pedido_actividad_usuario_id_fkey  FOREIGN KEY (usuario_id) REFERENCES public.users(id)
);

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas_envio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_descuento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_comisiones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliados            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliados_referidos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precios_escala     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesos_magistrales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mascotas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajeros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedido     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_numero_seq  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_ruta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_meta_ads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones_aliado  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_logistica    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_actividad   ENABLE ROW LEVEL SECURITY;
-- Note: promociones, kits, kit_items do NOT have RLS enabled in production

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- users
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated
  USING ((id = (SELECT auth.uid())) OR (fn_get_user_role() = 'admin'::user_role));
CREATE POLICY users_admin_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY users_admin_update ON public.users FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY users_admin_delete ON public.users FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- zonas_envio
CREATE POLICY zonas_select_auth ON public.zonas_envio FOR SELECT TO authenticated USING (true);
CREATE POLICY zonas_admin_insert ON public.zonas_envio FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY zonas_admin_update ON public.zonas_envio FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY zonas_admin_delete ON public.zonas_envio FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- categorias_producto
CREATE POLICY categorias_select_auth ON public.categorias_producto FOR SELECT TO authenticated USING (true);
CREATE POLICY categorias_admin_insert ON public.categorias_producto FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY categorias_admin_update ON public.categorias_producto FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY categorias_admin_delete ON public.categorias_producto FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- reglas_descuento
CREATE POLICY reglas_select_auth ON public.reglas_descuento FOR SELECT TO authenticated USING (true);
CREATE POLICY reglas_admin_insert ON public.reglas_descuento FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY reglas_admin_update ON public.reglas_descuento FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY reglas_admin_delete ON public.reglas_descuento FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- config_comisiones
CREATE POLICY config_com_select_auth ON public.config_comisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY config_com_admin_insert ON public.config_comisiones FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY config_com_admin_update ON public.config_comisiones FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY config_com_admin_delete ON public.config_comisiones FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- aliados
CREATE POLICY aliados_select_auth ON public.aliados FOR SELECT TO authenticated USING (true);
CREATE POLICY aliados_admin_insert ON public.aliados FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY aliados_admin_update ON public.aliados FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY aliados_admin_delete ON public.aliados FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- aliados_referidos
CREATE POLICY aliados_ref_select ON public.aliados_referidos FOR SELECT TO authenticated USING (true);
CREATE POLICY aliados_ref_insert ON public.aliados_referidos FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY aliados_ref_update ON public.aliados_referidos FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));

-- productos
CREATE POLICY productos_select_auth ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY productos_admin_insert ON public.productos FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY productos_admin_update ON public.productos FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY productos_admin_delete ON public.productos FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- producto_variantes
CREATE POLICY variantes_select_auth ON public.producto_variantes FOR SELECT TO authenticated USING (true);
CREATE POLICY variantes_admin_insert ON public.producto_variantes FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY variantes_admin_update ON public.producto_variantes FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY variantes_admin_delete ON public.producto_variantes FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- precios_escala
CREATE POLICY escala_select_auth ON public.precios_escala FOR SELECT TO authenticated USING (true);
CREATE POLICY escala_admin_insert ON public.precios_escala FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY escala_admin_update ON public.precios_escala FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY escala_admin_delete ON public.precios_escala FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- pesos_magistrales
CREATE POLICY "autenticados pueden leer" ON public.pesos_magistrales FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin puede insertar" ON public.pesos_magistrales FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role(auth.uid()) = 'admin'::text);
CREATE POLICY "admin puede eliminar" ON public.pesos_magistrales FOR DELETE TO authenticated
  USING (fn_get_user_role(auth.uid()) = 'admin'::text);

-- clientes
CREATE POLICY clientes_select_auth ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY clientes_insert_ventas ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY clientes_update_ventas ON public.clientes FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));

-- mascotas
CREATE POLICY mascotas_select_auth ON public.mascotas FOR SELECT TO authenticated USING (true);
CREATE POLICY mascotas_insert_ventas ON public.mascotas FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY mascotas_update_ventas ON public.mascotas FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY mascotas_delete_ventas ON public.mascotas FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));

-- mensajeros
CREATE POLICY mensajeros_select_ops ON public.mensajeros FOR SELECT
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY mensajeros_insert_ops ON public.mensajeros FOR INSERT
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY mensajeros_update_ops ON public.mensajeros FOR UPDATE
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY mensajeros_delete_ops ON public.mensajeros FOR DELETE
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));

-- pedido_numero_seq
CREATE POLICY authenticated_rw_seq ON public.pedido_numero_seq FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- pedidos
CREATE POLICY pedidos_select_auth ON public.pedidos FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role, 'contable'::user_role]))
    OR ((fn_get_user_role() = 'logistica'::user_role) AND (estado_pago = 'confirmado'::estado_pago))
  );
CREATE POLICY pedidos_insert_ventas ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY pedidos_update_own ON public.pedidos FOR UPDATE TO authenticated
  USING (
    (fn_get_user_role() = 'admin'::user_role)
    OR ((fn_get_user_role() = 'vendedor'::user_role)
        AND (vendedor_id = (SELECT auth.uid()))
        AND (estado <> ALL (ARRAY['listo_despacho'::estado_pedido, 'despachado'::estado_pedido])))
    OR (fn_get_user_role() = 'contable'::user_role)
    OR (fn_get_user_role() = 'logistica'::user_role)
  );

-- detalle_pedido
CREATE POLICY detalle_select_auth ON public.detalle_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY detalle_insert_ventas ON public.detalle_pedido FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY detalle_update_ventas ON public.detalle_pedido FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY detalle_delete_ventas ON public.detalle_pedido FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));

-- rutas
CREATE POLICY rutas_select_ops ON public.rutas FOR SELECT TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY rutas_insert_ops ON public.rutas FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY rutas_update_ops ON public.rutas FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));

-- pedido_ruta
CREATE POLICY pedido_ruta_select ON public.pedido_ruta FOR SELECT TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY pedido_ruta_insert ON public.pedido_ruta FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY pedido_ruta_update ON public.pedido_ruta FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));
CREATE POLICY pedido_ruta_delete ON public.pedido_ruta FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'logistica'::user_role]));

-- leads_meta_ads
CREATE POLICY leads_select ON public.leads_meta_ads FOR SELECT TO authenticated
  USING ((fn_get_user_role() = 'admin'::user_role) OR (vendedor_id = (SELECT auth.uid())));
CREATE POLICY leads_insert ON public.leads_meta_ads FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'vendedor'::user_role]));
CREATE POLICY leads_update ON public.leads_meta_ads FOR UPDATE TO authenticated
  USING ((fn_get_user_role() = 'admin'::user_role) OR (vendedor_id = (SELECT auth.uid())));

-- liquidaciones_comision
CREATE POLICY liquidaciones_select ON public.liquidaciones_comision FOR SELECT TO authenticated
  USING ((fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role])) OR (vendedor_id = (SELECT auth.uid())));
CREATE POLICY liquidaciones_admin_insert ON public.liquidaciones_comision FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY liquidaciones_admin_update ON public.liquidaciones_comision FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY liquidaciones_admin_delete ON public.liquidaciones_comision FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));

-- comisiones_detalle
CREATE POLICY com_detalle_select ON public.comisiones_detalle FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM liquidaciones_comision lc
      WHERE lc.id = comisiones_detalle.liquidacion_id
        AND lc.vendedor_id = (SELECT auth.uid())
    ))
  );
CREATE POLICY com_detalle_admin_insert ON public.comisiones_detalle FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY com_detalle_admin_update ON public.comisiones_detalle FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY com_detalle_admin_delete ON public.comisiones_detalle FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));

-- comisiones_aliado
CREATE POLICY com_aliado_select ON public.comisiones_aliado FOR SELECT TO authenticated USING (true);
CREATE POLICY com_aliado_admin_insert ON public.comisiones_aliado FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY com_aliado_admin_update ON public.comisiones_aliado FOR UPDATE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));
CREATE POLICY com_aliado_admin_delete ON public.comisiones_aliado FOR DELETE TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));

-- notas_logistica
CREATE POLICY notas_logistica_select ON public.notas_logistica FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role, 'vendedor'::user_role])));
CREATE POLICY notas_logistica_insert ON public.notas_logistica FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role])))
    AND (creado_por = auth.uid())
  );
CREATE POLICY notas_logistica_update ON public.notas_logistica FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role])));

-- pedido_actividad
CREATE POLICY pedido_actividad_select ON public.pedido_actividad FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role, 'vendedor'::user_role])));
CREATE POLICY pedido_actividad_insert ON public.pedido_actividad FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['admin'::user_role, 'logistica'::user_role])));

-- ============================================================
-- 7. TRIGGER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_app_meta_data->>'role')::public.user_role, 'vendedor')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_generar_numero_pedido()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_year INTEGER;
  v_seq  INTEGER;
BEGIN
  IF NEW.numero_pedido IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO pedido_numero_seq (year, ultimo_numero)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET ultimo_numero = pedido_numero_seq.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_seq;
  NEW.numero_pedido :=
    'AMT-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calcular_numero_venta_cliente()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  venta_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO venta_count
  FROM pedidos p
  WHERE p.cliente_id = NEW.cliente_id
    AND p.estado IN (
      'confirmado', 'en_preparacion', 'espera_produccion',
      'listo_despacho', 'despachado'
    )
    AND p.id != NEW.id;
  NEW.numero_venta_cliente := venta_count + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_comision_periodo_on_insert()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_vendedor_id UUID;
  v_bogota_ts   TIMESTAMPTZ;
  v_day         INTEGER;
  v_periodo_mes TEXT;
BEGIN
  SELECT vendedor_id, created_at AT TIME ZONE 'America/Bogota'
  INTO v_vendedor_id, v_bogota_ts
  FROM pedidos WHERE id = NEW.pedido_id;
  v_day := EXTRACT(DAY FROM v_bogota_ts)::INTEGER;
  IF v_day >= 25 THEN
    v_periodo_mes := TO_CHAR(v_bogota_ts + INTERVAL '1 month', 'YYYY-MM');
  ELSE
    v_periodo_mes := TO_CHAR(v_bogota_ts, 'YYYY-MM');
  END IF;
  NEW.vendedor_id := v_vendedor_id;
  NEW.periodo_mes := v_periodo_mes;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_activar_periodo_aliado()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_aliado_referido   RECORD;
  v_es_primera        BOOLEAN;
  v_tipo              tipo_comision_aliado;
  v_pct               NUMERIC;
  v_base              NUMERIC;
  v_monto             NUMERIC;
  v_today             DATE := CURRENT_DATE;
BEGIN
  IF NEW.estado != 'despachado' OR OLD.estado = 'despachado' OR NEW.aliado_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_aliado_referido
  FROM aliados_referidos
  WHERE aliado_id = NEW.aliado_id AND cliente_id = NEW.cliente_id
  LIMIT 1;
  IF v_aliado_referido IS NULL THEN
    INSERT INTO aliados_referidos (
      aliado_id, cliente_id, fecha_inicio_comision, fecha_fin_comision,
      periodo_activo, pedido_primera_entrega_id
    ) VALUES (
      NEW.aliado_id, NEW.cliente_id, v_today, v_today + INTERVAL '6 months', true, NEW.id
    ) RETURNING * INTO v_aliado_referido;
    v_es_primera := true;
  ELSIF v_aliado_referido.pedido_primera_entrega_id IS NULL THEN
    UPDATE aliados_referidos
    SET fecha_inicio_comision = v_today, fecha_fin_comision = v_today + INTERVAL '6 months',
        periodo_activo = true, pedido_primera_entrega_id = NEW.id
    WHERE id = v_aliado_referido.id
    RETURNING * INTO v_aliado_referido;
    v_es_primera := true;
  ELSIF v_aliado_referido.periodo_activo = true AND v_aliado_referido.fecha_fin_comision >= v_today THEN
    v_es_primera := false;
  ELSE
    RETURN NEW;
  END IF;
  v_base  := ROUND(NEW.subtotal_alimento * 0.95, 0);
  v_pct   := CASE WHEN v_es_primera THEN 10 ELSE 5 END;
  v_monto := ROUND(v_base * (v_pct / 100.0), 0);
  v_tipo  := CASE WHEN v_es_primera THEN 'primera_compra'::tipo_comision_aliado ELSE 'recompra'::tipo_comision_aliado END;
  INSERT INTO comisiones_aliado (aliado_referido_id, pedido_id, tipo, base_calculo, porcentaje, monto, estado)
  VALUES (v_aliado_referido.id, NEW.id, v_tipo, v_base, v_pct, v_monto, 'pendiente');
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. TRIGGERS
-- ============================================================

CREATE TRIGGER trg_generar_numero_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_pedido();

CREATE TRIGGER trg_calcular_numero_venta
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_numero_venta_cliente();

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();

CREATE TRIGGER trg_aliado_comision_on_despacho
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_activar_periodo_aliado();

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();

CREATE TRIGGER trg_liquidaciones_updated_at
  BEFORE UPDATE ON public.liquidaciones_comision
  FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();

CREATE TRIGGER trg_comision_set_vendor_period
  BEFORE INSERT ON public.comisiones_detalle
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_comision_periodo_on_insert();

-- ============================================================
-- 9. AUTH TRIGGER (on auth.users, managed by Supabase Auth)
-- ============================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ============================================================
-- 10. ADDITIONAL FUNCTIONS (business logic, called from app)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_cliente_con_mascotas(
  p_cliente jsonb,
  p_mascotas jsonb DEFAULT '[]'::jsonb
)
  RETURNS jsonb LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_cliente public.clientes;
  v_mascotas jsonb;
BEGIN
  INSERT INTO public.clientes (
    codigo_cliente, nombre_completo, tipo_documento, numero_documento,
    celular, correo, direccion, complemento_direccion, barrio, zona_id,
    fuente, fuente_subtipo, tipo_cliente, pct_descuento_distribuidor, notas_defecto
  ) VALUES (
    p_cliente->>'codigo_cliente',
    p_cliente->>'nombre_completo',
    COALESCE(NULLIF(p_cliente->>'tipo_documento',''), 'CC')::public.tipo_documento,
    p_cliente->>'numero_documento',
    p_cliente->>'celular',
    NULLIF(p_cliente->>'correo',''),
    p_cliente->>'direccion',
    NULLIF(p_cliente->>'complemento_direccion',''),
    NULLIF(p_cliente->>'barrio',''),
    NULLIF(p_cliente->>'zona_id','')::uuid,
    COALESCE(NULLIF(p_cliente->>'fuente',''), 'otro')::public.fuente_cliente,
    NULLIF(p_cliente->>'fuente_subtipo',''),
    COALESCE(NULLIF(p_cliente->>'tipo_cliente',''), 'publico')::public.tipo_cliente,
    COALESCE(NULLIF(p_cliente->>'pct_descuento_distribuidor','')::numeric, 0),
    NULLIF(p_cliente->>'notas_defecto','')
  ) RETURNING * INTO v_cliente;
  INSERT INTO public.mascotas (cliente_id, nombre, raza, peso_kg, edad_meses, necesidad_dolor)
  SELECT v_cliente.id, m->>'nombre', NULLIF(m->>'raza',''),
    NULLIF(m->>'peso_kg','')::numeric, NULLIF(m->>'edad_meses','')::int,
    NULLIF(m->>'necesidad_dolor','')
  FROM jsonb_array_elements(COALESCE(p_mascotas, '[]'::jsonb)) m
  WHERE COALESCE(m->>'nombre','') <> '';
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at), '[]'::jsonb)
  INTO v_mascotas FROM public.mascotas x WHERE x.cliente_id = v_cliente.id;
  RETURN jsonb_build_object('cliente', to_jsonb(v_cliente), 'mascotas', v_mascotas);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calcular_pct_cierre_meta(p_vendedor_id uuid, p_periodo_mes text)
  RETURNS numeric LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_leads   INTEGER;
  v_cierres INTEGER;
BEGIN
  SELECT COALESCE(SUM(cantidad_leads), 0) INTO v_leads
  FROM leads_meta_ads WHERE vendedor_id = p_vendedor_id AND periodo_mes = p_periodo_mes;
  SELECT COUNT(*) INTO v_cierres
  FROM pedidos
  WHERE vendedor_id = p_vendedor_id AND fuente = 'meta_ads' AND numero_venta_cliente = 1
    AND TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = p_periodo_mes;
  IF v_leads = 0 THEN RETURN 0; END IF;
  RETURN ROUND((v_cierres::NUMERIC / v_leads) * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_cierre_meta_actual(p_vendedor_id uuid, p_periodo_mes text)
  RETURNS TABLE(
    total_leads integer, total_cierres integer, pct_cierre numeric, rango_label text,
    config_id uuid, venta_2_pct numeric, venta_3_pct numeric,
    venta_4_pct numeric, venta_5_pct numeric, venta_6_pct numeric
  ) LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_total_leads   INTEGER;
  v_total_cierres INTEGER;
  v_pct_cierre    NUMERIC;
  v_base_date     DATE;
  v_periodo_start DATE;
  v_periodo_end   DATE;
  v_config        RECORD;
  v_rango_label   TEXT;
BEGIN
  v_base_date     := TO_DATE(p_periodo_mes || '-01', 'YYYY-MM-DD');
  v_periodo_start := (v_base_date - INTERVAL '6 days')::DATE;
  v_periodo_end   := (v_base_date + INTERVAL '24 days')::DATE;
  SELECT COALESCE(SUM(cantidad_leads), 0) INTO v_total_leads
  FROM leads_meta_ads WHERE vendedor_id = p_vendedor_id AND periodo_mes = p_periodo_mes;
  SELECT COUNT(*) INTO v_total_cierres
  FROM pedidos
  WHERE vendedor_id = p_vendedor_id AND fuente = 'meta_ads' AND numero_venta_cliente = 1
    AND estado != 'devolucion'
    AND created_at AT TIME ZONE 'America/Bogota' >= v_periodo_start::timestamp
    AND created_at AT TIME ZONE 'America/Bogota' <  v_periodo_end::timestamp;
  IF v_total_leads > 0 THEN
    v_pct_cierre := ROUND((v_total_cierres::NUMERIC / v_total_leads::NUMERIC) * 100, 2);
  ELSE v_pct_cierre := 0; END IF;
  SELECT * INTO v_config FROM config_comisiones
  WHERE is_active = true AND v_pct_cierre >= cierre_min AND v_pct_cierre <= cierre_max
  ORDER BY cierre_min ASC LIMIT 1;
  IF v_config IS NULL THEN
    SELECT * INTO v_config FROM config_comisiones WHERE is_active = true ORDER BY cierre_max DESC LIMIT 1;
  END IF;
  IF v_config IS NOT NULL THEN
    v_rango_label := v_config.cierre_min::TEXT || '% – ' || v_config.cierre_max::TEXT || '%';
  ELSE v_rango_label := '0% – 2.9%'; END IF;
  RETURN QUERY SELECT v_total_leads, v_total_cierres, v_pct_cierre, v_rango_label,
    v_config.id, COALESCE(v_config.venta_2_pct, 0), COALESCE(v_config.venta_3_pct, 0),
    COALESCE(v_config.venta_4_pct, 0), COALESCE(v_config.venta_5_pct, 0), COALESCE(v_config.venta_6_pct, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalcular_comisiones_periodo(p_vendedor_id uuid, p_periodo_mes text)
  RETURNS TABLE(
    total_leads integer, total_cierres integer, pct_cierre numeric, rango_label text,
    monto_total numeric, monto_confirmado numeric, monto_bloqueado numeric, ordenes_count integer
  ) LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_cierre        RECORD;
  v_row           RECORD;
  v_venta_efectiva INTEGER;
  v_pct           NUMERIC;
  v_base          NUMERIC;
  v_monto         NUMERIC;
  v_aplica        BOOLEAN;
  v_razon         TEXT;
  v_monto_total   NUMERIC := 0;
  v_monto_conf    NUMERIC := 0;
  v_monto_bloq    NUMERIC := 0;
  v_count         INTEGER := 0;
BEGIN
  SELECT * INTO v_cierre FROM fn_get_cierre_meta_actual(p_vendedor_id, p_periodo_mes) LIMIT 1;
  FOR v_row IN
    SELECT cd.id AS comision_id, cd.numero_venta_cliente, cd.base_calculo,
      p.fuente, p.estado_pago, p.total, p.total_envio_cobrado, c.tipo_cliente
    FROM comisiones_detalle cd
    JOIN pedidos p ON p.id = cd.pedido_id
    JOIN clientes c ON c.id = p.cliente_id
    WHERE cd.vendedor_id = p_vendedor_id AND cd.periodo_mes = p_periodo_mes
  LOOP
    v_aplica := false; v_razon := NULL; v_pct := 0; v_monto := 0; v_base := v_row.base_calculo;
    IF v_row.tipo_cliente = 'distribuidor' THEN
      v_aplica := false; v_razon := 'Cliente distribuidor';
    ELSIF v_row.numero_venta_cliente >= 7 THEN
      v_aplica := false; v_razon := 'Cliente fidelizado (venta #7+)';
    ELSIF v_row.numero_venta_cliente = 1
      AND v_row.fuente NOT IN ('referido_cliente', 'referido_veterinario', 'referido_entrenador')
    THEN
      v_aplica := false; v_razon := 'Primera venta del cliente';
    ELSE
      IF v_row.numero_venta_cliente = 1
        AND v_row.fuente IN ('referido_cliente', 'referido_veterinario', 'referido_entrenador')
      THEN v_venta_efectiva := 2;
      ELSE v_venta_efectiva := v_row.numero_venta_cliente;
      END IF;
      IF v_cierre.config_id IS NOT NULL THEN
        CASE v_venta_efectiva
          WHEN 2 THEN v_pct := COALESCE(v_cierre.venta_2_pct, 0);
          WHEN 3 THEN v_pct := COALESCE(v_cierre.venta_3_pct, 0);
          WHEN 4 THEN v_pct := COALESCE(v_cierre.venta_4_pct, 0);
          WHEN 5 THEN v_pct := COALESCE(v_cierre.venta_5_pct, 0);
          WHEN 6 THEN v_pct := COALESCE(v_cierre.venta_6_pct, 0);
          ELSE v_pct := 0;
        END CASE;
      END IF;
      IF v_pct > 0 THEN
        v_aplica := true; v_monto := ROUND(v_base * (v_pct / 100), 0);
      ELSE v_aplica := false; v_razon := 'Porcentaje 0% en rango de cierre actual'; END IF;
    END IF;
    UPDATE comisiones_detalle
    SET pct_comision = v_pct, monto_comision = v_monto,
        aplica_comision = v_aplica, razon_no_comision = v_razon
    WHERE id = v_row.comision_id;
    IF v_aplica THEN
      v_monto_total := v_monto_total + v_monto; v_count := v_count + 1;
      IF v_row.estado_pago = 'confirmado' THEN v_monto_conf := v_monto_conf + v_monto;
      ELSE v_monto_bloq := v_monto_bloq + v_monto; END IF;
    END IF;
  END LOOP;
  UPDATE liquidaciones_comision
  SET monto_total_comisiones = v_monto_total
  WHERE vendedor_id = p_vendedor_id AND periodo_mes = p_periodo_mes AND estado = 'borrador';
  RETURN QUERY SELECT v_cierre.total_leads, v_cierre.total_cierres, v_cierre.pct_cierre,
    v_cierre.rango_label, v_monto_total, v_monto_conf, v_monto_bloq, v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_liquidar_periodo_mensual(p_vendedor_id uuid, p_periodo_mes text)
  RETURNS TABLE(monto_confirmado numeric, comisiones_trasladadas integer, liquidacion_id uuid)
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_prox_periodo TEXT;
  v_liq_id       UUID;
  v_monto_conf   NUMERIC := 0;
  v_trasladadas  INTEGER := 0;
BEGIN
  SELECT TO_CHAR(TO_DATE(p_periodo_mes || '-01', 'YYYY-MM-DD') + INTERVAL '1 month', 'YYYY-MM')
  INTO v_prox_periodo;
  PERFORM fn_recalcular_comisiones_periodo(p_vendedor_id, p_periodo_mes);
  UPDATE comisiones_detalle SET periodo_mes = v_prox_periodo
  WHERE vendedor_id = p_vendedor_id AND periodo_mes = p_periodo_mes AND aplica_comision = true
    AND pedido_id IN (SELECT id FROM pedidos WHERE estado_pago != 'confirmado');
  GET DIAGNOSTICS v_trasladadas = ROW_COUNT;
  SELECT COALESCE(SUM(cd.monto_comision), 0) INTO v_monto_conf
  FROM comisiones_detalle cd JOIN pedidos p ON p.id = cd.pedido_id
  WHERE cd.vendedor_id = p_vendedor_id AND cd.periodo_mes = p_periodo_mes
    AND cd.aplica_comision = true AND p.estado_pago = 'confirmado';
  INSERT INTO liquidaciones_comision(vendedor_id, periodo_mes, monto_total_comisiones, estado, fecha_liquidacion)
  VALUES (p_vendedor_id, p_periodo_mes, v_monto_conf, 'cerrado', NOW())
  ON CONFLICT ON CONSTRAINT liquidaciones_unique DO UPDATE
    SET monto_total_comisiones = v_monto_conf, estado = 'cerrado',
        fecha_liquidacion = NOW(), updated_at = NOW()
  RETURNING id INTO v_liq_id;
  RETURN QUERY SELECT v_monto_conf, v_trasladadas, v_liq_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_expirar_periodos_aliado()
  RETURNS integer LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE aliados_referidos SET periodo_activo = false
  WHERE periodo_activo = true AND fecha_fin_comision < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_top_selling_productos(p_limit integer DEFAULT 10)
  RETURNS TABLE(producto_id uuid, total_vendido bigint)
  LANGUAGE sql STABLE
  SET search_path TO 'public'
AS $$
  SELECT dp.producto_id, SUM(dp.cantidad)::bigint AS total_vendido
  FROM detalle_pedido dp JOIN productos p ON p.id = dp.producto_id
  WHERE p.is_active = true
  GROUP BY dp.producto_id ORDER BY total_vendido DESC LIMIT p_limit;
$$;
