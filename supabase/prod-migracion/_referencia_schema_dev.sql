-- =====================================================================
-- ⛔ NO EJECUTAR — ARCHIVO DE REFERENCIA / DOCUMENTACIÓN
--
-- Este archivo es una transcripción LEGIBLE e INCOMPLETA del schema de
-- dev al 2026-08-20: contiene extensiones, los 27 enums, las 62 tablas
-- con sus PK/UNIQUE/CHECK/FK, y nada más.
--
-- NO tiene funciones, vistas, índices, triggers ni policies RLS, así que
-- ejecutarlo dejaría producción a medio construir y sin RLS.
--
-- La migración real se hace con el dump de pg_dump: ver RUNBOOK.md.
-- Esto está aquí solo para leer la estructura de un vistazo.
-- =====================================================================

/*  Bloque comentado a propósito para que el archivo no sea ejecutable.

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Reset del schema public
-- ---------------------------------------------------------------------
-- El trigger vive en auth.users y depende de una función de public;
-- se elimina antes para que el DROP SCHEMA no falle.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- ---------------------------------------------------------------------
-- 1. Extensiones
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm    WITH SCHEMA extensions;
-- `unaccent` y `vector` viven en public en dev: el índice
-- precios_productos_normalizado_unique y documents.embedding dependen de ellas.
CREATE EXTENSION IF NOT EXISTS unaccent   WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector     WITH SCHEMA public;

-- ---------------------------------------------------------------------
-- 2. Tipos enumerados
-- ---------------------------------------------------------------------
CREATE TYPE public.app_seccion AS ENUM ('ventas', 'catalogo', 'clientes', 'comisiones', 'aliados', 'logistica_tablero', 'logistica_rutas', 'logistica_mensajeros', 'logistica_liquidacion', 'inventario_dashboard', 'inventario_explosion', 'inventario_ingresos', 'inventario_insumos', 'inventario_recetas', 'inventario_produccion', 'inventario_productos', 'inventario_remisiones', 'inventario_conteo', 'admin', 'inventario_desperdicio');
CREATE TYPE public.categoria_conteo AS ENUM ('materia_prima', 'producto_seco', 'aseo', 'producto_terminado');
CREATE TYPE public.estado_comision_aliado AS ENUM ('pendiente', 'liquidada');
CREATE TYPE public.estado_conteo AS ENUM ('pendiente', 'aplicado', 'rechazado');
CREATE TYPE public.estado_donacion AS ENUM ('pendiente', 'aprobada', 'rechazada');
CREATE TYPE public.estado_liquidacion AS ENUM ('borrador', 'cerrado', 'pagado');
CREATE TYPE public.estado_pago AS ENUM ('pendiente', 'confirmado');
CREATE TYPE public.estado_pedido AS ENUM ('fecha_tentativa', 'confirmado', 'en_preparacion', 'espera_produccion', 'listo_despacho', 'despachado', 'devolucion', 'parcial', 'cambio');
CREATE TYPE public.estado_produccion AS ENUM ('planificada', 'en_proceso', 'completada', 'cancelada', 'parcial');
CREATE TYPE public.estado_pt AS ENUM ('producido', 'empacado', 'despachado');
CREATE TYPE public.estado_ruta AS ENUM ('en_preparacion', 'despachada');
CREATE TYPE public.franja_horaria AS ENUM ('AM', 'PM', 'intermedia', 'sin_franja');
CREATE TYPE public.fuente_cliente AS ENUM ('meta_ads', 'referido_cliente', 'referido_veterinario', 'referido_entrenador', 'distribuidor', 'otro');
CREATE TYPE public.metodo_pago AS ENUM ('nequi', 'daviplata', 'efectivo', 'bancolombia', 'pse_openpay', 'bold', 'contraentrega');
CREATE TYPE public.motivo_desperdicio AS ENUM ('vencimiento', 'quemado', 'cambio_temperatura', 'nevera_danada', 'bolsa_rota', 'contaminacion', 'otro');
CREATE TYPE public.origen_donacion AS ENUM ('pedido', 'lote_pt');
CREATE TYPE public.tipo_aliado AS ENUM ('veterinario', 'entrenador_canino', 'otro');
CREATE TYPE public.tipo_cliente AS ENUM ('publico', 'distribuidor');
CREATE TYPE public.tipo_comision_aliado AS ENUM ('primera_compra', 'recompra');
CREATE TYPE public.tipo_documento AS ENUM ('CC', 'CE', 'NIT', 'Pasaporte');
CREATE TYPE public.tipo_insumo AS ENUM ('materia_prima', 'producto_seco', 'aseo', 'empaque');
CREATE TYPE public.tipo_movimiento AS ENUM ('ingreso_compra', 'consumo_produccion', 'entrada_produccion', 'empaque', 'salida_despacho', 'ajuste_positivo', 'ajuste_negativo', 'merma', 'devolucion', 'donacion');
CREATE TYPE public.tipo_notificacion AS ENUM ('conteo_pendiente', 'donacion_pendiente');
CREATE TYPE public.tipo_precio AS ENUM ('fijo', 'por_variante', 'por_gramo', 'escala');
CREATE TYPE public.tipo_promocion AS ENUM ('paga_x_lleva_mas', 'producto_gratis');
CREATE TYPE public.unidad_medida AS ENUM ('g', 'kg', 'ml', 'l', 'unidad');
CREATE TYPE public.user_role AS ENUM ('admin', 'vendedor', 'logistica', 'contable', 'jefe_produccion', 'personalizado');

-- ---------------------------------------------------------------------
-- 3. Tablas
-- ---------------------------------------------------------------------

-- 3.1 Núcleo: usuarios, permisos y configuración -----------------------

CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text NOT NULL,
  role public.user_role DEFAULT 'vendedor'::public.user_role NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_permisos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  seccion public.app_seccion NOT NULL,
  puede_ver boolean DEFAULT false NOT NULL,
  puede_editar boolean DEFAULT false NOT NULL,
  updated_by uuid,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_permisos_pkey PRIMARY KEY (id),
  CONSTRAINT user_permisos_user_id_seccion_key UNIQUE (user_id, seccion),
  CONSTRAINT user_permisos_check CHECK ((puede_editar = false) OR (puede_ver = true)),
  CONSTRAINT user_permisos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_permisos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

CREATE TABLE public.zonas_envio (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  localidades text NOT NULL,
  tarifa_cliente numeric(10,2) NOT NULL,
  tarifa_mensajero numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id)
);

CREATE TABLE public.reglas_descuento (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  monto_minimo numeric(12,2) NOT NULL,
  pct_descuento_compra numeric(5,2) DEFAULT 0 NOT NULL,
  descuento_envio_fijo numeric(10,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT reglas_descuento_pkey PRIMARY KEY (id),
  CONSTRAINT reglas_descuento_monto_minimo_unique UNIQUE (monto_minimo)
);

CREATE TABLE public.config_comisiones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cierre_min numeric(5,2) NOT NULL,
  cierre_max numeric(5,2) NOT NULL,
  venta_2_pct numeric(5,2) DEFAULT 0 NOT NULL,
  venta_3_pct numeric(5,2) DEFAULT 0 NOT NULL,
  venta_4_pct numeric(5,2) DEFAULT 0 NOT NULL,
  venta_5_pct numeric(5,2) DEFAULT 0 NOT NULL,
  venta_6_pct numeric(5,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT config_comisiones_pkey PRIMARY KEY (id),
  CONSTRAINT config_comisiones_rango_check CHECK (cierre_min < cierre_max)
);

CREATE TABLE public.config_produccion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  porcion_estandar_g numeric DEFAULT 1200 NOT NULL,
  mezcla_min_g numeric DEFAULT 7200 NOT NULL,
  mezcla_max_g numeric DEFAULT 58000 NOT NULL,
  duracion_mezcla_min integer DEFAULT 45 NOT NULL,
  tolerancia_ajuste_g numeric DEFAULT 0 NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT config_produccion_pkey PRIMARY KEY (id),
  CONSTRAINT config_produccion_check CHECK ((mezcla_min_g > 0) AND (mezcla_max_g >= mezcla_min_g)),
  CONSTRAINT config_produccion_duracion_mezcla_min_check CHECK (duracion_mezcla_min > 0),
  CONSTRAINT config_produccion_porcion_estandar_g_check CHECK (porcion_estandar_g > 0),
  CONSTRAINT config_produccion_tolerancia_ajuste_g_check CHECK (tolerancia_ajuste_g >= 0)
);

CREATE TABLE public.pesos_magistrales (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  peso_g integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pesos_magistrales_pkey PRIMARY KEY (id),
  CONSTRAINT pesos_magistrales_peso_g_key UNIQUE (peso_g)
);

CREATE TABLE public.notificaciones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tipo public.tipo_notificacion NOT NULL,
  titulo text NOT NULL,
  mensaje text,
  entidad_tipo text,
  entidad_id uuid,
  destinatario_id uuid,
  leida_por uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.users(id)
);

-- 3.2 Catálogo ---------------------------------------------------------

CREATE TABLE public.categorias_producto (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT categorias_producto_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_producto_nombre_key UNIQUE (nombre),
  CONSTRAINT categorias_producto_slug_key UNIQUE (slug)
);

CREATE TABLE public.productos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sku text,
  nombre text NOT NULL,
  categoria_id uuid NOT NULL,
  tipo_precio public.tipo_precio DEFAULT 'por_variante'::public.tipo_precio NOT NULL,
  es_magistral boolean DEFAULT false NOT NULL,
  aplica_descuento_compra boolean DEFAULT true NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_sku_key UNIQUE (sku),
  CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_producto(id)
);

CREATE TABLE public.producto_variantes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  presentacion text NOT NULL,
  precio_publico numeric(10,2) NOT NULL,
  precio_por_gramo numeric(8,4),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  sku text NOT NULL,
  stock_minimo numeric DEFAULT 0 NOT NULL,
  gramaje_g integer,
  CONSTRAINT producto_variantes_pkey PRIMARY KEY (id),
  CONSTRAINT producto_variantes_sku_key UNIQUE (sku),
  CONSTRAINT producto_variantes_unique UNIQUE (producto_id, presentacion),
  CONSTRAINT producto_variantes_gramaje_positivo CHECK ((gramaje_g IS NULL) OR (gramaje_g > 0)),
  CONSTRAINT producto_variantes_stock_minimo_check CHECK (stock_minimo >= 0),
  CONSTRAINT producto_variantes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE
);

CREATE TABLE public.precios_escala (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  cantidad_minima integer NOT NULL,
  precio_total numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT precios_escala_pkey PRIMARY KEY (id),
  CONSTRAINT precios_escala_unique UNIQUE (producto_id, cantidad_minima),
  CONSTRAINT precios_escala_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE
);

CREATE TABLE public.kits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kits_pkey PRIMARY KEY (id)
);

CREATE TABLE public.kit_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  kit_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  cantidad integer DEFAULT 1 NOT NULL,
  CONSTRAINT kit_items_pkey PRIMARY KEY (id),
  CONSTRAINT kit_items_cantidad_check CHECK (cantidad >= 1),
  CONSTRAINT kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits(id) ON DELETE CASCADE,
  CONSTRAINT kit_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT kit_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id)
);

CREATE TABLE public.promociones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  tipo public.tipo_promocion NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  producto_id uuid,
  variante_id uuid,
  paga_x integer,
  lleva_extra integer,
  trigger_producto_id uuid,
  trigger_variante_id uuid,
  regalo_producto_id uuid,
  regalo_variante_id uuid,
  regalo_cantidad integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT promociones_pkey PRIMARY KEY (id),
  CONSTRAINT promociones_lleva_extra_check CHECK (lleva_extra >= 1),
  CONSTRAINT promociones_paga_x_check CHECK (paga_x >= 1),
  CONSTRAINT promociones_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT promociones_trigger_producto_id_fkey FOREIGN KEY (trigger_producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_trigger_variante_id_fkey FOREIGN KEY (trigger_variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT promociones_regalo_producto_id_fkey FOREIGN KEY (regalo_producto_id) REFERENCES public.productos(id),
  CONSTRAINT promociones_regalo_variante_id_fkey FOREIGN KEY (regalo_variante_id) REFERENCES public.producto_variantes(id)
);

-- 3.3 Clientes y aliados ----------------------------------------------

CREATE TABLE public.clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  codigo_cliente text NOT NULL,
  nombre_completo text NOT NULL,
  tipo_documento public.tipo_documento DEFAULT 'CC'::public.tipo_documento NOT NULL,
  numero_documento text NOT NULL,
  celular text NOT NULL,
  correo text,
  direccion text NOT NULL,
  complemento_direccion text,
  zona_id uuid,
  fuente public.fuente_cliente DEFAULT 'otro'::public.fuente_cliente NOT NULL,
  fuente_subtipo text,
  tipo_cliente public.tipo_cliente DEFAULT 'publico'::public.tipo_cliente NOT NULL,
  pct_descuento_distribuidor numeric(5,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  barrio text,
  notas_defecto text,
  creado_por uuid DEFAULT auth.uid(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente),
  CONSTRAINT clientes_numero_documento_key UNIQUE (numero_documento),
  CONSTRAINT clientes_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id),
  CONSTRAINT clientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.users(id)
);

CREATE TABLE public.mascotas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid NOT NULL,
  nombre text NOT NULL,
  raza text,
  peso_kg numeric(5,2),
  edad_meses integer,
  necesidad_dolor text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT mascotas_pkey PRIMARY KEY (id),
  CONSTRAINT mascotas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE
);

CREATE TABLE public.aliados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  tipo public.tipo_aliado NOT NULL,
  celular text,
  correo text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aliados_pkey PRIMARY KEY (id)
);

-- 3.4 Pedidos ----------------------------------------------------------

CREATE TABLE public.pedido_numero_seq (
  year integer NOT NULL,
  ultimo_numero integer DEFAULT 0 NOT NULL,
  CONSTRAINT pedido_numero_seq_pkey PRIMARY KEY (year)
);

CREATE TABLE public.pedidos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  numero_pedido text NOT NULL,
  cliente_id uuid NOT NULL,
  vendedor_id uuid NOT NULL,
  zona_id uuid,
  aliado_id uuid,
  estado public.estado_pedido DEFAULT 'fecha_tentativa'::public.estado_pedido NOT NULL,
  estado_pago public.estado_pago DEFAULT 'pendiente'::public.estado_pago NOT NULL,
  metodo_pago public.metodo_pago,
  fuente public.fuente_cliente DEFAULT 'otro'::public.fuente_cliente NOT NULL,
  fuente_subtipo text,
  numero_venta_cliente integer DEFAULT 1 NOT NULL,
  subtotal_alimento numeric(12,2) DEFAULT 0 NOT NULL,
  subtotal_snacks numeric(12,2) DEFAULT 0 NOT NULL,
  subtotal_otros numeric(12,2) DEFAULT 0 NOT NULL,
  pct_descuento_compra numeric(5,2) DEFAULT 0 NOT NULL,
  monto_descuento_compra numeric(12,2) DEFAULT 0 NOT NULL,
  tarifa_envio_cliente numeric(10,2) DEFAULT 0 NOT NULL,
  descuento_envio numeric(10,2) DEFAULT 0 NOT NULL,
  total_envio_cobrado numeric(10,2) DEFAULT 0 NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  notas_ventas text,
  notas_despacho text,
  franja_horaria public.franja_horaria DEFAULT 'sin_franja'::public.franja_horaria NOT NULL,
  es_contraentrega boolean DEFAULT false NOT NULL,
  fecha_tentativa_entrega date,
  fecha_confirmacion_pago timestamptz,
  fecha_entrega_real timestamptz,
  fue_editado boolean DEFAULT false NOT NULL,
  editado_por_id uuid,
  editado_en timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  direccion_entrega text,
  complemento_entrega text,
  barrio_entrega text,
  zona_entrega_id uuid,
  numero_bolsas integer DEFAULT 0 NOT NULL,
  es_donacion boolean DEFAULT false NOT NULL,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_numero_pedido_key UNIQUE (numero_pedido),
  CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id),
  CONSTRAINT pedidos_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id),
  CONSTRAINT pedidos_zona_entrega_id_fkey FOREIGN KEY (zona_entrega_id) REFERENCES public.zonas_envio(id),
  CONSTRAINT pedidos_aliado_id_fkey FOREIGN KEY (aliado_id) REFERENCES public.aliados(id),
  CONSTRAINT pedidos_editado_por_id_fkey FOREIGN KEY (editado_por_id) REFERENCES public.users(id)
);

CREATE TABLE public.detalle_pedido (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  nombre_snapshot text NOT NULL,
  precio_unitario_snapshot numeric(10,2) NOT NULL,
  es_magistral boolean DEFAULT false NOT NULL,
  gramaje_magistral numeric(8,2),
  cantidad integer DEFAULT 1 NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  aplica_descuento boolean DEFAULT true NOT NULL,
  notas_magistral text,
  created_at timestamptz DEFAULT now() NOT NULL,
  justificacion_precio text,
  es_promo boolean DEFAULT false NOT NULL,
  promo_id uuid,
  cantidad_entregada numeric DEFAULT 0,
  CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT detalle_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT detalle_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT detalle_pedido_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT detalle_pedido_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.promociones(id)
);

CREATE TABLE public.pedido_mascotas (
  pedido_id uuid NOT NULL,
  mascota_id uuid NOT NULL,
  CONSTRAINT pedido_mascotas_pkey PRIMARY KEY (pedido_id, mascota_id),
  CONSTRAINT pedido_mascotas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT pedido_mascotas_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES public.mascotas(id)
);

CREATE TABLE public.pedido_actividad (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  tipo text NOT NULL,
  usuario_id uuid,
  usuario_nombre text,
  created_at timestamptz DEFAULT now() NOT NULL,
  payload jsonb,
  CONSTRAINT pedido_actividad_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_actividad_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT pedido_actividad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id)
);

CREATE TABLE public.pedido_transiciones (
  estado_origen public.estado_pedido NOT NULL,
  estado_destino public.estado_pedido NOT NULL,
  roles public.user_role[] NOT NULL,
  descripcion text,
  CONSTRAINT pedido_transiciones_pkey PRIMARY KEY (estado_origen, estado_destino)
);

-- 3.5 Logística --------------------------------------------------------

CREATE TABLE public.mensajeros (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  placa_vehiculo text,
  telefono text NOT NULL,
  zona_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT mensajeros_pkey PRIMARY KEY (id),
  CONSTRAINT mensajeros_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id) ON DELETE SET NULL
);

CREATE TABLE public.rutas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  fecha date NOT NULL,
  franja public.franja_horaria DEFAULT 'AM'::public.franja_horaria NOT NULL,
  mensajero_nombre text,
  mensajero_celular text,
  estado public.estado_ruta DEFAULT 'en_preparacion'::public.estado_ruta NOT NULL,
  ajuste_extra_mensajero numeric(10,2) DEFAULT 0 NOT NULL,
  motivo_ajuste text,
  notas text,
  despachada_en timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  mensajero_id uuid,
  CONSTRAINT rutas_pkey PRIMARY KEY (id),
  CONSTRAINT rutas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT rutas_mensajero_id_fkey FOREIGN KEY (mensajero_id) REFERENCES public.mensajeros(id) ON DELETE SET NULL
);

CREATE TABLE public.pedido_ruta (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ruta_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  numero_bolsas integer DEFAULT 0 NOT NULL,
  orden_entrega integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pedido_ruta_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_ruta_unique UNIQUE (ruta_id, pedido_id),
  CONSTRAINT pedido_ruta_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.rutas(id) ON DELETE CASCADE,
  CONSTRAINT pedido_ruta_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);

CREATE TABLE public.notas_logistica (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid NOT NULL,
  texto text NOT NULL,
  creado_por uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completada boolean DEFAULT false NOT NULL,
  completada_por uuid,
  completada_en timestamptz,
  CONSTRAINT notas_logistica_pkey PRIMARY KEY (id),
  CONSTRAINT notas_logistica_texto_check CHECK (char_length(btrim(texto)) > 0),
  CONSTRAINT notas_logistica_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE,
  CONSTRAINT notas_logistica_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.users(id),
  CONSTRAINT notas_logistica_completada_por_fkey FOREIGN KEY (completada_por) REFERENCES public.users(id)
);

-- 3.6 Comisiones -------------------------------------------------------

CREATE TABLE public.leads_meta_ads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendedor_id uuid NOT NULL,
  fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
  periodo_mes text NOT NULL,
  cantidad_leads integer DEFAULT 0 NOT NULL,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT leads_meta_ads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_meta_unique UNIQUE (vendedor_id, fecha_registro),
  CONSTRAINT leads_meta_ads_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);

CREATE TABLE public.liquidaciones_comision (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendedor_id uuid NOT NULL,
  periodo_mes text NOT NULL,
  total_leads_meta integer DEFAULT 0 NOT NULL,
  total_cierres_meta integer DEFAULT 0 NOT NULL,
  pct_cierre_meta numeric(5,2) DEFAULT 0 NOT NULL,
  rango_cierre text,
  monto_total_comisiones numeric(12,2) DEFAULT 0 NOT NULL,
  estado public.estado_liquidacion DEFAULT 'borrador'::public.estado_liquidacion NOT NULL,
  fecha_liquidacion timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT liquidaciones_comision_pkey PRIMARY KEY (id),
  CONSTRAINT liquidaciones_unique UNIQUE (vendedor_id, periodo_mes),
  CONSTRAINT liquidaciones_comision_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);

CREATE TABLE public.comisiones_detalle (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  liquidacion_id uuid,
  pedido_id uuid NOT NULL,
  numero_venta_cliente integer NOT NULL,
  base_calculo numeric(12,2) NOT NULL,
  pct_comision numeric(5,2) DEFAULT 0 NOT NULL,
  monto_comision numeric(12,2) DEFAULT 0 NOT NULL,
  aplica_comision boolean DEFAULT false NOT NULL,
  razon_no_comision text,
  created_at timestamptz DEFAULT now() NOT NULL,
  vendedor_id uuid,
  periodo_mes text,
  is_provisional boolean DEFAULT true NOT NULL,
  CONSTRAINT comisiones_detalle_pkey PRIMARY KEY (id),
  CONSTRAINT comisiones_detalle_pedido_unique UNIQUE (pedido_id),
  CONSTRAINT comisiones_detalle_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones_comision(id),
  CONSTRAINT comisiones_detalle_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT comisiones_detalle_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id)
);

CREATE TABLE public.aliados_referidos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  aliado_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  fecha_inicio_comision date,
  fecha_fin_comision date,
  periodo_activo boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  pedido_primera_entrega_id uuid,
  CONSTRAINT aliados_referidos_pkey PRIMARY KEY (id),
  CONSTRAINT aliados_referidos_unique UNIQUE (aliado_id, cliente_id),
  CONSTRAINT aliados_referidos_aliado_id_fkey FOREIGN KEY (aliado_id) REFERENCES public.aliados(id),
  CONSTRAINT aliados_referidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  CONSTRAINT aliados_referidos_pedido_primera_entrega_id_fkey FOREIGN KEY (pedido_primera_entrega_id) REFERENCES public.pedidos(id) ON DELETE RESTRICT
);

CREATE TABLE public.comisiones_aliado (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  aliado_referido_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  tipo public.tipo_comision_aliado NOT NULL,
  base_calculo numeric(12,2) NOT NULL,
  porcentaje numeric(5,2) NOT NULL,
  monto numeric(12,2) NOT NULL,
  estado public.estado_comision_aliado DEFAULT 'pendiente'::public.estado_comision_aliado NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT comisiones_aliado_pkey PRIMARY KEY (id),
  CONSTRAINT comisiones_aliado_aliado_referido_id_fkey FOREIGN KEY (aliado_referido_id) REFERENCES public.aliados_referidos(id),
  CONSTRAINT comisiones_aliado_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);

-- 3.7 Inventario: insumos, recetas y lotes -----------------------------

CREATE TABLE public.insumo_codigo_seq (
  tipo public.tipo_insumo NOT NULL,
  ultimo_numero integer DEFAULT 0 NOT NULL,
  CONSTRAINT insumo_codigo_seq_pkey PRIMARY KEY (tipo)
);

CREATE TABLE public.ingreso_numero_seq (
  year integer NOT NULL,
  ultimo_numero integer DEFAULT 0 NOT NULL,
  CONSTRAINT ingreso_numero_seq_pkey PRIMARY KEY (year)
);

CREATE TABLE public.op_numero_seq (
  year integer NOT NULL,
  ultimo_numero integer DEFAULT 0 NOT NULL,
  CONSTRAINT op_numero_seq_pkey PRIMARY KEY (year)
);

CREATE TABLE public.remision_numero_seq (
  year integer NOT NULL,
  ultimo_numero integer DEFAULT 0 NOT NULL,
  CONSTRAINT remision_numero_seq_pkey PRIMARY KEY (year)
);

CREATE TABLE public.insumos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  codigo text NOT NULL,
  nombre text NOT NULL,
  tipo public.tipo_insumo NOT NULL,
  unidad_medida public.unidad_medida NOT NULL,
  stock_minimo numeric DEFAULT 0 NOT NULL,
  merma_pct numeric DEFAULT 0 NOT NULL,
  costo_promedio numeric DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  rendimiento_pct numeric DEFAULT 100 NOT NULL,
  CONSTRAINT insumos_pkey PRIMARY KEY (id),
  CONSTRAINT insumos_codigo_key UNIQUE (codigo),
  CONSTRAINT insumos_rendimiento_pct_check CHECK (rendimiento_pct > 0)
);

CREATE TABLE public.recetas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  nombre text NOT NULL,
  rendimiento numeric NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  base_gramos numeric,
  base_modo text DEFAULT 'gramos'::text NOT NULL,
  firma text,
  reemplazada_por uuid,
  CONSTRAINT recetas_pkey PRIMARY KEY (id),
  CONSTRAINT recetas_base_gramos_positiva CHECK ((base_gramos IS NULL) OR (base_gramos > 0)),
  CONSTRAINT recetas_base_modo_valido CHECK (base_modo = ANY (ARRAY['gramos'::text, 'unidades'::text])),
  CONSTRAINT recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT recetas_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT recetas_reemplazada_por_fkey FOREIGN KEY (reemplazada_por) REFERENCES public.recetas(id)
);

CREATE TABLE public.receta_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  receta_id uuid NOT NULL,
  insumo_id uuid NOT NULL,
  cantidad numeric NOT NULL,
  unidad_medida public.unidad_medida NOT NULL,
  CONSTRAINT receta_items_pkey PRIMARY KEY (id),
  CONSTRAINT receta_items_receta_insumo_unq UNIQUE (receta_id, insumo_id),
  CONSTRAINT receta_items_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE CASCADE,
  CONSTRAINT receta_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id)
);

CREATE TABLE public.ingresos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  numero text,
  tipo_ingreso public.tipo_insumo NOT NULL,
  proveedor text,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  temperatura_llegada numeric,
  placa_vehiculo text,
  total_costo numeric DEFAULT 0 NOT NULL,
  notas text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  anulado boolean DEFAULT false NOT NULL,
  anulado_motivo text,
  anulado_at timestamptz,
  anulado_por uuid,
  CONSTRAINT ingresos_pkey PRIMARY KEY (id),
  CONSTRAINT ingresos_numero_key UNIQUE (numero),
  CONSTRAINT ingresos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT ingresos_anulado_por_fkey FOREIGN KEY (anulado_por) REFERENCES public.users(id)
);

CREATE TABLE public.ingreso_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ingreso_id uuid NOT NULL,
  insumo_id uuid NOT NULL,
  cantidad numeric NOT NULL,
  precio_compra numeric NOT NULL,
  precio_unitario numeric GENERATED ALWAYS AS (precio_compra / NULLIF(cantidad, 0)) STORED,
  codigo_lote text NOT NULL,
  fecha_vencimiento date,
  CONSTRAINT ingreso_items_pkey PRIMARY KEY (id),
  CONSTRAINT ingreso_items_ingreso_id_fkey FOREIGN KEY (ingreso_id) REFERENCES public.ingresos(id) ON DELETE CASCADE,
  CONSTRAINT ingreso_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id)
);

CREATE TABLE public.insumo_lotes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  insumo_id uuid NOT NULL,
  codigo_lote text NOT NULL,
  cantidad_inicial numeric NOT NULL,
  cantidad_disponible numeric NOT NULL,
  costo_unitario numeric DEFAULT 0 NOT NULL,
  proveedor text,
  fecha_ingreso date DEFAULT CURRENT_DATE NOT NULL,
  fecha_vencimiento date,
  created_at timestamptz DEFAULT now() NOT NULL,
  ingreso_item_id uuid,
  CONSTRAINT insumo_lotes_pkey PRIMARY KEY (id),
  CONSTRAINT insumo_lotes_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id),
  CONSTRAINT insumo_lotes_ingreso_item_id_fkey FOREIGN KEY (ingreso_item_id) REFERENCES public.ingreso_items(id)
);

-- 3.8 Producción -------------------------------------------------------

CREATE TABLE public.producto_lotes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  codigo_lote text NOT NULL,
  cantidad_inicial numeric NOT NULL,
  cantidad_disponible numeric NOT NULL,
  estado public.estado_pt DEFAULT 'producido'::public.estado_pt NOT NULL,
  costo_unitario numeric DEFAULT 0 NOT NULL,
  fecha_produccion date DEFAULT CURRENT_DATE NOT NULL,
  fecha_vencimiento date,
  orden_produccion_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT producto_lotes_pkey PRIMARY KEY (id),
  CONSTRAINT producto_lotes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT producto_lotes_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id)
);

CREATE TABLE public.ordenes_produccion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  numero text,
  producto_id uuid,
  variante_id uuid,
  receta_id uuid,
  cantidad_planificada numeric,
  cantidad_producida numeric,
  estado public.estado_produccion DEFAULT 'planificada'::public.estado_produccion NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  costo_total numeric,
  producto_lote_id uuid,
  notas text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  orden_origen_id uuid,
  updated_at timestamptz,
  updated_by uuid,
  CONSTRAINT ordenes_produccion_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_produccion_numero_key UNIQUE (numero),
  CONSTRAINT ordenes_produccion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT ordenes_produccion_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT ordenes_produccion_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id),
  CONSTRAINT ordenes_produccion_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id),
  CONSTRAINT ordenes_produccion_orden_origen_id_fkey FOREIGN KEY (orden_origen_id) REFERENCES public.ordenes_produccion(id),
  CONSTRAINT ordenes_produccion_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT ordenes_produccion_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- FK circular producto_lotes -> ordenes_produccion (se añade después de crear ambas).
ALTER TABLE public.producto_lotes
  ADD CONSTRAINT fk_producto_lotes_op
  FOREIGN KEY (orden_produccion_id) REFERENCES public.ordenes_produccion(id);

CREATE TABLE public.orden_produccion_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  receta_id uuid,
  cantidad_planificada numeric NOT NULL,
  cantidad_producida numeric,
  costo_total numeric,
  producto_lote_id uuid,
  estado public.estado_produccion DEFAULT 'planificada'::public.estado_produccion NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  motivo_parcial text,
  CONSTRAINT orden_produccion_items_pkey PRIMARY KEY (id),
  CONSTRAINT orden_produccion_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  CONSTRAINT orden_produccion_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT orden_produccion_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT orden_produccion_items_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id),
  CONSTRAINT orden_produccion_items_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id)
);

CREATE TABLE public.orden_produccion_procesos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_id uuid NOT NULL,
  insumo_id uuid NOT NULL,
  cant_requerida_crudo numeric,
  temp_descongelacion numeric,
  cant_real_crudo numeric,
  lotes text,
  tiempo_coccion_horas numeric,
  temp_final_coccion numeric,
  kilos_antes_molido numeric,
  tiempo_molienda numeric,
  kilos_final_molido numeric,
  responsable_coccion text,
  responsable text,
  empaque_conforme boolean,
  rotulado boolean,
  liberacion_lote boolean,
  orden_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  cant_cocido_requerido numeric,
  factor_conversion numeric,
  cant_saldo_crudo numeric DEFAULT 0 NOT NULL,
  cant_a_cocinar_crudo numeric,
  cant_obtenida_cocido numeric,
  CONSTRAINT orden_produccion_procesos_pkey PRIMARY KEY (id),
  CONSTRAINT orden_produccion_procesos_orden_id_insumo_id_key UNIQUE (orden_id, insumo_id),
  CONSTRAINT orden_produccion_procesos_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  CONSTRAINT orden_produccion_procesos_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id)
);

CREATE TABLE public.orden_produccion_actividad (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_id uuid NOT NULL,
  tipo text NOT NULL,
  usuario_id uuid,
  usuario_nombre text,
  payload jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT orden_produccion_actividad_pkey PRIMARY KEY (id),
  CONSTRAINT orden_produccion_actividad_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE
);

CREATE TABLE public.orden_mezcla (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  total_gramos numeric,
  num_mezclas_sugerido numeric,
  num_mezclas numeric,
  porcion_estandar numeric DEFAULT 1200 NOT NULL,
  firma_mezclo text,
  firma_empaco text,
  firma_fecho text,
  firma_sello text,
  firma_verifico text,
  observaciones text,
  orden_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  desglose_presentaciones jsonb,
  config_produccion_id uuid,
  mezcla_min_g numeric,
  mezcla_max_g numeric,
  plan_mezclas jsonb,
  grupo_id uuid,
  grupo_firma text,
  CONSTRAINT orden_mezcla_pkey PRIMARY KEY (id),
  CONSTRAINT orden_mezcla_orden_id_producto_id_key UNIQUE (orden_id, producto_id),
  CONSTRAINT orden_mezcla_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  CONSTRAINT orden_mezcla_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT orden_mezcla_config_produccion_id_fkey FOREIGN KEY (config_produccion_id) REFERENCES public.config_produccion(id)
);

CREATE TABLE public.produccion_consumo (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_produccion_id uuid NOT NULL,
  insumo_lote_id uuid NOT NULL,
  cantidad_consumida numeric NOT NULL,
  costo numeric DEFAULT 0 NOT NULL,
  CONSTRAINT produccion_consumo_pkey PRIMARY KEY (id),
  CONSTRAINT produccion_consumo_orden_produccion_id_fkey FOREIGN KEY (orden_produccion_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  CONSTRAINT produccion_consumo_insumo_lote_id_fkey FOREIGN KEY (insumo_lote_id) REFERENCES public.insumo_lotes(id)
);

CREATE TABLE public.insumo_sobrante (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  insumo_id uuid NOT NULL,
  orden_origen_id uuid NOT NULL,
  orden_mezcla_id uuid,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  cantidad_cocido numeric NOT NULL,
  cantidad_crudo_equiv numeric NOT NULL,
  merma_pct_snap numeric NOT NULL,
  rendimiento_pct_snap numeric NOT NULL,
  cocido_consumido numeric DEFAULT 0 NOT NULL,
  estado text DEFAULT 'disponible'::text NOT NULL,
  nota text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT insumo_sobrante_pkey PRIMARY KEY (id),
  CONSTRAINT insumo_sobrante_orden_mezcla_id_insumo_id_key UNIQUE (orden_mezcla_id, insumo_id),
  CONSTRAINT insumo_sobrante_cantidad_cocido_check CHECK (cantidad_cocido > 0),
  CONSTRAINT insumo_sobrante_check CHECK (cocido_consumido <= cantidad_cocido),
  CONSTRAINT insumo_sobrante_cocido_consumido_check CHECK (cocido_consumido >= 0),
  CONSTRAINT insumo_sobrante_estado_check CHECK (estado = ANY (ARRAY['disponible'::text, 'consumido'::text, 'anulado'::text])),
  CONSTRAINT insumo_sobrante_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id),
  CONSTRAINT insumo_sobrante_orden_origen_id_fkey FOREIGN KEY (orden_origen_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
  CONSTRAINT insumo_sobrante_orden_mezcla_id_fkey FOREIGN KEY (orden_mezcla_id) REFERENCES public.orden_mezcla(id) ON DELETE SET NULL,
  CONSTRAINT insumo_sobrante_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.insumo_sobrante_aplicacion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sobrante_id uuid NOT NULL,
  orden_destino_id uuid NOT NULL,
  cantidad_cocido numeric NOT NULL,
  cantidad_crudo numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT insumo_sobrante_aplicacion_pkey PRIMARY KEY (id),
  CONSTRAINT insumo_sobrante_aplicacion_sobrante_id_orden_destino_id_key UNIQUE (sobrante_id, orden_destino_id),
  CONSTRAINT insumo_sobrante_aplicacion_cantidad_cocido_check CHECK (cantidad_cocido > 0),
  CONSTRAINT insumo_sobrante_aplicacion_sobrante_id_fkey FOREIGN KEY (sobrante_id) REFERENCES public.insumo_sobrante(id) ON DELETE CASCADE,
  CONSTRAINT insumo_sobrante_aplicacion_orden_destino_id_fkey FOREIGN KEY (orden_destino_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE
);

-- 3.9 Remisiones, conteos, movimientos, desperdicios y donaciones ------

CREATE TABLE public.remisiones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  numero text,
  pedido_id uuid NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT remisiones_pkey PRIMARY KEY (id),
  CONSTRAINT remisiones_numero_key UNIQUE (numero),
  CONSTRAINT remisiones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT remisiones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.remision_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  remision_id uuid NOT NULL,
  detalle_pedido_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  variante_id uuid,
  cantidad_entregada numeric NOT NULL,
  producto_lote_id uuid,
  CONSTRAINT remision_items_pkey PRIMARY KEY (id),
  CONSTRAINT remision_items_remision_id_fkey FOREIGN KEY (remision_id) REFERENCES public.remisiones(id) ON DELETE CASCADE,
  CONSTRAINT remision_items_detalle_pedido_id_fkey FOREIGN KEY (detalle_pedido_id) REFERENCES public.detalle_pedido(id),
  CONSTRAINT remision_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT remision_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT remision_items_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id)
);

CREATE TABLE public.conteos_inventario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  categoria public.categoria_conteo NOT NULL,
  notas text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  estado public.estado_conteo DEFAULT 'pendiente'::public.estado_conteo NOT NULL,
  motivo_rechazo text,
  revisado_por uuid,
  revisado_at timestamptz,
  CONSTRAINT conteos_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT conteos_inventario_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT conteos_inventario_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.users(id)
);

CREATE TABLE public.conteo_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conteo_id uuid NOT NULL,
  insumo_id uuid,
  producto_id uuid,
  variante_id uuid,
  cantidad_sistema numeric DEFAULT 0 NOT NULL,
  cantidad_contada numeric DEFAULT 0 NOT NULL,
  diferencia numeric GENERATED ALWAYS AS (cantidad_contada - cantidad_sistema) STORED,
  CONSTRAINT conteo_items_pkey PRIMARY KEY (id),
  CONSTRAINT conteo_items_conteo_id_fkey FOREIGN KEY (conteo_id) REFERENCES public.conteos_inventario(id) ON DELETE CASCADE,
  CONSTRAINT conteo_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id),
  CONSTRAINT conteo_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT conteo_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id)
);

CREATE TABLE public.movimientos_inventario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tipo public.tipo_movimiento NOT NULL,
  insumo_id uuid,
  producto_id uuid,
  variante_id uuid,
  lote_tipo text,
  lote_id uuid,
  cantidad numeric NOT NULL,
  costo_unitario numeric DEFAULT 0 NOT NULL,
  referencia_tipo text,
  referencia_id uuid,
  usuario_id uuid,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_inventario_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id),
  CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT movimientos_inventario_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id)
);

CREATE TABLE public.desperdicios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  insumo_id uuid,
  producto_id uuid,
  variante_id uuid,
  cantidad_kg numeric NOT NULL,
  temperatura_c numeric,
  proveedor text,
  codigo_lote text,
  insumo_lote_id uuid,
  producto_lote_id uuid,
  motivo public.motivo_desperdicio DEFAULT 'otro'::public.motivo_desperdicio NOT NULL,
  razon_dano text NOT NULL,
  accion_correctiva text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT desperdicios_pkey PRIMARY KEY (id),
  CONSTRAINT desperdicios_cantidad_kg_check CHECK (cantidad_kg > 0),
  CONSTRAINT desperdicios_item_chk CHECK ((insumo_id IS NULL) <> (producto_id IS NULL)),
  CONSTRAINT desperdicios_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id),
  CONSTRAINT desperdicios_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT desperdicios_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id),
  CONSTRAINT desperdicios_insumo_lote_id_fkey FOREIGN KEY (insumo_lote_id) REFERENCES public.insumo_lotes(id),
  CONSTRAINT desperdicios_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id),
  CONSTRAINT desperdicios_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.donaciones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  origen public.origen_donacion NOT NULL,
  pedido_id uuid,
  producto_lote_id uuid,
  destinatario text NOT NULL,
  motivo text NOT NULL,
  cantidad numeric,
  valor_comercial numeric DEFAULT 0 NOT NULL,
  estado public.estado_donacion DEFAULT 'pendiente'::public.estado_donacion NOT NULL,
  motivo_rechazo text,
  revisado_por uuid,
  revisado_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT donaciones_pkey PRIMARY KEY (id),
  CONSTRAINT donaciones_pedido_id_key UNIQUE (pedido_id),
  CONSTRAINT donaciones_cantidad_chk CHECK ((cantidad IS NULL) OR (cantidad > 0)),
  CONSTRAINT donaciones_origen_chk CHECK (
    ((origen = 'pedido'::public.origen_donacion) AND (pedido_id IS NOT NULL) AND (producto_lote_id IS NULL))
    OR ((origen = 'lote_pt'::public.origen_donacion) AND (producto_lote_id IS NOT NULL) AND (pedido_id IS NULL))
  ),
  CONSTRAINT donaciones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT donaciones_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id),
  CONSTRAINT donaciones_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.users(id),
  CONSTRAINT donaciones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 3.10 Tablas auxiliares (asistente de precios / memoria del agente) ---
-- No las consume el frontend del ERP, pero existen en dev y algunas
-- funciones/índices dependen de ellas (normalizar_texto, match_documents).

CREATE TABLE public.precios_productos (
  id serial NOT NULL,
  nombre_producto text NOT NULL,
  presentacion text NOT NULL,
  precio numeric NOT NULL,
  vigente boolean DEFAULT true,
  updated_at timestamp DEFAULT now(),
  CONSTRAINT precios_productos_pkey PRIMARY KEY (id),
  CONSTRAINT precios_productos_nombre_producto_presentacion_key UNIQUE (nombre_producto, presentacion),
  CONSTRAINT precios_productos_producto_presentacion_unique UNIQUE (nombre_producto, presentacion)
);

CREATE TABLE public.documents (
  id bigserial NOT NULL,
  content text,
  metadata jsonb,
  embedding public.vector(1536),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_memory (
  id serial NOT NULL,
  session_id varchar(255) NOT NULL,
  message jsonb NOT NULL,
  CONSTRAINT ai_memory_pkey PRIMARY KEY (id)
);

CREATE TABLE public.prompt (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  prompt text,
  CONSTRAINT prompt_pkey PRIMARY KEY (id)
);

*/
