-- ============================================================
-- MIGRACIÓN: ERP-DON-01/02/03 — Donaciones (lógica)
-- ------------------------------------------------------------
-- Requiere 20260821010000_donaciones.sql (tabla, enums y pedidos.es_donacion).
--
-- Cuatro frentes:
--   1. fn_crear_pedido acepta el toggle "Es donación" (admin-only), fuerza
--      total 0 y deja el pedido esperando aprobación.
--   2. Los triggers de comisión y de numero_venta_cliente ignoran donaciones,
--      para que regalar producto no mueva los tramos de comisión del cliente.
--   3. fn_donar_lote_pt registra la intención de donar stock existente, SIN
--      descontarlo todavía.
--   4. fn_aprobar_donacion / fn_rechazar_donacion, admin-only, únicos lugares
--      donde la donación surte efecto (mismo patrón que fn_aprobar_conteo).
-- ============================================================

-- ------------------------------------------------------------
-- 1. fn_crear_pedido — con soporte de donación
-- ------------------------------------------------------------
-- Reemplaza la versión de 20260731000000_transaccionalidad.sql conservando
-- firma y comportamiento; los únicos cambios están marcados con "DONACIÓN".
CREATE OR REPLACE FUNCTION public.fn_crear_pedido(
  p_cabecera jsonb,
  p_items    jsonb,
  p_mascotas uuid[] DEFAULT '{}'::uuid[]
)
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
  -- DONACIÓN
  v_es_donacion   boolean := COALESCE((p_cabecera->>'es_donacion')::boolean, false);
  v_destinatario  text    := NULLIF(btrim(COALESCE(p_cabecera->>'donacion_destinatario', '')), '');
  v_motivo_don    text    := NULLIF(btrim(COALESCE(p_cabecera->>'donacion_motivo', '')), '');
  v_total         numeric;
  v_envio_cobrado numeric;
  v_desc_envio    numeric;
  v_pct_desc      numeric;
  v_monto_desc    numeric;
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

  -- DONACIÓN: el toggle solo se muestra a admin en la UI, pero eso es
  -- cosmético — quien llame la RPC directamente tampoco puede saltárselo.
  IF v_es_donacion THEN
    IF v_role <> 'admin'::public.user_role THEN
      RAISE EXCEPTION 'Solo un administrador puede registrar donaciones' USING ERRCODE = '42501';
    END IF;
    IF v_destinatario IS NULL THEN
      RAISE EXCEPTION 'El destinatario de la donación es requerido' USING ERRCODE = '23514';
    END IF;
    IF v_motivo_don IS NULL THEN
      RAISE EXCEPTION 'El motivo de la donación es requerido' USING ERRCODE = '23514';
    END IF;
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
  -- DONACIÓN: no entra a logística hasta que un admin la apruebe, así que
  -- ignora el atajo de contraentrega y espera en fecha_tentativa.
  v_estado        := CASE WHEN v_es_donacion THEN 'fecha_tentativa'::public.estado_pedido
                          WHEN v_contraentrega THEN 'confirmado'::public.estado_pedido
                          ELSE 'fecha_tentativa'::public.estado_pedido END;

  -- Tarifa de envío: zona del CLIENTE (la dirección alterna no la modifica,
  -- mismo criterio que ClientSelector.applyCliente).
  SELECT COALESCE(z.tarifa_cliente, 0) INTO v_tarifa_envio
  FROM zonas_envio z WHERE z.id = v_cliente.zona_id;
  v_tarifa_envio := COALESCE(v_tarifa_envio, 0);

  -- 5% de referido veterinario/entrenador: cliente con menos de 2 pedidos
  -- confirmados y con un periodo de aliado activo. DONACIÓN: los pedidos
  -- donados no consumen ese cupo — no fueron una compra.
  SELECT COUNT(*) INTO v_ventas_previas
  FROM pedidos p
  WHERE p.cliente_id = v_cliente.id
    AND NOT p.es_donacion
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

  -- DONACIÓN: no se cobra nada. Los SUBTOTALES sí se conservan — son el valor
  -- comercial de lo donado, que es justamente lo que audita ERP-DON-04.
  IF v_es_donacion THEN
    v_pct_desc      := 0;
    v_monto_desc    := 0;
    v_desc_envio    := 0;
    v_envio_cobrado := 0;
    v_total         := 0;
  ELSE
    v_pct_desc      := v_calc.o_pct_descuento_compra;
    v_monto_desc    := v_calc.o_monto_descuento_compra;
    v_desc_envio    := v_calc.o_descuento_envio;
    v_envio_cobrado := v_calc.o_total_envio_cobrado;
    v_total         := v_calc.o_total;
  END IF;

  INSERT INTO pedidos (
    cliente_id, vendedor_id, estado, estado_pago, fuente, fuente_subtipo,
    metodo_pago, franja_horaria, es_contraentrega, fecha_tentativa_entrega,
    notas_ventas, aliado_id, es_donacion,
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
    v_contraentrega AND NOT v_es_donacion,
    NULLIF(p_cabecera->>'fecha_tentativa_entrega','')::date,
    NULLIF(p_cabecera->>'notas_ventas',''),
    NULLIF(p_cabecera->>'aliado_id','')::uuid,
    v_es_donacion,
    v_sub_alim, v_sub_snk, v_sub_otr,
    v_pct_desc, v_monto_desc,
    CASE WHEN v_es_donacion THEN 0 ELSE v_tarifa_envio END,
    v_desc_envio, v_envio_cobrado, v_total,
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

  -- DONACIÓN: queda pendiente de aprobación y se avisa a los admins.
  IF v_es_donacion THEN
    INSERT INTO donaciones (
      origen, pedido_id, destinatario, motivo, valor_comercial, created_by
    ) VALUES (
      'pedido'::origen_donacion, v_pedido.id, v_destinatario, v_motivo_don,
      v_sub_alim + v_sub_snk + v_sub_otr, v_uid
    );

    INSERT INTO notificaciones (tipo, titulo, mensaje, entidad_tipo, entidad_id, destinatario_id)
    VALUES (
      'donacion_pendiente',
      'Donación pendiente de aprobación',
      'Pedido ' || v_pedido.numero_pedido || ' registrado como donación para ' || v_destinatario,
      'donacion', v_pedido.id, NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'pedido_id',     v_pedido.id,
    'numero_pedido', v_pedido.numero_pedido,
    'total',         v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_crear_pedido(jsonb, jsonb, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_crear_pedido(jsonb, jsonb, uuid[]) TO authenticated, service_role;


-- ------------------------------------------------------------
-- 2. Las donaciones no comisionan ni cuentan como venta del cliente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_crear_comision_provisional()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_base numeric(12,2);
BEGIN
  -- ERP-DON-01: una donación no genera comisión. Se sale antes de insertar
  -- para no dejar una fila en 0 que ensucie el desglose del vendedor.
  IF NEW.es_donacion THEN
    RETURN NEW;
  END IF;

  -- Base = (total - envío cobrado) * 0.95 (−5% IVA). vendedor_id/periodo_mes los
  -- completa el trigger BEFORE INSERT fn_set_comision_periodo_on_insert.
  v_base := ROUND((COALESCE(NEW.total, 0) - COALESCE(NEW.total_envio_cobrado, 0)) * 0.95);

  INSERT INTO public.comisiones_detalle (
    pedido_id, numero_venta_cliente, base_calculo,
    pct_comision, monto_comision, aplica_comision, is_provisional
  ) VALUES (
    NEW.id, NEW.numero_venta_cliente, v_base,
    0, 0, false, true
  )
  ON CONFLICT (pedido_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_crear_comision_provisional() IS
  'Crea la comisión provisional de un pedido nuevo. Las donaciones (ERP-DON-01) se omiten: no comisionan.';

-- El conteo de ventas del cliente debe ignorar lo donado, o regalar producto
-- empujaría al cliente a un tramo de comisión superior en su próxima compra.
CREATE OR REPLACE FUNCTION public.fn_calcular_numero_venta_cliente()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  venta_count INTEGER;
BEGIN
  IF NEW.es_donacion THEN
    NEW.numero_venta_cliente := 0;
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO venta_count
  FROM pedidos p
  WHERE p.cliente_id = NEW.cliente_id
    AND NOT p.es_donacion
    AND p.estado IN (
      'confirmado', 'en_preparacion', 'espera_produccion',
      'listo_despacho', 'despachado'
    )
    AND p.id != NEW.id;
  NEW.numero_venta_cliente := venta_count + 1;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_calcular_numero_venta_cliente() IS
  'Numera las compras del cliente en todos los vendedores. Las donaciones quedan en 0 y no cuentan para las demás (ERP-DON-01).';


-- ------------------------------------------------------------
-- 3. fn_donar_lote_pt — donar stock ya existente (ERP-DON-02)
-- ------------------------------------------------------------
-- Modelada sobre fn_ajustar_lote_pt (20260729010000), con una diferencia
-- deliberada: aquí NO se descuenta nada. Solo se deja la intención
-- registrada; el lote se mueve al aprobar.
CREATE OR REPLACE FUNCTION fn_donar_lote_pt(
  p_lote_id      UUID,
  p_cantidad     NUMERIC,
  p_destinatario TEXT,
  p_motivo       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol          user_role := fn_get_user_role();
  v_lote         producto_lotes%ROWTYPE;
  v_destinatario TEXT := NULLIF(btrim(COALESCE(p_destinatario, '')), '');
  v_motivo       TEXT := NULLIF(btrim(COALESCE(p_motivo, '')), '');
  v_donacion_id  UUID;
BEGIN
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede registrar donaciones';
  END IF;
  IF v_destinatario IS NULL THEN
    RAISE EXCEPTION 'El destinatario de la donación es requerido';
  END IF;
  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'El motivo de la donación es requerido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad a donar debe ser mayor a cero';
  END IF;

  SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;

  -- Validación temprana para no dejar pendiente algo imposible. Se repite al
  -- aprobar, porque el saldo puede moverse mientras espera.
  IF p_cantidad > v_lote.cantidad_disponible THEN
    RAISE EXCEPTION 'El lote solo tiene % disponible', v_lote.cantidad_disponible;
  END IF;

  INSERT INTO donaciones (
    origen, producto_lote_id, destinatario, motivo, cantidad, valor_comercial, created_by
  ) VALUES (
    'lote_pt'::origen_donacion, p_lote_id, v_destinatario, v_motivo, p_cantidad,
    ROUND(p_cantidad * COALESCE(v_lote.costo_unitario, 0)), auth.uid()
  )
  RETURNING id INTO v_donacion_id;

  INSERT INTO notificaciones (tipo, titulo, mensaje, entidad_tipo, entidad_id, destinatario_id)
  VALUES (
    'donacion_pendiente',
    'Donación pendiente de aprobación',
    'Lote ' || v_lote.codigo_lote || ' — ' || p_cantidad || ' unidades para ' || v_destinatario,
    'donacion', v_donacion_id, NULL
  );

  RETURN v_donacion_id;
END;
$$;

COMMENT ON FUNCTION fn_donar_lote_pt(UUID, NUMERIC, TEXT, TEXT) IS
  'Registra la intención de donar unidades de un lote de PT (ERP-DON-02). No descuenta stock: eso ocurre al aprobar (fn_aprobar_donacion).';

GRANT EXECUTE ON FUNCTION fn_donar_lote_pt(UUID, NUMERIC, TEXT, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- 4. Aprobación / rechazo (ERP-DON-03, espejo de fn_aprobar_conteo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aprobar_donacion(p_donacion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol      user_role := fn_get_user_role();
  v_don      donaciones%ROWTYPE;
  v_lote     producto_lotes%ROWTYPE;
  v_estado   estado_pedido;
BEGIN
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar donaciones';
  END IF;

  SELECT * INTO v_don FROM donaciones WHERE id = p_donacion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Donación no encontrada'; END IF;
  IF v_don.estado <> 'pendiente' THEN RAISE EXCEPTION 'La donación ya fue revisada'; END IF;

  IF v_don.origen = 'pedido'::origen_donacion THEN
    SELECT estado INTO v_estado FROM pedidos WHERE id = v_don.pedido_id FOR UPDATE;
    IF v_estado IS NULL THEN RAISE EXCEPTION 'Pedido de la donación no encontrado'; END IF;

    -- Solo avanza si sigue esperando; si alguien ya lo movió a mano, se
    -- respeta ese estado y la aprobación se limita a marcar la donación.
    IF v_estado = 'fecha_tentativa'::estado_pedido THEN
      PERFORM set_config('app.pedido_guard_bypass', 'on', true);
      UPDATE pedidos SET estado = 'confirmado'::estado_pedido WHERE id = v_don.pedido_id;
      PERFORM set_config('app.pedido_guard_bypass', 'off', true);
    END IF;
  ELSE
    -- Saldo recalculado en vivo: el lote pudo despacharse o ajustarse
    -- mientras la donación esperaba aprobación.
    SELECT * INTO v_lote FROM producto_lotes WHERE id = v_don.producto_lote_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lote de la donación no encontrado'; END IF;
    IF v_don.cantidad > v_lote.cantidad_disponible THEN
      RAISE EXCEPTION 'El lote ya solo tiene % disponible; no alcanza para donar %',
        v_lote.cantidad_disponible, v_don.cantidad;
    END IF;

    UPDATE producto_lotes
    SET cantidad_disponible = cantidad_disponible - v_don.cantidad
    WHERE id = v_lote.id;

    INSERT INTO movimientos_inventario (
      tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad,
      costo_unitario, referencia_tipo, referencia_id, usuario_id, notas
    ) VALUES (
      'donacion'::tipo_movimiento, v_lote.producto_id, v_lote.variante_id,
      'producto_lote', v_lote.id, -v_don.cantidad,
      COALESCE(v_lote.costo_unitario, 0), 'donacion', v_don.id, auth.uid(),
      'Donación a ' || v_don.destinatario || ' (lote ' || v_lote.codigo_lote || ')'
    );
  END IF;

  UPDATE donaciones
  SET estado = 'aprobada'::estado_donacion, revisado_por = auth.uid(), revisado_at = now()
  WHERE id = p_donacion_id;
END;
$$;

COMMENT ON FUNCTION fn_aprobar_donacion(UUID) IS
  'Admin-only. Único lugar donde una donación surte efecto: confirma el pedido, o descuenta el lote y lo asienta como movimiento ''donacion''.';

GRANT EXECUTE ON FUNCTION fn_aprobar_donacion(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION fn_rechazar_donacion(p_donacion_id UUID, p_motivo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol    user_role := fn_get_user_role();
  v_estado estado_donacion;
BEGIN
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede rechazar donaciones';
  END IF;
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de rechazo es requerido';
  END IF;

  SELECT estado INTO v_estado FROM donaciones WHERE id = p_donacion_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Donación no encontrada'; END IF;
  IF v_estado <> 'pendiente' THEN RAISE EXCEPTION 'La donación ya fue revisada'; END IF;

  UPDATE donaciones
  SET estado = 'rechazada'::estado_donacion, motivo_rechazo = btrim(p_motivo),
      revisado_por = auth.uid(), revisado_at = now()
  WHERE id = p_donacion_id;
END;
$$;

COMMENT ON FUNCTION fn_rechazar_donacion(UUID, TEXT) IS
  'Admin-only. Marca la donación como rechazada sin efectos: el pedido sigue en fecha_tentativa y el lote intacto. Requiere motivo.';

GRANT EXECUTE ON FUNCTION fn_rechazar_donacion(UUID, TEXT) TO authenticated;
