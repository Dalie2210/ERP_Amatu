-- ============================================================================
-- FASE 3 — Transaccionalidad y concurrencia (I1, I2, I3, S5, S7)
-- ----------------------------------------------------------------------------
--   S5  Máquina de estados en la base: tabla pedido_transiciones + trigger.
--   I1  fn_crear_pedido: cabecera + líneas + mascotas en UNA transacción, con
--       los importes recalculados en el servidor (cierra el vector de S1).
--   I2  fn_editar_lineas_pedido: borrado + reinserción atómicos con bloqueo
--       optimista (PT409 si el pedido cambió mientras se editaba).
--   I3  fn_despachar_ruta: SELECT … FOR UPDATE + revalidación de estado, para
--       que dos clics simultáneos no descuenten el stock dos veces.
--   S7  Política de logística sobre pedidos, para poder retirar el service-role
--       de getDashboardStats sin perder visibilidad de los contraentrega.
--
-- Requiere 20260730000000_p0_hardening.sql (fn_pedido_guard_bypass).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. Motor de descuentos en SQL (espejo de src/lib/calculators/discounts.ts)
-- ----------------------------------------------------------------------------
-- Fuente única de los importes para fn_crear_pedido y fn_editar_lineas_pedido.
-- Replica exactamente calcularDescuentos(), incluido el detalle de que el
-- descuento de referido veterinario se resta del total pero NO se persiste en
-- ninguna columna de `pedidos` (no existe la columna).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_calcular_totales_pedido(
  p_subtotal_alimento      numeric,
  p_subtotal_snacks        numeric,
  p_subtotal_otros         numeric,
  p_tarifa_envio_base      numeric,
  p_es_distribuidor        boolean DEFAULT false,
  p_pct_desc_distribuidor  numeric DEFAULT 0,
  p_pct_desc_referido_vet  numeric DEFAULT 0
)
  -- Los OUT llevan prefijo o_ para no colisionar con las columnas homónimas de
  -- `pedidos` y `reglas_descuento` dentro del cuerpo de las funciones que la usan.
  RETURNS TABLE(
    o_pct_descuento_compra   numeric,
    o_monto_descuento_compra numeric,
    o_monto_descuento_vet    numeric,
    o_descuento_envio        numeric,
    o_total_envio_cobrado    numeric,
    o_total                  numeric
  )
  LANGUAGE plpgsql STABLE
  SET search_path TO 'public'
AS $$
DECLARE
  v_regla     RECORD;
  v_pct       numeric := 0;
  v_desc      numeric := 0;
  v_desc_vet  numeric := 0;
  v_desc_env  numeric := 0;
  v_env       numeric := 0;
BEGIN
  -- Tramo aplicable: el mayor monto_minimo que no supere el subtotal de alimento.
  SELECT r.pct_descuento_compra, r.descuento_envio_fijo
  INTO v_regla
  FROM reglas_descuento r
  WHERE r.is_active = true
    AND p_subtotal_alimento >= r.monto_minimo
  ORDER BY r.monto_minimo DESC
  LIMIT 1;

  v_pct      := COALESCE(v_regla.pct_descuento_compra, 0);
  v_desc_env := COALESCE(v_regla.descuento_envio_fijo, 0);

  -- El descuento de distribuidor sustituye al de tramo solo si es mayor.
  IF p_es_distribuidor AND COALESCE(p_pct_desc_distribuidor, 0) > v_pct THEN
    v_pct := p_pct_desc_distribuidor;
  END IF;

  v_desc := ROUND(p_subtotal_alimento * (v_pct / 100.0));

  IF COALESCE(p_pct_desc_referido_vet, 0) > 0 THEN
    v_desc_vet := ROUND((p_subtotal_alimento - v_desc) * (p_pct_desc_referido_vet / 100.0));
  END IF;

  v_env := GREATEST(0, COALESCE(p_tarifa_envio_base, 0) - v_desc_env);

  RETURN QUERY SELECT
    v_pct,
    v_desc,
    v_desc_vet,
    v_desc_env,
    v_env,
    (p_subtotal_alimento - v_desc - v_desc_vet
     + p_subtotal_snacks + p_subtotal_otros + v_env)::numeric;
END;
$$;

-- ============================================================================
-- S5 — Máquina de estados de pedidos en la base
-- ----------------------------------------------------------------------------
-- STAGE_TRANSITIONS vivía solo en src/lib/logistica/transitions.ts; la base
-- aceptaba cualquier valor del enum. Combinado con S1, un cliente podía saltar
-- de 'confirmado' a 'despachado' sin pasar por fn_despachar_ruta → no se
-- descontaba stock, no se generaban remisiones ni movimientos de inventario.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pedido_transiciones (
  estado_origen  public.estado_pedido NOT NULL,
  estado_destino public.estado_pedido NOT NULL,
  roles          public.user_role[]   NOT NULL,
  descripcion    text,
  CONSTRAINT pedido_transiciones_pkey PRIMARY KEY (estado_origen, estado_destino)
);

COMMENT ON TABLE public.pedido_transiciones IS
  'Transiciones legales de pedidos.estado, espejo de STAGE_TRANSITIONS en src/lib/logistica/transitions.ts. La UI puede restringir más (getTransitions), nunca menos. listo_despacho → despachado NO está aquí: solo la produce fn_despachar_ruta.';

ALTER TABLE public.pedido_transiciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedido_transiciones_select ON public.pedido_transiciones;
CREATE POLICY pedido_transiciones_select ON public.pedido_transiciones
  FOR SELECT TO authenticated USING (fn_get_user_role() IS NOT NULL);

DELETE FROM public.pedido_transiciones;
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES
  ('fecha_tentativa',   'confirmado',        ARRAY['admin','vendedor','logistica','contable']::public.user_role[], 'Confirmar pedido'),
  ('confirmado',        'en_preparacion',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Iniciar preparación'),
  ('confirmado',        'espera_produccion', ARRAY['admin','vendedor','logistica']::public.user_role[],            'Espera de producción'),
  ('confirmado',        'devolucion',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Devolución'),
  ('confirmado',        'cambio',            ARRAY['admin','vendedor','logistica']::public.user_role[],            'Cambio de producto'),
  ('en_preparacion',    'confirmado',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Volver a confirmado'),
  ('en_preparacion',    'espera_produccion', ARRAY['admin','vendedor','logistica']::public.user_role[],            'Espera de producción'),
  ('en_preparacion',    'listo_despacho',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Listo para despacho'),
  ('en_preparacion',    'devolucion',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Devolución'),
  ('en_preparacion',    'cambio',            ARRAY['admin','vendedor','logistica']::public.user_role[],            'Cambio de producto'),
  ('espera_produccion', 'en_preparacion',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Producción lista'),
  ('espera_produccion', 'listo_despacho',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Listo para despacho'),
  ('espera_produccion', 'devolucion',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Devolución'),
  ('listo_despacho',    'en_preparacion',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Volver a preparación'),
  ('listo_despacho',    'espera_produccion', ARRAY['admin','vendedor','logistica']::public.user_role[],            'Volver a espera producción'),
  ('listo_despacho',    'devolucion',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Devolución antes del despacho'),
  ('listo_despacho',    'cambio',            ARRAY['admin','vendedor','logistica']::public.user_role[],            'Cambio antes del despacho'),
  ('devolucion',        'confirmado',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Reactivar como confirmado'),
  ('devolucion',        'en_preparacion',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Reactivar a preparación'),
  ('cambio',            'confirmado',        ARRAY['admin','vendedor','logistica']::public.user_role[],            'Reactivar como confirmado'),
  ('cambio',            'en_preparacion',    ARRAY['admin','vendedor','logistica']::public.user_role[],            'Reactivar a preparación');

CREATE OR REPLACE FUNCTION public.fn_validar_transicion_pedido()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_role  public.user_role := fn_get_user_role();
  v_roles public.user_role[];
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  -- Único camino a 'despachado': fn_despachar_ruta, que activa esta bandera
  -- después de generar remisiones y descontar stock por FEFO.
  IF COALESCE(current_setting('app.pedido_transicion_libre', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT t.roles INTO v_roles
  FROM pedido_transiciones t
  WHERE t.estado_origen = OLD.estado AND t.estado_destino = NEW.estado;

  IF v_roles IS NULL THEN
    RAISE EXCEPTION 'Transición de pedido no permitida: % → %', OLD.estado, NEW.estado
      USING ERRCODE = '23514';
  END IF;

  IF v_role IS NULL OR NOT (v_role = ANY (v_roles)) THEN
    RAISE EXCEPTION 'El rol % no puede pasar un pedido de % a %',
      COALESCE(v_role::text, 'desconocido'), OLD.estado, NEW.estado
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b_validar_transicion_pedido ON public.pedidos;
-- `trg_b_` corre después de trg_a_guard_pedido_update (orden alfabético).
CREATE TRIGGER trg_b_validar_transicion_pedido
  BEFORE UPDATE OF estado ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_transicion_pedido();

-- ============================================================================
-- I1 — fn_crear_pedido: creación atómica con importes del lado servidor
-- ----------------------------------------------------------------------------
-- Antes eran tres escrituras independientes desde el navegador (pedidos →
-- detalle_pedido → pedido_mascotas). Si la segunda fallaba quedaba un pedido con
-- `total` correcto y CERO líneas, con su comisión provisional ya creada por
-- trg_crear_comision_provisional y contando para el numero_venta_cliente de los
-- pedidos siguientes de ese cliente.
--
-- Además, TODOS los inputs monetarios se derivan ahora en la base:
--   · reglas de descuento      ← reglas_descuento (is_active)
--   · % distribuidor           ← clientes.tipo_cliente / pct_descuento_distribuidor
--   · tarifa de envío          ← zonas_envio del cliente (igual que ClientSelector:
--                                 la dirección alterna no cambia la tarifa)
--   · 5% referido veterinario  ← < 2 pedidos confirmados + aliados_referidos activo
-- El cliente ya no puede influir en el total más allá de precio × cantidad de
-- cada línea, que queda auditado en detalle_pedido.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_crear_pedido(
  p_cabecera jsonb,
  p_items    jsonb,
  p_mascotas uuid[] DEFAULT '{}'::uuid[]
)
  -- Devuelve jsonb (no TABLE) para que ningún nombre de columna de salida
  -- ensombrezca las columnas homónimas de `pedidos` dentro del cuerpo.
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_role          public.user_role := fn_get_user_role();
  v_cliente       public.clientes%ROWTYPE;
  v_vendedor_id   uuid;
  v_metodo_pago   public.metodo_pago;
  v_contraentrega boolean;
  v_estado        public.estado_pedido;
  v_tarifa_envio  numeric := 0;
  v_pct_vet       numeric := 0;
  v_ventas_previas integer;
  v_referido_ok   boolean;
  v_sub_alim      numeric := 0;
  v_sub_snk       numeric := 0;
  v_sub_otr       numeric := 0;
  v_calc          RECORD;
  v_pedido        public.pedidos%ROWTYPE;
  v_usa_alterna   boolean := COALESCE((p_cabecera->>'usa_direccion_alterna')::boolean, false);
BEGIN
  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF v_role NOT IN ('admin'::public.user_role, 'vendedor'::public.user_role) THEN
    RAISE EXCEPTION 'Solo ventas puede crear pedidos' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido no tiene líneas' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_cliente FROM clientes WHERE id = (p_cabecera->>'cliente_id')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado' USING ERRCODE = '23503';
  END IF;

  -- SECURITY DEFINER salta RLS: hay que reproducir aquí el aislamiento por
  -- vendedor de clientes_select_auth para que nadie cree pedidos sobre clientes
  -- que no le corresponden.
  IF v_role = 'vendedor'::public.user_role
     AND v_cliente.creado_por IS DISTINCT FROM v_uid
     AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = v_cliente.id AND p.vendedor_id = v_uid)
  THEN
    RAISE EXCEPTION 'No puedes crear pedidos para este cliente' USING ERRCODE = '42501';
  END IF;

  v_vendedor_id := CASE
    WHEN v_role = 'vendedor'::public.user_role THEN v_uid
    ELSE COALESCE(NULLIF(p_cabecera->>'vendedor_id','')::uuid, v_uid)
  END;

  v_metodo_pago   := NULLIF(p_cabecera->>'metodo_pago','')::public.metodo_pago;
  v_contraentrega := (v_metodo_pago = 'contraentrega'::public.metodo_pago);
  v_estado        := CASE WHEN v_contraentrega
                          THEN 'confirmado'::public.estado_pedido
                          ELSE 'fecha_tentativa'::public.estado_pedido END;

  -- Tarifa de envío: zona del CLIENTE (la dirección alterna no la modifica,
  -- mismo criterio que ClientSelector.applyCliente).
  SELECT COALESCE(z.tarifa_cliente, 0) INTO v_tarifa_envio
  FROM zonas_envio z WHERE z.id = v_cliente.zona_id;
  v_tarifa_envio := COALESCE(v_tarifa_envio, 0);

  -- 5% de referido veterinario/entrenador: cliente con menos de 2 pedidos
  -- confirmados y con un periodo de aliado activo.
  SELECT COUNT(*) INTO v_ventas_previas
  FROM pedidos p
  WHERE p.cliente_id = v_cliente.id
    AND p.estado IN ('confirmado','en_preparacion','espera_produccion','listo_despacho','despachado');

  SELECT EXISTS (
    SELECT 1 FROM aliados_referidos ar
    WHERE ar.cliente_id = v_cliente.id AND ar.periodo_activo = true
  ) INTO v_referido_ok;

  IF v_ventas_previas < 2 AND v_referido_ok THEN
    v_pct_vet := 5;
  END IF;

  -- Subtotales por clasificación real (categoría en base, no la que envía el
  -- cliente): alimento = líneas con descuento; snacks = categoría 'snacks';
  -- otros = el resto (incluye magistrales).
  SELECT
    COALESCE(SUM(l.subtotal) FILTER (WHERE l.aplica_descuento), 0),
    COALESCE(SUM(l.subtotal) FILTER (WHERE NOT l.aplica_descuento AND l.slug = 'snacks'), 0),
    COALESCE(SUM(l.subtotal) FILTER (WHERE NOT l.aplica_descuento AND l.slug IS DISTINCT FROM 'snacks'), 0)
  INTO v_sub_alim, v_sub_snk, v_sub_otr
  FROM (
    SELECT
      ROUND((it->>'cantidad')::numeric * (it->>'precio_unitario')::numeric) AS subtotal,
      COALESCE((it->>'aplica_descuento')::boolean, false)                   AS aplica_descuento,
      cat.slug
    FROM jsonb_array_elements(p_items) it
    LEFT JOIN productos pr           ON pr.id = NULLIF(it->>'producto_id','')::uuid
    LEFT JOIN categorias_producto cat ON cat.id = pr.categoria_id
  ) l;

  SELECT * INTO v_calc FROM fn_calcular_totales_pedido(
    v_sub_alim, v_sub_snk, v_sub_otr, v_tarifa_envio,
    v_cliente.tipo_cliente = 'distribuidor'::public.tipo_cliente,
    COALESCE(v_cliente.pct_descuento_distribuidor, 0),
    v_pct_vet
  );

  INSERT INTO pedidos (
    cliente_id, vendedor_id, estado, estado_pago, fuente, fuente_subtipo,
    metodo_pago, franja_horaria, es_contraentrega, fecha_tentativa_entrega,
    notas_ventas, aliado_id,
    subtotal_alimento, subtotal_snacks, subtotal_otros,
    pct_descuento_compra, monto_descuento_compra,
    tarifa_envio_cliente, descuento_envio, total_envio_cobrado, total,
    direccion_entrega, complemento_entrega, barrio_entrega, zona_entrega_id
  ) VALUES (
    v_cliente.id, v_vendedor_id, v_estado, 'pendiente'::public.estado_pago,
    COALESCE(NULLIF(p_cabecera->>'fuente','')::public.fuente_cliente, 'otro'::public.fuente_cliente),
    NULLIF(p_cabecera->>'fuente_subtipo',''),
    v_metodo_pago,
    COALESCE(NULLIF(p_cabecera->>'franja_horaria','')::public.franja_horaria, 'sin_franja'::public.franja_horaria),
    v_contraentrega,
    NULLIF(p_cabecera->>'fecha_tentativa_entrega','')::date,
    NULLIF(p_cabecera->>'notas_ventas',''),
    NULLIF(p_cabecera->>'aliado_id','')::uuid,
    v_sub_alim, v_sub_snk, v_sub_otr,
    v_calc.o_pct_descuento_compra, v_calc.o_monto_descuento_compra,
    v_tarifa_envio, v_calc.o_descuento_envio, v_calc.o_total_envio_cobrado, v_calc.o_total,
    CASE WHEN v_usa_alterna THEN NULLIF(p_cabecera->>'direccion_entrega','')   END,
    CASE WHEN v_usa_alterna THEN NULLIF(p_cabecera->>'complemento_entrega','') END,
    CASE WHEN v_usa_alterna THEN NULLIF(p_cabecera->>'barrio_entrega','')      END,
    CASE WHEN v_usa_alterna THEN NULLIF(p_cabecera->>'zona_entrega_id','')::uuid END
  )
  RETURNING * INTO v_pedido;

  INSERT INTO detalle_pedido (
    pedido_id, producto_id, variante_id, nombre_snapshot,
    precio_unitario_snapshot, cantidad, subtotal, aplica_descuento,
    es_magistral, gramaje_magistral, notas_magistral, justificacion_precio,
    es_promo, promo_id
  )
  SELECT
    v_pedido.id,
    NULLIF(it->>'producto_id','')::uuid,
    NULLIF(it->>'variante_id','')::uuid,
    it->>'nombre_snapshot',
    (it->>'precio_unitario')::numeric,
    (it->>'cantidad')::integer,
    ROUND((it->>'cantidad')::numeric * (it->>'precio_unitario')::numeric),
    COALESCE((it->>'aplica_descuento')::boolean, false),
    COALESCE((it->>'es_magistral')::boolean, false),
    NULLIF(it->>'gramaje_magistral','')::numeric,
    NULLIF(it->>'notas_magistral',''),
    NULLIF(it->>'justificacion_precio',''),
    COALESCE((it->>'es_promo')::boolean, false),
    NULLIF(it->>'promo_id','')::uuid
  FROM jsonb_array_elements(p_items) it;

  IF p_mascotas IS NOT NULL AND array_length(p_mascotas, 1) > 0 THEN
    INSERT INTO pedido_mascotas (pedido_id, mascota_id)
    SELECT v_pedido.id, m
    FROM unnest(p_mascotas) m
    WHERE EXISTS (SELECT 1 FROM mascotas ms WHERE ms.id = m AND ms.cliente_id = v_cliente.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'pedido_id',     v_pedido.id,
    'numero_pedido', v_pedido.numero_pedido,
    'total',         v_calc.o_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_crear_pedido(jsonb, jsonb, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_crear_pedido(jsonb, jsonb, uuid[]) TO authenticated, service_role;

-- ============================================================================
-- I2 — fn_editar_lineas_pedido: atómico + bloqueo optimista
-- ----------------------------------------------------------------------------
-- /api/logistica/editar-productos borraba TODAS las líneas y las reinsertaba sin
-- transacción: si el proceso moría en medio, el pedido se quedaba sin líneas.
-- Sin control de concurrencia, además, dos usuarios editando el mismo pedido
-- producían la pérdida silenciosa del trabajo del primero.
--
-- Lanza SQLSTATE 'PT409' cuando `updated_at` ya no coincide con el que vio el
-- editor (PostgREST traduce PTxxx a HTTP xxx).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_editar_lineas_pedido(
  p_pedido_id            uuid,
  p_lineas               jsonb,
  p_updated_at_esperado  timestamptz DEFAULT NULL
)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       public.user_role := fn_get_user_role();
  v_nombre     text;
  v_pedido     public.pedidos%ROWTYPE;
  v_cliente    public.clientes%ROWTYPE;
  v_pct_vet    numeric := 0;
  v_ventas_previas integer;
  v_referido_ok boolean;
  v_sub_alim   numeric := 0;
  v_sub_snk    numeric := 0;
  v_sub_otr    numeric := 0;
  v_calc       RECORD;
  v_antes      jsonb;
  v_despues    jsonb;
  v_comision   RECORD;
  v_base       numeric;
  v_updated_at timestamptz;
BEGIN
  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'El pedido debe conservar al menos una línea' USING ERRCODE = '23514';
  END IF;

  -- Serializa a los editores concurrentes sobre el mismo pedido.
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado' USING ERRCODE = '23503';
  END IF;

  IF v_role NOT IN ('admin'::public.user_role, 'logistica'::public.user_role, 'vendedor'::public.user_role) THEN
    RAISE EXCEPTION 'Sin permisos para editar pedidos' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'vendedor'::public.user_role AND v_pedido.vendedor_id <> v_uid THEN
    RAISE EXCEPTION 'No puedes editar pedidos de otro vendedor' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.estado IN ('listo_despacho','despachado','devolucion','parcial') THEN
    RAISE EXCEPTION 'No se puede editar un pedido en estado %', v_pedido.estado
      USING ERRCODE = '23514';
  END IF;

  IF p_updated_at_esperado IS NOT NULL
     AND v_pedido.updated_at IS DISTINCT FROM p_updated_at_esperado
  THEN
    RAISE EXCEPTION 'El pedido fue modificado por otro usuario; recarga antes de guardar'
      USING ERRCODE = 'PT409';
  END IF;

  SELECT * INTO v_cliente FROM clientes WHERE id = v_pedido.cliente_id;

  -- Mismo criterio de descuento por referido que en la creación.
  SELECT COUNT(*) INTO v_ventas_previas
  FROM pedidos p
  WHERE p.cliente_id = v_pedido.cliente_id
    AND p.id <> v_pedido.id
    AND p.estado IN ('confirmado','en_preparacion','espera_produccion','listo_despacho','despachado');
  SELECT EXISTS (
    SELECT 1 FROM aliados_referidos ar
    WHERE ar.cliente_id = v_pedido.cliente_id AND ar.periodo_activo = true
  ) INTO v_referido_ok;
  IF v_ventas_previas < 2 AND v_referido_ok THEN
    v_pct_vet := 5;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'nombre', d.nombre_snapshot, 'cantidad', d.cantidad,
           'precio', d.precio_unitario_snapshot)), '[]'::jsonb)
  INTO v_antes
  FROM detalle_pedido d WHERE d.pedido_id = p_pedido_id;

  SELECT
    COALESCE(SUM(l.subtotal) FILTER (WHERE l.aplica_descuento), 0),
    COALESCE(SUM(l.subtotal) FILTER (WHERE NOT l.aplica_descuento AND l.slug = 'snacks'), 0),
    COALESCE(SUM(l.subtotal) FILTER (WHERE NOT l.aplica_descuento AND l.slug IS DISTINCT FROM 'snacks'), 0)
  INTO v_sub_alim, v_sub_snk, v_sub_otr
  FROM (
    SELECT
      ROUND((it->>'cantidad')::numeric * (it->>'precio_unitario')::numeric) AS subtotal,
      COALESCE((it->>'aplica_descuento')::boolean, false)                   AS aplica_descuento,
      cat.slug
    FROM jsonb_array_elements(p_lineas) it
    LEFT JOIN productos pr            ON pr.id = NULLIF(it->>'producto_id','')::uuid
    LEFT JOIN categorias_producto cat ON cat.id = pr.categoria_id
  ) l;

  SELECT * INTO v_calc FROM fn_calcular_totales_pedido(
    v_sub_alim, v_sub_snk, v_sub_otr, COALESCE(v_pedido.tarifa_envio_cliente, 0),
    v_cliente.tipo_cliente = 'distribuidor'::public.tipo_cliente,
    COALESCE(v_cliente.pct_descuento_distribuidor, 0),
    v_pct_vet
  );

  DELETE FROM detalle_pedido WHERE pedido_id = p_pedido_id;

  INSERT INTO detalle_pedido (
    pedido_id, producto_id, variante_id, nombre_snapshot,
    precio_unitario_snapshot, cantidad, subtotal, aplica_descuento,
    es_magistral, gramaje_magistral, notas_magistral, justificacion_precio,
    es_promo, promo_id
  )
  SELECT
    p_pedido_id,
    NULLIF(it->>'producto_id','')::uuid,
    NULLIF(it->>'variante_id','')::uuid,
    it->>'nombre_snapshot',
    (it->>'precio_unitario')::numeric,
    (it->>'cantidad')::integer,
    ROUND((it->>'cantidad')::numeric * (it->>'precio_unitario')::numeric),
    COALESCE((it->>'aplica_descuento')::boolean, false),
    COALESCE((it->>'es_magistral')::boolean, false),
    NULLIF(it->>'gramaje_magistral','')::numeric,
    NULLIF(it->>'notas_magistral',''),
    NULLIF(it->>'justificacion_precio',''),
    COALESCE((it->>'es_promo')::boolean, false),
    NULLIF(it->>'promo_id','')::uuid
  FROM jsonb_array_elements(p_lineas) it;

  -- Vía de confianza: los importes ya se recalcularon en el servidor.
  PERFORM set_config('app.pedido_guard_bypass', 'on', true);

  UPDATE pedidos SET
    subtotal_alimento      = v_sub_alim,
    subtotal_snacks        = v_sub_snk,
    subtotal_otros         = v_sub_otr,
    pct_descuento_compra   = v_calc.o_pct_descuento_compra,
    monto_descuento_compra = v_calc.o_monto_descuento_compra,
    descuento_envio        = v_calc.o_descuento_envio,
    total_envio_cobrado    = v_calc.o_total_envio_cobrado,
    total                  = v_calc.o_total,
    fue_editado            = true,
    editado_por_id         = v_uid,
    editado_en             = now()
  WHERE id = p_pedido_id
  RETURNING pedidos.updated_at INTO v_updated_at;

  PERFORM set_config('app.pedido_guard_bypass', 'off', true);

  -- Recalcular la base de comisión conservando el pct vigente.
  SELECT cd.id, cd.pct_comision INTO v_comision
  FROM comisiones_detalle cd WHERE cd.pedido_id = p_pedido_id;
  IF FOUND THEN
    v_base := ROUND((v_calc.o_total - v_calc.o_total_envio_cobrado) * 0.95);
    UPDATE comisiones_detalle
    SET base_calculo = v_base,
        monto_comision = ROUND(v_base * (COALESCE(v_comision.pct_comision, 0) / 100.0)),
        is_provisional = true
    WHERE id = v_comision.id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'nombre', d.nombre_snapshot, 'cantidad', d.cantidad,
           'precio', d.precio_unitario_snapshot)), '[]'::jsonb)
  INTO v_despues
  FROM detalle_pedido d WHERE d.pedido_id = p_pedido_id;

  SELECT u.full_name INTO v_nombre FROM users u WHERE u.id = v_uid;

  INSERT INTO pedido_actividad (pedido_id, tipo, usuario_id, usuario_nombre, payload)
  VALUES (p_pedido_id, 'productos_editados', v_uid, v_nombre,
          jsonb_build_object('items_antes', v_antes, 'items_despues', v_despues));

  RETURN jsonb_build_object(
    'subtotal_alimento',      v_sub_alim,
    'subtotal_snacks',        v_sub_snk,
    'subtotal_otros',         v_sub_otr,
    'pct_descuento_compra',   v_calc.o_pct_descuento_compra,
    'monto_descuento_compra', v_calc.o_monto_descuento_compra,
    'descuento_envio',        v_calc.o_descuento_envio,
    'total_envio_cobrado',    v_calc.o_total_envio_cobrado,
    'total',                  v_calc.o_total,
    'updated_at',             v_updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_editar_lineas_pedido(uuid, jsonb, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_editar_lineas_pedido(uuid, jsonb, timestamptz) TO authenticated, service_role;

-- ============================================================================
-- Confirmación de pago y de venta — las dos vías legítimas que S1 cerró
-- ============================================================================

-- estado_pago solo se mueve por aquí (salvo contable, que lo hace directo).
-- Es de un solo sentido: no se "des-confirma" un pago, para que no se pueda
-- inflar y desinflar el monto ganado de una liquidación.
CREATE OR REPLACE FUNCTION public.fn_confirmar_pago_pedido(
  p_pedido_id   uuid,
  p_metodo_pago text DEFAULT NULL
)
  RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   public.user_role := fn_get_user_role();
  v_pedido public.pedidos%ROWTYPE;
  v_nombre text;
BEGIN
  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado' USING ERRCODE = '23503';
  END IF;

  IF v_role = 'vendedor'::public.user_role AND v_pedido.vendedor_id <> v_uid THEN
    RAISE EXCEPTION 'No puedes confirmar el pago de un pedido de otro vendedor'
      USING ERRCODE = '42501';
  END IF;
  IF v_role NOT IN ('admin'::public.user_role, 'contable'::public.user_role,
                    'logistica'::public.user_role, 'vendedor'::public.user_role) THEN
    RAISE EXCEPTION 'Sin permisos para confirmar pagos' USING ERRCODE = '42501';
  END IF;

  IF v_pedido.estado_pago = 'confirmado'::public.estado_pago THEN
    RETURN;  -- idempotente
  END IF;

  PERFORM set_config('app.pedido_guard_bypass', 'on', true);
  UPDATE pedidos
  SET estado_pago = 'confirmado'::public.estado_pago,
      fecha_confirmacion_pago = now(),
      metodo_pago = COALESCE(NULLIF(p_metodo_pago,'')::public.metodo_pago, metodo_pago)
  WHERE id = p_pedido_id;
  PERFORM set_config('app.pedido_guard_bypass', 'off', true);

  SELECT u.full_name INTO v_nombre FROM users u WHERE u.id = v_uid;
  INSERT INTO pedido_actividad (pedido_id, tipo, usuario_id, usuario_nombre, payload)
  VALUES (p_pedido_id, 'pago_confirmado', v_uid, v_nombre,
          jsonb_build_object('metodo_pago', p_metodo_pago));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_confirmar_pago_pedido(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_confirmar_pago_pedido(uuid, text) TO authenticated, service_role;

-- fn_confirmar_venta pasa a SECURITY DEFINER: con el guard de S1 activo, un
-- vendedor ya no puede escribir `estado` directamente, así que la función tiene
-- que autorizar por sí misma y activar la vía de confianza. La validación de la
-- transición (fecha_tentativa → confirmado) la sigue haciendo el trigger.
CREATE OR REPLACE FUNCTION public.fn_confirmar_venta(
  p_pedido_id uuid,
  p_confirmar_pago boolean DEFAULT false
)
  RETURNS TABLE(producto_id UUID, variante_id UUID, cantidad_comprometida NUMERIC)
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_role   public.user_role := fn_get_user_role();
  v_pedido public.pedidos%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado' USING ERRCODE = '23503';
  END IF;

  IF v_role = 'vendedor'::public.user_role AND v_pedido.vendedor_id <> v_uid THEN
    RAISE EXCEPTION 'No puedes confirmar un pedido de otro vendedor' USING ERRCODE = '42501';
  END IF;
  IF v_role NOT IN ('admin'::public.user_role, 'vendedor'::public.user_role,
                    'logistica'::public.user_role, 'contable'::public.user_role) THEN
    RAISE EXCEPTION 'Sin permisos para confirmar pedidos' USING ERRCODE = '42501';
  END IF;

  IF v_pedido.estado <> 'confirmado'::public.estado_pedido
     OR (p_confirmar_pago AND v_pedido.estado_pago = 'pendiente'::public.estado_pago)
  THEN
    PERFORM set_config('app.pedido_guard_bypass', 'on', true);
    UPDATE pedidos
    SET estado = 'confirmado'::public.estado_pedido,
        estado_pago = CASE
          WHEN p_confirmar_pago AND estado_pago = 'pendiente'::public.estado_pago
          THEN 'confirmado'::public.estado_pago ELSE estado_pago END,
        fecha_confirmacion_pago = CASE
          WHEN p_confirmar_pago AND estado_pago = 'pendiente'::public.estado_pago
          THEN now() ELSE fecha_confirmacion_pago END
    WHERE id = p_pedido_id;
    PERFORM set_config('app.pedido_guard_bypass', 'off', true);
  END IF;

  RETURN QUERY
  SELECT cv.componente_producto_id, cv.componente_variante_id, SUM(cv.cantidad_componente)::NUMERIC
  FROM v_componentes_venta cv
  WHERE cv.pedido_id = p_pedido_id
  GROUP BY cv.componente_producto_id, cv.componente_variante_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_confirmar_venta(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_confirmar_venta(uuid, boolean) TO authenticated, service_role;

-- ============================================================================
-- I3 — fn_despachar_ruta: bloqueo de la fila y revalidación de estado
-- ----------------------------------------------------------------------------
-- La validación `ruta.estado === 'despachada'` vivía en TS, antes de llamar a la
-- RPC. Dos clics simultáneos (o dos usuarios de logística) pasaban ambos la
-- comprobación y descontaban el stock dos veces. Ahora la ruta se bloquea con
-- FOR UPDATE y se revalida dentro de la transacción, igual que las RPC de
-- producción (20260702_sprint_2c_01_rpc.sql:141).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_despachar_ruta(p_ruta_id uuid)
  RETURNS TABLE(
    numero_pedido   text,
    producto_nombre text,
    mensaje         text,
    advertencia     boolean
  ) LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_role   public.user_role := fn_get_user_role();
  v_ruta   public.rutas%ROWTYPE;
  v_pedido RECORD;
  v_items  JSONB;
  v_res    RECORD;
  v_mag    RECORD;
  v_now    TIMESTAMPTZ := now();
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('admin'::public.user_role, 'logistica'::public.user_role) THEN
    RAISE EXCEPTION 'Sin permisos para despachar rutas' USING ERRCODE = '42501';
  END IF;

  -- Bloqueo de la ruta: el segundo despacho concurrente espera aquí y encuentra
  -- el estado ya actualizado.
  SELECT * INTO v_ruta FROM rutas WHERE id = p_ruta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ruta no encontrada' USING ERRCODE = '23503';
  END IF;
  IF v_ruta.estado = 'despachada'::public.estado_ruta THEN
    RAISE EXCEPTION 'La ruta ya fue despachada' USING ERRCODE = 'PT409';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pedido_ruta pr WHERE pr.ruta_id = p_ruta_id) THEN
    RAISE EXCEPTION 'La ruta no tiene pedidos asignados' USING ERRCODE = '23514';
  END IF;

  FOR v_pedido IN
    SELECT pr.pedido_id, p.numero_pedido
    FROM pedido_ruta pr
    JOIN pedidos p ON p.id = pr.pedido_id
    WHERE pr.ruta_id = p_ruta_id
  LOOP
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('detalle_id', d.id, 'cantidad', d.cantidad - COALESCE(d.cantidad_entregada, 0))),
      '[]'::jsonb
    )
    INTO v_items
    FROM detalle_pedido d
    WHERE d.pedido_id = v_pedido.pedido_id
      AND (d.cantidad - COALESCE(d.cantidad_entregada, 0)) > 0;

    IF jsonb_array_length(v_items) > 0 THEN
      FOR v_res IN SELECT * FROM fn_despachar_remision(v_pedido.pedido_id, v_items)
      LOOP
        IF v_res.advertencia THEN
          numero_pedido := v_pedido.numero_pedido;
          producto_nombre := v_res.producto_nombre;
          mensaje := v_res.mensaje;
          advertencia := true;
          RETURN NEXT;
        END IF;
      END LOOP;

      FOR v_mag IN
        SELECT p.nombre AS prod_nombre
        FROM detalle_pedido d
        JOIN productos p ON p.id = d.producto_id
        WHERE d.pedido_id = v_pedido.pedido_id AND d.es_magistral = true
      LOOP
        numero_pedido := v_pedido.numero_pedido;
        producto_nombre := v_mag.prod_nombre;
        mensaje := 'Magistral entregado sin descuento de inventario (consumo por gramo pendiente)';
        advertencia := true;
        RETURN NEXT;
      END LOOP;
    END IF;
  END LOOP;

  UPDATE rutas SET estado = 'despachada', despachada_en = v_now WHERE id = p_ruta_id;

  -- Único punto del sistema autorizado a producir el estado 'despachado': ya se
  -- generaron remisiones y se descontó el stock por FEFO.
  PERFORM set_config('app.pedido_guard_bypass', 'on', true);
  PERFORM set_config('app.pedido_transicion_libre', 'on', true);

  UPDATE pedidos SET estado = 'despachado', fecha_entrega_real = v_now
  WHERE id IN (SELECT pedido_id FROM pedido_ruta WHERE ruta_id = p_ruta_id);

  PERFORM set_config('app.pedido_transicion_libre', 'off', true);
  PERFORM set_config('app.pedido_guard_bypass', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_despachar_ruta(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_despachar_ruta(uuid) TO authenticated, service_role;

-- ============================================================================
-- S7 — Visibilidad de logística sin service-role
-- ----------------------------------------------------------------------------
-- getDashboardStats usaba createAdminClient() para logística y contable. Al
-- pasar al cliente de sesión, la política anterior (`estado_pago = 'confirmado'`)
-- dejaba fuera los contraentrega, que están confirmados pero con el pago
-- pendiente hasta la entrega — precisamente los que logística debe despachar.
-- Se amplía a "todo pedido que ya entró al flujo operativo".
-- ============================================================================

DROP POLICY IF EXISTS pedidos_select_auth ON public.pedidos;
CREATE POLICY pedidos_select_auth ON public.pedidos FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR ((fn_get_user_role() = 'logistica'::user_role)
        AND (estado_pago = 'confirmado'::estado_pago
             OR estado <> 'fecha_tentativa'::estado_pedido))
    OR ((fn_get_user_role() = 'vendedor'::user_role) AND (vendedor_id = (SELECT auth.uid())))
  );

-- detalle_pedido y pedido_mascotas replican la visibilidad del pedido padre.
DROP POLICY IF EXISTS detalle_select_auth ON public.detalle_pedido;
CREATE POLICY detalle_select_auth ON public.detalle_pedido FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = detalle_pedido.pedido_id
        AND (
          ((fn_get_user_role() = 'logistica'::user_role)
           AND (p.estado_pago = 'confirmado'::estado_pago
                OR p.estado <> 'fecha_tentativa'::estado_pedido))
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    ))
  );

DROP POLICY IF EXISTS pedido_mascotas_select_auth ON public.pedido_mascotas;
CREATE POLICY pedido_mascotas_select_auth ON public.pedido_mascotas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_mascotas.pedido_id
        AND (
          (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
          OR ((fn_get_user_role() = 'logistica'::user_role)
              AND (p.estado_pago = 'confirmado'::estado_pago
                   OR p.estado <> 'fecha_tentativa'::estado_pedido))
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    )
  );

COMMIT;
