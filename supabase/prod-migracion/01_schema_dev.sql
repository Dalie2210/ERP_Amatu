--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Envuelto en una transaccion para que un fallo a mitad de camino
-- revierta todo en vez de dejar objetos huerfanos (evita el error
-- "type ... already exists" en un reintento).
BEGIN;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_seccion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_seccion AS ENUM (
    'ventas',
    'catalogo',
    'clientes',
    'comisiones',
    'aliados',
    'logistica_tablero',
    'logistica_rutas',
    'logistica_mensajeros',
    'logistica_liquidacion',
    'inventario_dashboard',
    'inventario_explosion',
    'inventario_ingresos',
    'inventario_insumos',
    'inventario_recetas',
    'inventario_produccion',
    'inventario_productos',
    'inventario_remisiones',
    'inventario_conteo',
    'admin',
    'inventario_desperdicio'
);


--
-- Name: categoria_conteo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.categoria_conteo AS ENUM (
    'materia_prima',
    'producto_seco',
    'aseo',
    'producto_terminado'
);


--
-- Name: estado_comision_aliado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_comision_aliado AS ENUM (
    'pendiente',
    'liquidada'
);


--
-- Name: estado_conteo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_conteo AS ENUM (
    'pendiente',
    'aplicado',
    'rechazado'
);


--
-- Name: estado_donacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_donacion AS ENUM (
    'pendiente',
    'aprobada',
    'rechazada'
);


--
-- Name: estado_liquidacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_liquidacion AS ENUM (
    'borrador',
    'cerrado',
    'pagado'
);


--
-- Name: estado_pago; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_pago AS ENUM (
    'pendiente',
    'confirmado'
);


--
-- Name: estado_pedido; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_pedido AS ENUM (
    'fecha_tentativa',
    'confirmado',
    'en_preparacion',
    'espera_produccion',
    'listo_despacho',
    'despachado',
    'devolucion',
    'parcial',
    'cambio'
);


--
-- Name: estado_produccion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_produccion AS ENUM (
    'planificada',
    'en_proceso',
    'completada',
    'cancelada',
    'parcial'
);


--
-- Name: estado_pt; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_pt AS ENUM (
    'producido',
    'empacado',
    'despachado'
);


--
-- Name: estado_ruta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_ruta AS ENUM (
    'en_preparacion',
    'despachada'
);


--
-- Name: franja_horaria; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.franja_horaria AS ENUM (
    'AM',
    'PM',
    'intermedia',
    'sin_franja'
);


--
-- Name: fuente_cliente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fuente_cliente AS ENUM (
    'meta_ads',
    'referido_cliente',
    'referido_veterinario',
    'referido_entrenador',
    'distribuidor',
    'otro'
);


--
-- Name: metodo_pago; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.metodo_pago AS ENUM (
    'nequi',
    'daviplata',
    'efectivo',
    'bancolombia',
    'pse_openpay',
    'bold',
    'contraentrega'
);


--
-- Name: motivo_desperdicio; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.motivo_desperdicio AS ENUM (
    'vencimiento',
    'quemado',
    'cambio_temperatura',
    'nevera_danada',
    'bolsa_rota',
    'contaminacion',
    'otro'
);


--
-- Name: origen_donacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.origen_donacion AS ENUM (
    'pedido',
    'lote_pt'
);


--
-- Name: tipo_aliado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_aliado AS ENUM (
    'veterinario',
    'entrenador_canino',
    'otro'
);


--
-- Name: tipo_cliente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_cliente AS ENUM (
    'publico',
    'distribuidor'
);


--
-- Name: tipo_comision_aliado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_comision_aliado AS ENUM (
    'primera_compra',
    'recompra'
);


--
-- Name: tipo_documento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_documento AS ENUM (
    'CC',
    'CE',
    'NIT',
    'Pasaporte'
);


--
-- Name: tipo_insumo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_insumo AS ENUM (
    'materia_prima',
    'producto_seco',
    'aseo',
    'empaque'
);


--
-- Name: tipo_movimiento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_movimiento AS ENUM (
    'ingreso_compra',
    'consumo_produccion',
    'entrada_produccion',
    'empaque',
    'salida_despacho',
    'ajuste_positivo',
    'ajuste_negativo',
    'merma',
    'devolucion',
    'donacion'
);


--
-- Name: tipo_notificacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_notificacion AS ENUM (
    'conteo_pendiente',
    'donacion_pendiente'
);


--
-- Name: tipo_precio; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_precio AS ENUM (
    'fijo',
    'por_variante',
    'por_gramo',
    'escala'
);


--
-- Name: tipo_promocion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_promocion AS ENUM (
    'paga_x_lleva_mas',
    'producto_gratis'
);


--
-- Name: unidad_medida; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unidad_medida AS ENUM (
    'g',
    'kg',
    'ml',
    'l',
    'unidad'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'vendedor',
    'logistica',
    'contable',
    'jefe_produccion',
    'personalizado'
);


--
-- Name: create_cliente_con_mascotas(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_cliente_con_mascotas(p_cliente jsonb, p_mascotas jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
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


--
-- Name: fn_activar_periodo_aliado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_activar_periodo_aliado() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: fn_agrupar_mezclas(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_agrupar_mezclas(p_orden_id uuid, p_grupos jsonb) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_orden   ordenes_produccion%ROWTYPE;
  v_grupo   JSONB;
  v_ids     UUID[];
  v_firmas  TEXT[];
  v_firma   TEXT;
  v_nuevo   UUID;
  v_n       INTEGER := 0;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se puede cambiar la agrupación de mezclas';
  END IF;

  -- Se reconstruye la agrupación completa desde cero: así el cliente manda un
  -- estado deseado y no una secuencia de operaciones que pueda desincronizarse.
  UPDATE orden_mezcla SET grupo_id = NULL, grupo_firma = NULL WHERE orden_id = p_orden_id;

  FOR v_grupo IN SELECT * FROM jsonb_array_elements(COALESCE(p_grupos, '[]'::JSONB))
  LOOP
    SELECT array_agg((value #>> '{}')::UUID)
    INTO v_ids
    FROM jsonb_array_elements(v_grupo->'producto_ids');

    IF v_ids IS NULL OR array_length(v_ids, 1) < 2 THEN
      CONTINUE; -- una dieta sola no es un grupo
    END IF;

    SELECT array_agg(DISTINCT r.firma)
    INTO v_firmas
    FROM unnest(v_ids) AS pid
    LEFT JOIN LATERAL (
      SELECT rr.firma FROM recetas rr
      WHERE rr.producto_id = pid AND rr.is_active AND rr.base_modo = 'gramos'
      ORDER BY (rr.variante_id IS NULL) DESC, rr.created_at
      LIMIT 1
    ) r ON true;

    IF array_length(v_firmas, 1) IS DISTINCT FROM 1 OR v_firmas[1] IS NULL THEN
      RAISE EXCEPTION 'No se pueden combinar dietas con recetas distintas en una misma mezcla';
    END IF;

    v_firma := v_firmas[1];
    v_nuevo := gen_random_uuid();

    UPDATE orden_mezcla
    SET grupo_id = v_nuevo, grupo_firma = v_firma
    WHERE orden_id = p_orden_id AND producto_id = ANY(v_ids);

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;


--
-- Name: fn_ajuste_inventario(uuid, uuid, uuid, numeric, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ajuste_inventario(p_insumo_id uuid, p_producto_id uuid, p_variante_id uuid, p_cantidad numeric, p_motivo text, p_es_merma boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_tipo        tipo_movimiento;
  v_cantidad    NUMERIC;
  v_restante    NUMERIC;
  v_a_mover     NUMERIC;
  v_lote        RECORD;
  v_lote_id     UUID;
  v_costo       NUMERIC;
  v_total_disp  NUMERIC;
  v_total_valor NUMERIC;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo del ajuste es requerido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad = 0 THEN
    RAISE EXCEPTION 'La cantidad del ajuste debe ser distinta de cero';
  END IF;
  IF (p_insumo_id IS NULL) = (p_producto_id IS NULL) THEN
    RAISE EXCEPTION 'Debe indicar exactamente un insumo o un producto';
  END IF;
  IF p_producto_id IS NOT NULL AND p_variante_id IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la variante del producto';
  END IF;

  v_cantidad := CASE WHEN p_es_merma THEN -ABS(p_cantidad) ELSE p_cantidad END;
  v_tipo := CASE WHEN p_es_merma THEN 'merma'::tipo_movimiento
                 WHEN v_cantidad > 0 THEN 'ajuste_positivo'::tipo_movimiento
                 ELSE 'ajuste_negativo'::tipo_movimiento END;

  IF p_insumo_id IS NOT NULL THEN
    SELECT costo_promedio INTO v_costo FROM insumos WHERE id = p_insumo_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

    IF v_cantidad > 0 THEN
      INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, fecha_ingreso)
      VALUES (p_insumo_id, 'AJUSTE-' || to_char(now(), 'YYYYMMDDHH24MISS'), v_cantidad, v_cantidad, COALESCE(v_costo, 0), CURRENT_DATE)
      RETURNING id INTO v_lote_id;

      INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
      VALUES (v_tipo, p_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo);
    ELSE
      v_restante := ABS(v_cantidad);

      FOR v_lote IN
        SELECT id, cantidad_disponible, costo_unitario FROM insumo_lotes
        WHERE insumo_id = p_insumo_id AND cantidad_disponible > 0
        ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_mover := LEAST(v_restante, v_lote.cantidad_disponible);
        UPDATE insumo_lotes SET cantidad_disponible = cantidad_disponible - v_a_mover WHERE id = v_lote.id;

        INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_insumo_id, 'insumo_lote', v_lote.id, -v_a_mover, v_lote.costo_unitario, 'ajuste_manual', v_user_id, p_motivo);

        v_restante := v_restante - v_a_mover;
      END LOOP;

      IF v_restante > 0 THEN
        INSERT INTO movimientos_inventario (tipo, insumo_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_insumo_id, -v_restante, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo || ' (saldo negativo)');
      END IF;
    END IF;

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = p_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE costo_promedio END
      WHERE id = p_insumo_id;
  ELSE
    IF v_cantidad > 0 THEN
      SELECT costo_unitario INTO v_costo FROM producto_lotes
        WHERE producto_id = p_producto_id AND variante_id = p_variante_id
        ORDER BY created_at DESC LIMIT 1;

      INSERT INTO producto_lotes (producto_id, variante_id, codigo_lote, cantidad_inicial, cantidad_disponible, estado, costo_unitario, fecha_produccion)
      VALUES (p_producto_id, p_variante_id, 'AJUSTE-' || to_char(now(), 'YYYYMMDDHH24MISS'), v_cantidad, v_cantidad, 'producido', COALESCE(v_costo, 0), CURRENT_DATE)
      RETURNING id INTO v_lote_id;

      INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
      VALUES (v_tipo, p_producto_id, p_variante_id, 'producto_lote', v_lote_id, v_cantidad, COALESCE(v_costo, 0), 'ajuste_manual', v_user_id, p_motivo);
    ELSE
      v_restante := ABS(v_cantidad);

      FOR v_lote IN
        SELECT id, cantidad_disponible, costo_unitario FROM producto_lotes
        WHERE producto_id = p_producto_id AND variante_id = p_variante_id
          AND estado IN ('empacado', 'producido') AND cantidad_disponible > 0
        ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_mover := LEAST(v_restante, v_lote.cantidad_disponible);
        UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_a_mover WHERE id = v_lote.id;

        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_producto_id, p_variante_id, 'producto_lote', v_lote.id, -v_a_mover, v_lote.costo_unitario, 'ajuste_manual', v_user_id, p_motivo);

        v_restante := v_restante - v_a_mover;
      END LOOP;

      IF v_restante > 0 THEN
        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, cantidad, costo_unitario, referencia_tipo, usuario_id, notas)
        VALUES (v_tipo, p_producto_id, p_variante_id, -v_restante, 0, 'ajuste_manual', v_user_id, p_motivo || ' (saldo negativo)');
      END IF;
    END IF;
  END IF;
END;
$$;


--
-- Name: fn_anular_ingreso(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_anular_ingreso(p_ingreso_id uuid, p_motivo text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_anulado BOOLEAN;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de anulación es requerido';
  END IF;

  SELECT anulado INTO v_anulado FROM ingresos WHERE id = p_ingreso_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'El ingreso ya está anulado';
  END IF;

  PERFORM fn_reversar_ingreso_items(p_ingreso_id, 'ingreso_anulado', p_motivo);

  UPDATE ingresos
    SET anulado = true, anulado_motivo = p_motivo, anulado_at = now(), anulado_por = v_user_id
    WHERE id = p_ingreso_id;
END;
$$;


--
-- Name: fn_aplicar_saldos_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_aplicar_saldos_orden(p_orden_id uuid) RETURNS TABLE(insumo_id uuid, saldo_crudo numeric, a_cocinar_crudo numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_orden   ordenes_produccion%ROWTYPE;
  v_proc    RECORD;
  v_sob     RECORD;
  v_cocido_req  NUMERIC;
  v_factor      NUMERIC;
  v_restante    NUMERIC;
  v_toma        NUMERIC;
  v_saldo_crudo NUMERIC;
  v_crudo_toma  NUMERIC;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se pueden aplicar saldos';
  END IF;

  PERFORM fn_liberar_saldos_orden(p_orden_id);

  FOR v_proc IN
    SELECT p.id, p.insumo_id, p.cant_requerida_crudo, i.merma_pct, i.rendimiento_pct
    FROM orden_produccion_procesos p
    JOIN insumos i ON i.id = p.insumo_id
    WHERE p.orden_id = p_orden_id
    ORDER BY p.orden_index
  LOOP
    v_factor := fn_crudo_desde_cocido(1, v_proc.rendimiento_pct, v_proc.merma_pct);

    -- Cocido requerido = crudo requerido / factor. Se recalcula aquí para que
    -- el panel muestre siempre la conversión coherente con lo que se cocina.
    v_cocido_req := CASE
      WHEN v_factor IS NULL OR v_factor = 0 THEN NULL
      ELSE v_proc.cant_requerida_crudo / v_factor
    END;

    v_restante := COALESCE(v_cocido_req, 0);
    v_saldo_crudo := 0;

    IF v_restante > 0 THEN
      FOR v_sob IN
        SELECT s.id, s.cantidad_cocido, s.cocido_consumido,
               s.rendimiento_pct_snap, s.merma_pct_snap
        FROM insumo_sobrante s
        WHERE s.insumo_id = v_proc.insumo_id
          AND s.estado = 'disponible'
          AND s.cantidad_cocido - s.cocido_consumido > 0
        ORDER BY s.fecha, s.created_at
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_toma := LEAST(v_restante, v_sob.cantidad_cocido - v_sob.cocido_consumido);
        v_crudo_toma := fn_crudo_desde_cocido(v_toma, v_sob.rendimiento_pct_snap, v_sob.merma_pct_snap);

        INSERT INTO insumo_sobrante_aplicacion (sobrante_id, orden_destino_id, cantidad_cocido, cantidad_crudo)
        VALUES (v_sob.id, p_orden_id, v_toma, COALESCE(v_crudo_toma, 0));

        UPDATE insumo_sobrante
        SET cocido_consumido = cocido_consumido + v_toma,
            estado = CASE WHEN cocido_consumido + v_toma >= cantidad_cocido THEN 'consumido' ELSE 'disponible' END
        WHERE id = v_sob.id;

        v_saldo_crudo := v_saldo_crudo + COALESCE(v_crudo_toma, 0);
        v_restante := v_restante - v_toma;
      END LOOP;
    END IF;

    UPDATE orden_produccion_procesos
    SET cant_cocido_requerido = v_cocido_req,
        factor_conversion     = v_factor,
        cant_saldo_crudo      = v_saldo_crudo,
        cant_a_cocinar_crudo  = GREATEST(COALESCE(cant_requerida_crudo, 0) - v_saldo_crudo, 0)
    WHERE id = v_proc.id;

    insumo_id       := v_proc.insumo_id;
    saldo_crudo     := v_saldo_crudo;
    a_cocinar_crudo := GREATEST(COALESCE(v_proc.cant_requerida_crudo, 0) - v_saldo_crudo, 0);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


--
-- Name: fn_aprobar_conteo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_aprobar_conteo(p_conteo_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_aprobar_conteo(p_conteo_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_aprobar_conteo(p_conteo_id uuid) IS 'Admin-only. Recalcula las diferencias en vivo y aplica los ajustes de inventario vía fn_ajuste_inventario; marca el conteo como aplicado.';


--
-- Name: fn_aprobar_donacion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_aprobar_donacion(p_donacion_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_aprobar_donacion(p_donacion_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_aprobar_donacion(p_donacion_id uuid) IS 'Admin-only. Único lugar donde una donación surte efecto: confirma el pedido, o descuenta el lote y lo asienta como movimiento ''donacion''.';


--
-- Name: fn_calcular_firma_receta(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calcular_firma_receta(p_receta_id uuid) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT fn_firma_receta(r.base_modo, r.base_gramos, r.id)
  FROM recetas r WHERE r.id = p_receta_id;
$$;


--
-- Name: FUNCTION fn_calcular_firma_receta(p_receta_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_calcular_firma_receta(p_receta_id uuid) IS 'Firma canónica del contenido de una receta (md5 de insumos+cantidades ordenados y la base). Dos recetas con la misma firma son la misma fórmula.';


--
-- Name: fn_calcular_numero_venta_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calcular_numero_venta_cliente() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_calcular_numero_venta_cliente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_calcular_numero_venta_cliente() IS 'Numera las compras del cliente en todos los vendedores. Las donaciones quedan en 0 y no cuentan para las demás (ERP-DON-01).';


--
-- Name: fn_calcular_pct_cierre_meta(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calcular_pct_cierre_meta(p_vendedor_id uuid, p_periodo_mes text) RETURNS numeric
    LANGUAGE plpgsql
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


--
-- Name: fn_calcular_totales_pedido(numeric, numeric, numeric, numeric, boolean, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calcular_totales_pedido(p_subtotal_alimento numeric, p_subtotal_snacks numeric, p_subtotal_otros numeric, p_tarifa_envio_base numeric, p_es_distribuidor boolean DEFAULT false, p_pct_desc_distribuidor numeric DEFAULT 0, p_pct_desc_referido_vet numeric DEFAULT 0) RETURNS TABLE(o_pct_descuento_compra numeric, o_monto_descuento_compra numeric, o_monto_descuento_vet numeric, o_descuento_envio numeric, o_total_envio_cobrado numeric, o_total numeric)
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


--
-- Name: fn_cancelar_orden_produccion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cancelar_orden_produccion(p_orden_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_con_produccion INTEGER;
BEGIN
  SELECT count(*) INTO v_con_produccion
  FROM orden_produccion_items
  WHERE orden_id = p_orden_id AND estado NOT IN ('planificada', 'cancelada');

  IF v_con_produccion > 0 THEN
    RAISE EXCEPTION 'No se puede cancelar: la orden ya tiene productos con producción registrada';
  END IF;

  PERFORM fn_liberar_saldos_orden(p_orden_id);

  UPDATE orden_produccion_items SET estado = 'cancelada' WHERE orden_id = p_orden_id AND estado = 'planificada';
  UPDATE ordenes_produccion SET estado = 'cancelada' WHERE id = p_orden_id;
END;
$$;


--
-- Name: fn_comisiones_resumen(timestamp with time zone, timestamp with time zone, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_comisiones_resumen(p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone, p_solo_sin_liquidar boolean DEFAULT false, p_solo_aplica boolean DEFAULT false) RETURNS TABLE(monto_total numeric, comisiones_count bigint)
    LANGUAGE sql STABLE
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


--
-- Name: fn_completar_item_produccion(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_completar_item_produccion(p_item_id uuid, p_cantidad_producida numeric) RETURNS TABLE(producto_lote_id uuid, costo_total numeric, costo_unitario numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_item              orden_produccion_items%ROWTYPE;
  v_orden             ordenes_produccion%ROWTYPE;
  v_receta            recetas%ROWTYPE;
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
  v_pendientes        INTEGER;
BEGIN
  IF p_cantidad_producida IS NULL OR p_cantidad_producida <= 0 THEN
    RAISE EXCEPTION 'La cantidad producida debe ser mayor a cero';
  END IF;

  SELECT * INTO v_item FROM orden_produccion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ítem de producción no encontrado'; END IF;
  IF v_item.estado = 'completada' THEN RAISE EXCEPTION 'El ítem ya fue completado'; END IF;
  IF v_item.estado = 'cancelada' THEN RAISE EXCEPTION 'El ítem está cancelado'; END IF;
  IF v_item.receta_id IS NULL THEN RAISE EXCEPTION 'El ítem no tiene receta asociada'; END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = v_item.orden_id FOR UPDATE;

  SELECT * INTO v_receta FROM recetas WHERE id = v_item.receta_id;
  IF NOT FOUND OR NOT v_receta.is_active THEN RAISE EXCEPTION 'Receta no encontrada o inactiva'; END IF;
  IF v_receta.rendimiento <= 0 THEN RAISE EXCEPTION 'La receta tiene un rendimiento inválido'; END IF;

  -- Validación previa (todo o nada): stock crudo suficiente por insumo
  FOR v_ri IN
    SELECT ri.insumo_id, ri.cantidad, i.nombre AS insumo_nombre, i.merma_pct, i.rendimiento_pct
    FROM receta_items ri JOIN insumos i ON i.id = ri.insumo_id
    WHERE ri.receta_id = v_receta.id
  LOOP
    v_cocido_total := v_ri.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (v_ri.rendimiento_pct / 100.0) / (1 - (v_ri.merma_pct / 100.0));

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
    v_cocido_total := v_ri.cantidad * (p_cantidad_producida / v_receta.rendimiento);
    v_crudo_requerido := v_cocido_total / (v_ri.rendimiento_pct / 100.0) / (1 - (v_ri.merma_pct / 100.0));
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

  UPDATE orden_produccion_items
  SET cantidad_producida = p_cantidad_producida,
      estado = 'completada',
      costo_total = v_costo_total,
      producto_lote_id = v_lote_pt_id
  WHERE id = p_item_id;

  -- Recalcular estado del encabezado
  SELECT COUNT(*) INTO v_pendientes
  FROM orden_produccion_items
  WHERE orden_id = v_item.orden_id AND estado NOT IN ('completada', 'cancelada');

  UPDATE ordenes_produccion
  SET estado = CASE WHEN v_pendientes = 0 THEN 'completada'::estado_produccion ELSE 'en_proceso'::estado_produccion END
  WHERE id = v_item.orden_id;

  RETURN QUERY SELECT v_lote_pt_id, v_costo_total, v_costo_total / p_cantidad_producida;
END;
$$;


--
-- Name: fn_completar_item_produccion(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_completar_item_produccion(p_item_id uuid, p_cantidad_producida numeric, p_motivo text DEFAULT NULL::text) RETURNS TABLE(producto_lote_id uuid, costo_total numeric, costo_unitario numeric)
    LANGUAGE plpgsql
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


--
-- Name: fn_confirmar_pago_pedido(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_confirmar_pago_pedido(p_pedido_id uuid, p_metodo_pago text DEFAULT NULL::text) RETURNS void
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


--
-- Name: fn_confirmar_venta(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_confirmar_venta(p_pedido_id uuid, p_confirmar_pago boolean DEFAULT false) RETURNS TABLE(producto_id uuid, variante_id uuid, cantidad_comprometida numeric)
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


--
-- Name: fn_crear_comision_provisional(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_crear_comision_provisional() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_crear_comision_provisional(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_crear_comision_provisional() IS 'Crea la comisión provisional de un pedido nuevo. Las donaciones (ERP-DON-01) se omiten: no comisionan.';


--
-- Name: fn_crear_orden_produccion(date, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_crear_orden_produccion(p_fecha date, p_notas text, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_orden_id UUID;
  v_item     JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La orden debe tener al menos un producto';
  END IF;

  INSERT INTO ordenes_produccion (estado, fecha, notas, created_by)
  VALUES ('planificada', COALESCE(p_fecha, CURRENT_DATE), NULLIF(btrim(p_notas), ''), auth.uid())
  RETURNING id INTO v_orden_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'cantidad')::NUMERIC IS NULL OR (v_item->>'cantidad')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Cada ítem debe tener una cantidad mayor a cero';
    END IF;

    INSERT INTO orden_produccion_items (
      orden_id, producto_id, variante_id, receta_id, cantidad_planificada, estado
    ) VALUES (
      v_orden_id,
      (v_item->>'producto_id')::UUID,
      NULLIF(v_item->>'variante_id', '')::UUID,
      NULLIF(v_item->>'receta_id', '')::UUID,
      (v_item->>'cantidad')::NUMERIC,
      'planificada'
    );
  END LOOP;

  RETURN v_orden_id;
END;
$$;


--
-- Name: fn_crear_pedido(jsonb, jsonb, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_crear_pedido(p_cabecera jsonb, p_items jsonb, p_mascotas uuid[] DEFAULT '{}'::uuid[]) RETURNS jsonb
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


--
-- Name: fn_crudo_desde_cocido(numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_crudo_desde_cocido(p_cocido numeric, p_rendimiento_pct numeric, p_merma_pct numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN p_cocido IS NULL
      OR p_rendimiento_pct IS NULL
      OR p_merma_pct IS NULL
      OR p_rendimiento_pct <= 0
      OR p_merma_pct >= 100
    THEN NULL
    ELSE p_cocido / (p_rendimiento_pct / 100.0) / (1 - (p_merma_pct / 100.0))
  END;
$$;


--
-- Name: FUNCTION fn_crudo_desde_cocido(p_cocido numeric, p_rendimiento_pct numeric, p_merma_pct numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_crudo_desde_cocido(p_cocido numeric, p_rendimiento_pct numeric, p_merma_pct numeric) IS 'Fórmula unificada de conversión cocido→crudo del proyecto: crudo = cocido / (rendimiento_pct/100) / (1 - merma_pct/100). Devuelve NULL si rendimiento_pct <= 0 o merma_pct >= 100 (factores inválidos). Gemelo TS en src/lib/inventario/receta.ts::crudoDesdeCocido.';


--
-- Name: fn_despachar_remision(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_despachar_remision(p_pedido_id uuid, p_items jsonb) RETURNS TABLE(detalle_pedido_id uuid, producto_id uuid, variante_id uuid, producto_nombre text, cantidad_solicitada numeric, cantidad_entregada numeric, advertencia boolean, mensaje text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_remision_id       UUID;
  v_user_id           UUID := auth.uid();
  v_item              JSONB;
  v_detalle           detalle_pedido%ROWTYPE;
  v_cantidad_solic    NUMERIC;
  v_restante          NUMERIC;
  v_disponible_total  NUMERIC;
  v_lote              RECORD;
  v_a_consumir        NUMERIC;
  v_entregado_total   NUMERIC;
  v_last_lote_id      UUID;
  v_last_costo        NUMERIC;
  v_producto_nombre   TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un ítem a despachar';
  END IF;

  INSERT INTO remisiones (pedido_id, fecha, created_by)
  VALUES (p_pedido_id, CURRENT_DATE, v_user_id)
  RETURNING id INTO v_remision_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_detalle
      FROM detalle_pedido
      WHERE id = (v_item->>'detalle_id')::UUID AND pedido_id = p_pedido_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ítem de pedido % no encontrado', v_item->>'detalle_id';
    END IF;

    v_cantidad_solic := (v_item->>'cantidad')::NUMERIC;
    IF v_cantidad_solic IS NULL OR v_cantidad_solic <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para el ítem %', v_detalle.id;
    END IF;

    SELECT p.nombre INTO v_producto_nombre FROM productos p WHERE p.id = v_detalle.producto_id;

    v_entregado_total := 0;
    v_disponible_total := NULL;

    IF v_detalle.es_magistral OR v_detalle.variante_id IS NULL THEN
      -- Magistral / sin variante fija: entrega sin descuento FEFO
      INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
      VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_cantidad_solic, NULL);
      v_entregado_total := v_cantidad_solic;
    ELSE
      SELECT COALESCE(SUM(pl.cantidad_disponible), 0) INTO v_disponible_total
        FROM producto_lotes pl
        WHERE pl.producto_id = v_detalle.producto_id AND pl.variante_id = v_detalle.variante_id
          AND pl.estado IN ('empacado', 'producido') AND pl.cantidad_disponible > 0;

      v_restante := v_cantidad_solic;
      v_last_lote_id := NULL;
      v_last_costo := 0;

      FOR v_lote IN
        SELECT pl.id, pl.cantidad_disponible, pl.costo_unitario
        FROM producto_lotes pl
        WHERE pl.producto_id = v_detalle.producto_id AND pl.variante_id = v_detalle.variante_id
          AND pl.estado IN ('empacado', 'producido') AND pl.cantidad_disponible > 0
        ORDER BY pl.fecha_vencimiento ASC NULLS LAST, pl.created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_a_consumir := LEAST(v_restante, v_lote.cantidad_disponible);

        UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_a_consumir WHERE id = v_lote.id;

        INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
        VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_a_consumir, v_lote.id);

        INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
        VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, 'producto_lote', v_lote.id, -v_a_consumir, v_lote.costo_unitario, 'remision', v_remision_id, v_user_id);

        v_last_lote_id := v_lote.id;
        v_last_costo := v_lote.costo_unitario;
        v_entregado_total := v_entregado_total + v_a_consumir;
        v_restante := v_restante - v_a_consumir;
      END LOOP;

      IF v_restante > 0 THEN
        -- Stock insuficiente: se permite saldo negativo (alerta, no bloquea)
        IF v_last_lote_id IS NOT NULL THEN
          UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - v_restante WHERE id = v_last_lote_id;

          INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
          VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_restante, v_last_lote_id);

          INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
          VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, 'producto_lote', v_last_lote_id, -v_restante, v_last_costo, 'remision', v_remision_id, v_user_id, 'Stock insuficiente: saldo negativo');
        ELSE
          INSERT INTO remision_items (remision_id, detalle_pedido_id, producto_id, variante_id, cantidad_entregada, producto_lote_id)
          VALUES (v_remision_id, v_detalle.id, v_detalle.producto_id, v_detalle.variante_id, v_restante, NULL);

          INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
          VALUES ('salida_despacho', v_detalle.producto_id, v_detalle.variante_id, NULL, NULL, -v_restante, 0, 'remision', v_remision_id, v_user_id, 'Stock insuficiente: sin lotes disponibles');
        END IF;
        v_entregado_total := v_entregado_total + v_restante;
      END IF;
    END IF;

    UPDATE detalle_pedido SET cantidad_entregada = detalle_pedido.cantidad_entregada + v_entregado_total WHERE id = v_detalle.id;

    detalle_pedido_id := v_detalle.id;
    producto_id := v_detalle.producto_id;
    variante_id := v_detalle.variante_id;
    producto_nombre := v_producto_nombre;
    cantidad_solicitada := v_cantidad_solic;
    cantidad_entregada := v_entregado_total;
    advertencia := v_disponible_total IS NOT NULL AND v_disponible_total < v_cantidad_solic;
    mensaje := CASE WHEN advertencia THEN
      'Stock insuficiente: disponible ' || round(v_disponible_total, 2) || ', solicitado ' || round(v_cantidad_solic, 2)
      ELSE NULL END;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


--
-- Name: fn_despachar_ruta(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_despachar_ruta(p_ruta_id uuid) RETURNS TABLE(numero_pedido text, producto_nombre text, mensaje text, advertencia boolean)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: fn_donar_lote_pt(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_donar_lote_pt(p_lote_id uuid, p_cantidad numeric, p_destinatario text, p_motivo text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_donar_lote_pt(p_lote_id uuid, p_cantidad numeric, p_destinatario text, p_motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_donar_lote_pt(p_lote_id uuid, p_cantidad numeric, p_destinatario text, p_motivo text) IS 'Registra la intención de donar unidades de un lote de PT (ERP-DON-02). No descuenta stock: eso ocurre al aprobar (fn_aprobar_donacion).';


--
-- Name: fn_editar_ingreso(uuid, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_editar_ingreso(p_ingreso_id uuid, p_cabecera jsonb, p_items jsonb) RETURNS TABLE(ingreso_id uuid, numero text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_anulado         BOOLEAN;
  v_item            JSONB;
  v_item_id         UUID;
  v_insumo_id       UUID;
  v_cantidad        NUMERIC;
  v_precio_compra   NUMERIC;
  v_precio_unitario NUMERIC;
  v_codigo_lote     TEXT;
  v_fecha_venc      DATE;
  v_fecha_ingreso   DATE;
  v_lote_id         UUID;
  v_total_disp      NUMERIC;
  v_total_valor     NUMERIC;
  v_total_costo     NUMERIC := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos un ítem';
  END IF;

  SELECT anulado INTO v_anulado FROM ingresos WHERE id = p_ingreso_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'No se puede editar un ingreso anulado';
  END IF;

  PERFORM fn_reversar_ingreso_items(p_ingreso_id, 'ingreso_editado', 'Reversión por edición de ingreso');

  DELETE FROM ingreso_items WHERE ingreso_id = p_ingreso_id;

  v_fecha_ingreso := COALESCE((p_cabecera->>'fecha')::DATE, CURRENT_DATE);

  UPDATE ingresos
    SET tipo_ingreso        = (p_cabecera->>'tipo_ingreso')::tipo_insumo,
        proveedor           = NULLIF(p_cabecera->>'proveedor', ''),
        fecha               = v_fecha_ingreso,
        temperatura_llegada = NULLIF(p_cabecera->>'temperatura_llegada', '')::NUMERIC,
        placa_vehiculo      = NULLIF(p_cabecera->>'placa_vehiculo', ''),
        notas               = NULLIF(p_cabecera->>'notas', '')
    WHERE id = p_ingreso_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id     := (v_item->>'insumo_id')::UUID;
    v_cantidad      := (v_item->>'cantidad')::NUMERIC;
    v_precio_compra := (v_item->>'precio_compra')::NUMERIC;
    v_codigo_lote   := COALESCE(NULLIF(v_item->>'codigo_lote', ''), 'LOTE-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(v_insumo_id::TEXT, 1, 4));
    v_fecha_venc    := NULLIF(v_item->>'fecha_vencimiento', '')::DATE;

    IF v_insumo_id IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 OR v_precio_compra IS NULL OR v_precio_compra < 0 THEN
      RAISE EXCEPTION 'Ítem de ingreso inválido: insumo_id, cantidad (>0) y precio_compra (>=0) son requeridos';
    END IF;

    v_precio_unitario := v_precio_compra / v_cantidad;

    INSERT INTO ingreso_items (ingreso_id, insumo_id, cantidad, precio_compra, codigo_lote, fecha_vencimiento)
    VALUES (p_ingreso_id, v_insumo_id, v_cantidad, v_precio_compra, v_codigo_lote, v_fecha_venc)
    RETURNING id INTO v_item_id;

    INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento, ingreso_item_id)
    VALUES (v_insumo_id, v_codigo_lote, v_cantidad, v_cantidad, v_precio_unitario, NULLIF(p_cabecera->>'proveedor', ''), v_fecha_ingreso, v_fecha_venc, v_item_id)
    RETURNING id INTO v_lote_id;

    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES ('ingreso_compra', v_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, v_precio_unitario, 'ingreso_editado', p_ingreso_id, v_user_id, 'Corrección de ingreso');

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_insumo_id;

    v_total_costo := v_total_costo + v_precio_compra;
  END LOOP;

  UPDATE ingresos SET total_costo = v_total_costo WHERE id = p_ingreso_id;

  RETURN QUERY SELECT p_ingreso_id, i.numero FROM ingresos i WHERE i.id = p_ingreso_id;
END;
$$;


--
-- Name: fn_editar_lineas_pedido(uuid, jsonb, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_editar_lineas_pedido(p_pedido_id uuid, p_lineas jsonb, p_updated_at_esperado timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
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


--
-- Name: fn_empacar_lote(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_empacar_lote(p_lote_id uuid, p_cantidad numeric) RETURNS TABLE(nuevo_lote_id uuid)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lote     producto_lotes%ROWTYPE;
  v_nuevo_id UUID;
  v_user_id  UUID := auth.uid();
BEGIN
  SELECT * INTO v_lote FROM producto_lotes WHERE id = p_lote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF v_lote.estado <> 'producido' THEN
    RAISE EXCEPTION 'Solo se pueden empacar lotes en estado producido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > v_lote.cantidad_disponible THEN
    RAISE EXCEPTION 'Cantidad inválida: debe ser mayor a cero y no exceder el disponible (%)', v_lote.cantidad_disponible;
  END IF;

  UPDATE producto_lotes SET cantidad_disponible = cantidad_disponible - p_cantidad WHERE id = p_lote_id;

  INSERT INTO producto_lotes (
    producto_id, variante_id, codigo_lote, cantidad_inicial, cantidad_disponible,
    estado, costo_unitario, fecha_produccion, fecha_vencimiento, orden_produccion_id
  )
  VALUES (
    v_lote.producto_id, v_lote.variante_id, v_lote.codigo_lote, p_cantidad, p_cantidad,
    'empacado', v_lote.costo_unitario, v_lote.fecha_produccion, v_lote.fecha_vencimiento, v_lote.orden_produccion_id
  )
  RETURNING id INTO v_nuevo_id;

  INSERT INTO movimientos_inventario (tipo, producto_id, variante_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
  VALUES (
    'empaque', v_lote.producto_id, v_lote.variante_id, 'producto_lote', v_nuevo_id,
    p_cantidad, v_lote.costo_unitario, 'producto_lote', p_lote_id, v_user_id,
    'Empacado desde lote ' || v_lote.codigo_lote
  );

  RETURN QUERY SELECT v_nuevo_id;
END;
$$;


--
-- Name: fn_estimar_comisiones_periodo(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_estimar_comisiones_periodo(p_vendedor_id uuid, p_periodo_mes text) RETURNS TABLE(comision_id uuid, pedido_id uuid, numero_venta_cliente integer, base_calculo numeric, pct_comision numeric, monto_comision numeric, aplica_comision boolean, razon_no_comision text, estado_pago text, is_provisional boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cierre         RECORD;
  v_row            RECORD;
  v_venta_efectiva INTEGER;
  v_pct            NUMERIC;
  v_monto          NUMERIC;
  v_aplica         BOOLEAN;
  v_razon          TEXT;
BEGIN
  -- SECURITY DEFINER: un vendedor solo puede estimar sus propias comisiones.
  -- admin/contable pueden consultar cualquier vendedor.
  IF fn_get_user_role() = 'vendedor'::user_role AND p_vendedor_id <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado para consultar comisiones de otro vendedor';
  END IF;

  SELECT * INTO v_cierre FROM fn_get_cierre_meta_actual(p_vendedor_id, p_periodo_mes) LIMIT 1;

  FOR v_row IN
    SELECT cd.id AS comision_id, cd.pedido_id, cd.numero_venta_cliente, cd.base_calculo,
           cd.pct_comision AS stored_pct, cd.monto_comision AS stored_monto,
           cd.aplica_comision AS stored_aplica, cd.razon_no_comision AS stored_razon,
           cd.is_provisional,
           p.fuente, p.estado_pago::text AS estado_pago, c.tipo_cliente
    FROM comisiones_detalle cd
    JOIN pedidos p ON p.id = cd.pedido_id
    JOIN clientes c ON c.id = p.cliente_id
    WHERE cd.vendedor_id = p_vendedor_id AND cd.periodo_mes = p_periodo_mes
  LOOP
    IF NOT v_row.is_provisional THEN
      -- Fila definitiva: devolver lo almacenado.
      comision_id := v_row.comision_id; pedido_id := v_row.pedido_id;
      numero_venta_cliente := v_row.numero_venta_cliente; base_calculo := v_row.base_calculo;
      pct_comision := v_row.stored_pct; monto_comision := v_row.stored_monto;
      aplica_comision := v_row.stored_aplica; razon_no_comision := v_row.stored_razon;
      estado_pago := v_row.estado_pago; is_provisional := false;
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_aplica := false; v_razon := NULL; v_pct := 0; v_monto := 0;
    IF v_row.tipo_cliente = 'distribuidor' THEN
      v_razon := 'Cliente distribuidor';
    ELSIF v_row.numero_venta_cliente >= 7 THEN
      v_razon := 'Cliente fidelizado (venta #7+)';
    ELSIF v_row.numero_venta_cliente = 1
      AND v_row.fuente NOT IN ('referido_cliente', 'referido_veterinario', 'referido_entrenador')
    THEN
      v_razon := 'Primera venta del cliente';
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
        v_aplica := true; v_monto := ROUND(v_row.base_calculo * (v_pct / 100), 0);
      ELSE v_razon := 'Porcentaje 0% en rango de cierre actual'; END IF;
    END IF;

    comision_id := v_row.comision_id; pedido_id := v_row.pedido_id;
    numero_venta_cliente := v_row.numero_venta_cliente; base_calculo := v_row.base_calculo;
    pct_comision := v_pct; monto_comision := v_monto;
    aplica_comision := v_aplica; razon_no_comision := v_razon;
    estado_pago := v_row.estado_pago; is_provisional := true;
    RETURN NEXT;
  END LOOP;
END;
$$;


--
-- Name: fn_expirar_periodos_aliado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_expirar_periodos_aliado() RETURNS integer
    LANGUAGE plpgsql
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


--
-- Name: fn_explosion_materiales(uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_explosion_materiales(p_ordenes_ids uuid[] DEFAULT NULL::uuid[], p_pedidos_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(insumo_id uuid, insumo_codigo text, insumo_nombre text, unidad_medida public.unidad_medida, demanda_total numeric, stock_disponible numeric, faltante numeric, sugerido_comprar numeric)
    LANGUAGE plpgsql
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


--
-- Name: fn_firma_receta(text, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_firma_receta(p_base_modo text, p_base_gramos numeric, p_receta_id uuid) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT md5(
    COALESCE(p_base_modo, 'gramos')
    || '#' || COALESCE(ROUND(p_base_gramos)::TEXT, '0')
    || '|' || COALESCE((
      SELECT string_agg(
               ri.insumo_id::TEXT || ':' || to_char(ROUND(ri.cantidad, 1), 'FM999999990.0'),
               '|' ORDER BY ri.insumo_id
             )
      FROM receta_items ri
      WHERE ri.receta_id = p_receta_id
    ), '')
  );
$$;


--
-- Name: fn_generar_codigo_insumo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_codigo_insumo() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  IF NEW.codigo IS NOT NULL THEN RETURN NEW; END IF;

  v_prefix := CASE NEW.tipo
    WHEN 'materia_prima'  THEN 'MP'
    WHEN 'producto_seco'  THEN 'PS'
    WHEN 'aseo'           THEN 'AS'
    WHEN 'empaque'        THEN 'EMP'
  END;

  INSERT INTO insumo_codigo_seq (tipo, ultimo_numero) VALUES (NEW.tipo, 1)
    ON CONFLICT (tipo) DO UPDATE SET ultimo_numero = insumo_codigo_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;

  NEW.codigo := v_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END; $$;


--
-- Name: fn_generar_numero_ingreso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_ingreso() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO ingreso_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = ingreso_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'ING-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;


--
-- Name: fn_generar_numero_op(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_op() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO op_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = op_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'OP-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;


--
-- Name: fn_generar_numero_pedido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_pedido() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: fn_generar_numero_remision(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_numero_remision() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO remision_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = remision_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'REM-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;


--
-- Name: fn_generar_orden_faltante(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_generar_orden_faltante(p_orden_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_orden        ordenes_produccion%ROWTYPE;
  v_nueva_id     UUID;
  v_item         RECORD;
  v_creados      INTEGER := 0;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado <> 'parcial' THEN RAISE EXCEPTION 'Solo se puede generar reposición de una orden en estado parcial'; END IF;

  IF EXISTS (SELECT 1 FROM ordenes_produccion WHERE orden_origen_id = p_orden_id) THEN
    RAISE EXCEPTION 'Ya existe una orden de reposición generada para esta orden';
  END IF;

  INSERT INTO ordenes_produccion (estado, fecha, notas, created_by, orden_origen_id)
  VALUES ('planificada', CURRENT_DATE, 'Reposición de orden ' || COALESCE(v_orden.numero, p_orden_id::TEXT), auth.uid(), p_orden_id)
  RETURNING id INTO v_nueva_id;

  FOR v_item IN
    SELECT producto_id, variante_id, receta_id, (cantidad_planificada - COALESCE(cantidad_producida, 0)) AS faltante
    FROM orden_produccion_items
    WHERE orden_id = p_orden_id AND estado = 'parcial'
  LOOP
    IF v_item.faltante > 0 THEN
      INSERT INTO orden_produccion_items (orden_id, producto_id, variante_id, receta_id, cantidad_planificada, estado)
      VALUES (v_nueva_id, v_item.producto_id, v_item.variante_id, v_item.receta_id, v_item.faltante, 'planificada');
      v_creados := v_creados + 1;
    END IF;
  END LOOP;

  IF v_creados = 0 THEN
    RAISE EXCEPTION 'No hay faltante pendiente para generar una orden de reposición';
  END IF;

  RETURN v_nueva_id;
END;
$$;


--
-- Name: fn_get_cierre_meta_actual(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_cierre_meta_actual(p_vendedor_id uuid, p_periodo_mes text) RETURNS TABLE(total_leads integer, total_cierres integer, pct_cierre numeric, rango_label text, config_id uuid, venta_2_pct numeric, venta_3_pct numeric, venta_4_pct numeric, venta_5_pct numeric, venta_6_pct numeric)
    LANGUAGE plpgsql
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


--
-- Name: fn_get_or_create_mezclas_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_or_create_mezclas_orden(p_orden_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cfg    config_produccion%ROWTYPE;
  v_porcion NUMERIC;
BEGIN
  SELECT * INTO v_cfg FROM config_produccion WHERE is_default LIMIT 1;
  v_porcion := COALESCE(v_cfg.porcion_estandar_g, 1200);

  INSERT INTO orden_mezcla (
    orden_id, producto_id, total_gramos, num_mezclas_sugerido,
    porcion_estandar, config_produccion_id, orden_index
  )
  SELECT
    p_orden_id,
    d.producto_id,
    d.total_gramos,
    CASE WHEN d.total_gramos IS NULL THEN NULL ELSE d.total_gramos / v_porcion END,
    v_porcion,
    v_cfg.id,
    (ROW_NUMBER() OVER (ORDER BY d.producto_nombre) - 1)::INT AS orden_index
  FROM (
    SELECT
      opi.producto_id,
      p.nombre AS producto_nombre,
      SUM(
        opi.cantidad_planificada
        * COALESCE(
            pv.gramaje_g,
            NULLIF(regexp_replace(pv.presentacion, '[^0-9.]', '', 'g'), '')::NUMERIC,
            0
          )
      ) AS total_gramos
    FROM orden_produccion_items opi
    JOIN productos p                ON p.id = opi.producto_id
    LEFT JOIN producto_variantes pv ON pv.id = opi.variante_id
    WHERE opi.orden_id = p_orden_id
    GROUP BY opi.producto_id, p.nombre
  ) d
  ON CONFLICT (orden_id, producto_id)
  DO UPDATE SET
    total_gramos         = EXCLUDED.total_gramos,
    num_mezclas_sugerido = CASE
      WHEN EXCLUDED.total_gramos IS NULL THEN NULL
      ELSE EXCLUDED.total_gramos / NULLIF(orden_mezcla.porcion_estandar, 0)
    END;
END;
$$;


--
-- Name: fn_get_or_create_procesos_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_or_create_procesos_orden(p_orden_id uuid) RETURNS void
    LANGUAGE plpgsql
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


--
-- Name: fn_get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active = true;
$$;


--
-- Name: FUNCTION fn_get_user_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_get_user_role() IS 'Rol efectivo del usuario autenticado. Devuelve NULL si el usuario está inactivo (is_active = false), lo que deniega todas las políticas RLS basadas en rol.';


--
-- Name: fn_get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_user_role(user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role::text FROM public.users WHERE id = user_id AND is_active = true;
$$;


--
-- Name: fn_guard_pedido_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_guard_pedido_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role public.user_role := fn_get_user_role();
BEGIN
  -- Vía de confianza: la RPC que abrió la transacción ya autorizó el cambio.
  IF fn_pedido_guard_bypass() THEN
    RETURN NEW;
  END IF;

  -- El admin conserva la escotilla de emergencia (correcciones manuales).
  IF v_role = 'admin'::user_role THEN
    RETURN NEW;
  END IF;

  -- 1. Columnas financieras y de identidad: NADIE las toca por PostgREST.
  --    Los recálculos legítimos ocurren dentro de fn_crear_pedido /
  --    fn_editar_lineas_pedido, que sí llevan el bypass.
  IF NEW.total                  IS DISTINCT FROM OLD.total
     OR NEW.subtotal_alimento      IS DISTINCT FROM OLD.subtotal_alimento
     OR NEW.subtotal_snacks        IS DISTINCT FROM OLD.subtotal_snacks
     OR NEW.subtotal_otros         IS DISTINCT FROM OLD.subtotal_otros
     OR NEW.pct_descuento_compra   IS DISTINCT FROM OLD.pct_descuento_compra
     OR NEW.monto_descuento_compra IS DISTINCT FROM OLD.monto_descuento_compra
     OR NEW.tarifa_envio_cliente   IS DISTINCT FROM OLD.tarifa_envio_cliente
     OR NEW.descuento_envio        IS DISTINCT FROM OLD.descuento_envio
     OR NEW.total_envio_cobrado    IS DISTINCT FROM OLD.total_envio_cobrado
  THEN
    RAISE EXCEPTION
      'Los importes del pedido no se pueden modificar directamente; usa fn_editar_lineas_pedido'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.numero_pedido        IS DISTINCT FROM OLD.numero_pedido
     OR NEW.numero_venta_cliente IS DISTINCT FROM OLD.numero_venta_cliente
     OR NEW.vendedor_id          IS DISTINCT FROM OLD.vendedor_id
     OR NEW.cliente_id           IS DISTINCT FROM OLD.cliente_id
  THEN
    RAISE EXCEPTION
      'numero_pedido, numero_venta_cliente, vendedor_id y cliente_id son inmutables'
      USING ERRCODE = '42501';
  END IF;

  -- 2. estado_pago: mueve dinero (desbloquea comisión). Solo contable, y por la
  --    RPC fn_confirmar_pago_pedido para el resto de roles.
  IF NEW.estado_pago IS DISTINCT FROM OLD.estado_pago
     AND v_role IS DISTINCT FROM 'contable'::user_role
  THEN
    RAISE EXCEPTION
      'estado_pago solo se cambia vía fn_confirmar_pago_pedido'
      USING ERRCODE = '42501';
  END IF;

  -- 3. estado: la máquina de estados la valida fn_validar_transicion_pedido
  --    (fase 3). El vendedor no participa: sus transiciones pasan por RPC.
  IF NEW.estado IS DISTINCT FROM OLD.estado
     AND v_role IS DISTINCT FROM 'logistica'::user_role
  THEN
    RAISE EXCEPTION
      'El estado del pedido solo lo cambian logística/admin o una RPC de transición'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: fn_insumos_mezcla(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_insumos_mezcla(p_orden_mezcla_id uuid) RETURNS TABLE(insumo_id uuid, insumo_nombre text, unidad_medida public.unidad_medida, merma_pct numeric, rendimiento_pct numeric, factor_conversion numeric, cocido_requerido numeric, sobrante_actual numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_om orden_mezcla%ROWTYPE;
BEGIN
  SELECT * INTO v_om FROM orden_mezcla WHERE id = p_orden_mezcla_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hoja de mezcla no encontrada'; END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.nombre,
    i.unidad_medida,
    i.merma_pct,
    i.rendimiento_pct,
    fn_crudo_desde_cocido(1, i.rendimiento_pct, i.merma_pct),
    SUM(ri.cantidad * fn_porciones_base(r.id, opi.variante_id, opi.cantidad_planificada)),
    MAX(COALESCE(s.cantidad_cocido, 0))
  FROM orden_produccion_items opi
  JOIN recetas r       ON r.id = opi.receta_id
  JOIN receta_items ri ON ri.receta_id = r.id
  JOIN insumos i       ON i.id = ri.insumo_id
  LEFT JOIN insumo_sobrante s
    ON s.orden_mezcla_id = p_orden_mezcla_id AND s.insumo_id = i.id AND s.estado <> 'anulado'
  WHERE opi.orden_id = v_om.orden_id
    AND opi.producto_id = v_om.producto_id
    AND i.tipo = 'materia_prima'
  GROUP BY i.id, i.nombre, i.unidad_medida, i.merma_pct, i.rendimiento_pct
  ORDER BY i.nombre;
END;
$$;


--
-- Name: fn_inventario_resumen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_inventario_resumen() RETURNS TABLE(valor_total numeric, insumos_bajo_minimo bigint, lotes_por_vencer bigint, pt_producido numeric, pt_empacado numeric, pt_despachado numeric)
    LANGUAGE sql STABLE
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


--
-- Name: fn_liberar_saldos_orden(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_liberar_saldos_orden(p_orden_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ap RECORD;
BEGIN
  FOR v_ap IN
    SELECT a.id, a.sobrante_id, a.cantidad_cocido
    FROM insumo_sobrante_aplicacion a
    WHERE a.orden_destino_id = p_orden_id
    FOR UPDATE
  LOOP
    UPDATE insumo_sobrante
    SET cocido_consumido = GREATEST(cocido_consumido - v_ap.cantidad_cocido, 0),
        estado = 'disponible'
    WHERE id = v_ap.sobrante_id;

    DELETE FROM insumo_sobrante_aplicacion WHERE id = v_ap.id;
  END LOOP;

  UPDATE orden_produccion_procesos
  SET cant_saldo_crudo = 0,
      cant_a_cocinar_crudo = cant_requerida_crudo
  WHERE orden_id = p_orden_id;
END;
$$;


--
-- Name: fn_liquidar_periodo_mensual(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_liquidar_periodo_mensual(p_vendedor_id uuid, p_periodo_mes text) RETURNS TABLE(monto_confirmado numeric, comisiones_trasladadas integer, liquidacion_id uuid)
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


--
-- Name: fn_meta_ads_resumen(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_meta_ads_resumen(p_periodo_mes text) RETURNS TABLE(total_leads bigint, total_cierres bigint)
    LANGUAGE plpgsql STABLE
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


--
-- Name: fn_pedido_guard_bypass(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_pedido_guard_bypass() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(current_setting('app.pedido_guard_bypass', true), '') = 'on';
$$;


--
-- Name: FUNCTION fn_pedido_guard_bypass(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_pedido_guard_bypass() IS 'true cuando la transacción actual corre dentro de una RPC de confianza que ya validó la operación sobre pedidos. Se activa con set_config(''app.pedido_guard_bypass'', ''on'', true), no accesible desde PostgREST.';


--
-- Name: fn_pedidos_estado_counts(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_pedidos_estado_counts(p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(estado public.estado_pedido, total bigint)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT p.estado, COUNT(*)::bigint
  FROM pedidos p
  WHERE (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
  GROUP BY p.estado;
$$;


--
-- Name: fn_pedidos_fuente_counts(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_pedidos_fuente_counts(p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(fuente public.fuente_cliente, total bigint)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT p.fuente, COUNT(*)::bigint
  FROM pedidos p
  WHERE p.fuente IS NOT NULL
    AND (p_desde IS NULL OR p.created_at >= p_desde)
    AND (p_hasta IS NULL OR p.created_at <  p_hasta)
  GROUP BY p.fuente;
$$;


--
-- Name: fn_porciones_base(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_porciones_base(p_receta_id uuid, p_variante_id uuid, p_cantidad numeric) RETURNS numeric
    LANGUAGE plpgsql STABLE
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


--
-- Name: FUNCTION fn_porciones_base(p_receta_id uuid, p_variante_id uuid, p_cantidad numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_porciones_base(p_receta_id uuid, p_variante_id uuid, p_cantidad numeric) IS 'Multiplicador que escala receta_items.cantidad para una cantidad dada de una presentación. Con base_modo=''gramos'': cantidad × gramaje / base_gramos. Respaldo legado a cantidad / rendimiento si falta el gramaje.';


--
-- Name: fn_preview_consumo_item(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_preview_consumo_item(p_item_id uuid, p_cantidad_producida numeric) RETURNS TABLE(insumo_id uuid, insumo_nombre text, unidad_medida public.unidad_medida, cocido_requerido numeric, crudo_requerido numeric, insumo_lote_id uuid, codigo_lote text, fecha_vencimiento date, cantidad_a_consumir numeric, costo_unitario numeric, disponible_total numeric, suficiente boolean)
    LANGUAGE plpgsql
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


--
-- Name: fn_recalcular_comisiones_periodo(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_recalcular_comisiones_periodo(p_vendedor_id uuid, p_periodo_mes text) RETURNS TABLE(total_leads integer, total_cierres integer, pct_cierre numeric, rango_label text, monto_total numeric, monto_confirmado numeric, monto_bloqueado numeric, ordenes_count integer)
    LANGUAGE plpgsql
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


--
-- Name: fn_rechazar_conteo(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_rechazar_conteo(p_conteo_id uuid, p_motivo text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_rechazar_conteo(p_conteo_id uuid, p_motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_rechazar_conteo(p_conteo_id uuid, p_motivo text) IS 'Admin-only. Marca el conteo como rechazado sin tocar stock; requiere un motivo.';


--
-- Name: fn_rechazar_donacion(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_rechazar_donacion(p_donacion_id uuid, p_motivo text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_rechazar_donacion(p_donacion_id uuid, p_motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_rechazar_donacion(p_donacion_id uuid, p_motivo text) IS 'Admin-only. Marca la donación como rechazada sin efectos: el pedido sigue en fecha_tentativa y el lote intacto. Requiere motivo.';


--
-- Name: fn_registrar_conteo(public.categoria_conteo, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_conteo(p_categoria public.categoria_conteo, p_motivo text, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION fn_registrar_conteo(p_categoria public.categoria_conteo, p_motivo text, p_items jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_registrar_conteo(p_categoria public.categoria_conteo, p_motivo text, p_items jsonb) IS 'Registra una sesión de conteo físico. Si hay diferencias queda pendiente de aprobación (ver fn_aprobar_conteo); si no, se marca aplicada de inmediato sin tocar stock.';


--
-- Name: fn_registrar_desperdicio(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_desperdicio(p_items jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_rol         user_role := fn_get_user_role();
  v_item        JSONB;
  v_insumo_id   UUID;
  v_producto_id UUID;
  v_variante_id UUID;
  v_cantidad    NUMERIC;
  v_razon       TEXT;
  v_n           INTEGER := 0;
BEGIN
  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'logistica', 'jefe_produccion') THEN
    RAISE EXCEPTION 'No autorizado para registrar desperdicio';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No hay filas para registrar';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id   := NULLIF(v_item ->> 'insumo_id', '')::UUID;
    v_producto_id := NULLIF(v_item ->> 'producto_id', '')::UUID;
    v_variante_id := NULLIF(v_item ->> 'variante_id', '')::UUID;
    v_cantidad    := (v_item ->> 'cantidad_kg')::NUMERIC;
    v_razon       := NULLIF(btrim(COALESCE(v_item ->> 'razon_dano', '')), '');

    IF (v_insumo_id IS NULL) = (v_producto_id IS NULL) THEN
      RAISE EXCEPTION 'Cada fila debe referenciar exactamente un insumo o un producto';
    END IF;

    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'La cantidad en kilos debe ser mayor a cero';
    END IF;

    IF v_razon IS NULL THEN
      RAISE EXCEPTION 'La razón por la que se dañó es obligatoria';
    END IF;

    IF v_insumo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM insumos WHERE id = v_insumo_id) THEN
      RAISE EXCEPTION 'Insumo no encontrado';
    END IF;

    IF v_producto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM productos WHERE id = v_producto_id) THEN
      RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    INSERT INTO desperdicios (
      fecha, insumo_id, producto_id, variante_id, cantidad_kg, temperatura_c,
      proveedor, codigo_lote, insumo_lote_id, producto_lote_id,
      motivo, razon_dano, accion_correctiva, created_by
    ) VALUES (
      COALESCE(NULLIF(v_item ->> 'fecha', '')::DATE, CURRENT_DATE),
      v_insumo_id, v_producto_id, v_variante_id,
      v_cantidad,
      NULLIF(v_item ->> 'temperatura_c', '')::NUMERIC,
      NULLIF(btrim(COALESCE(v_item ->> 'proveedor', '')), ''),
      NULLIF(btrim(COALESCE(v_item ->> 'codigo_lote', '')), ''),
      NULLIF(v_item ->> 'insumo_lote_id', '')::UUID,
      NULLIF(v_item ->> 'producto_lote_id', '')::UUID,
      COALESCE(NULLIF(v_item ->> 'motivo', '')::motivo_desperdicio, 'otro'::motivo_desperdicio),
      v_razon,
      NULLIF(btrim(COALESCE(v_item ->> 'accion_correctiva', '')), ''),
      auth.uid()
    );

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;


--
-- Name: FUNCTION fn_registrar_desperdicio(p_items jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_registrar_desperdicio(p_items jsonb) IS 'Registra una o varias filas del reporte de desperdicio (ERP-DESP-01). NO mueve inventario a propósito: el stock lo corrige el conteo físico (ERP-DESP-02).';


--
-- Name: fn_registrar_ingreso(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_ingreso(p_cabecera jsonb, p_items jsonb) RETURNS TABLE(ingreso_id uuid, numero text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ingreso_id      UUID;
  v_user_id         UUID := auth.uid();
  v_item            JSONB;
  v_item_id         UUID;
  v_insumo_id       UUID;
  v_cantidad        NUMERIC;
  v_precio_compra   NUMERIC;
  v_precio_unitario NUMERIC;
  v_codigo_lote     TEXT;
  v_fecha_venc      DATE;
  v_fecha_ingreso   DATE;
  v_lote_id         UUID;
  v_total_disp      NUMERIC;
  v_total_valor     NUMERIC;
  v_total_costo     NUMERIC := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos un ítem';
  END IF;

  v_fecha_ingreso := COALESCE((p_cabecera->>'fecha')::DATE, CURRENT_DATE);

  INSERT INTO ingresos (tipo_ingreso, proveedor, fecha, temperatura_llegada, placa_vehiculo, notas, created_by)
  VALUES (
    (p_cabecera->>'tipo_ingreso')::tipo_insumo,
    NULLIF(p_cabecera->>'proveedor', ''),
    v_fecha_ingreso,
    NULLIF(p_cabecera->>'temperatura_llegada', '')::NUMERIC,
    NULLIF(p_cabecera->>'placa_vehiculo', ''),
    NULLIF(p_cabecera->>'notas', ''),
    v_user_id
  )
  RETURNING id INTO v_ingreso_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id     := (v_item->>'insumo_id')::UUID;
    v_cantidad      := (v_item->>'cantidad')::NUMERIC;
    v_precio_compra := (v_item->>'precio_compra')::NUMERIC;
    v_codigo_lote   := COALESCE(NULLIF(v_item->>'codigo_lote', ''), 'LOTE-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(v_insumo_id::TEXT, 1, 4));
    v_fecha_venc    := NULLIF(v_item->>'fecha_vencimiento', '')::DATE;

    IF v_insumo_id IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 OR v_precio_compra IS NULL OR v_precio_compra < 0 THEN
      RAISE EXCEPTION 'Ítem de ingreso inválido: insumo_id, cantidad (>0) y precio_compra (>=0) son requeridos';
    END IF;

    v_precio_unitario := v_precio_compra / v_cantidad;

    INSERT INTO ingreso_items (ingreso_id, insumo_id, cantidad, precio_compra, codigo_lote, fecha_vencimiento)
    VALUES (v_ingreso_id, v_insumo_id, v_cantidad, v_precio_compra, v_codigo_lote, v_fecha_venc)
    RETURNING id INTO v_item_id;

    INSERT INTO insumo_lotes (insumo_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento, ingreso_item_id)
    VALUES (v_insumo_id, v_codigo_lote, v_cantidad, v_cantidad, v_precio_unitario, NULLIF(p_cabecera->>'proveedor', ''), v_fecha_ingreso, v_fecha_venc, v_item_id)
    RETURNING id INTO v_lote_id;

    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id)
    VALUES ('ingreso_compra', v_insumo_id, 'insumo_lote', v_lote_id, v_cantidad, v_precio_unitario, 'ingreso', v_ingreso_id, v_user_id);

    -- Costo promedio ponderado sobre todos los lotes con saldo positivo del insumo
    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_insumo_id;

    v_total_costo := v_total_costo + v_precio_compra;
  END LOOP;

  UPDATE ingresos SET total_costo = v_total_costo WHERE id = v_ingreso_id;

  RETURN QUERY SELECT v_ingreso_id, i.numero FROM ingresos i WHERE i.id = v_ingreso_id;
END;
$$;


--
-- Name: fn_registrar_sobrante_mezcla(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_registrar_sobrante_mezcla(p_orden_mezcla_id uuid, p_items jsonb) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_om        orden_mezcla%ROWTYPE;
  v_orden     ordenes_produccion%ROWTYPE;
  v_it        JSONB;
  v_insumo    insumos%ROWTYPE;
  v_cantidad  NUMERIC;
  v_crudo     NUMERIC;
  v_existente insumo_sobrante%ROWTYPE;
  v_n         INTEGER := 0;
BEGIN
  SELECT * INTO v_om FROM orden_mezcla WHERE id = p_orden_mezcla_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hoja de mezcla no encontrada'; END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = v_om.orden_id FOR UPDATE;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se pueden registrar sobrantes';
  END IF;

  FOR v_it IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB))
  LOOP
    SELECT * INTO v_insumo FROM insumos WHERE id = (v_it->>'insumo_id')::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

    -- El insumo debe pertenecer a la receta de ESTA dieta: si no, el sobrante
    -- se estaría atribuyendo a una mezcla que nunca lo usó.
    IF NOT EXISTS (
      SELECT 1
      FROM orden_produccion_items opi
      JOIN receta_items ri ON ri.receta_id = opi.receta_id
      WHERE opi.orden_id = v_om.orden_id
        AND opi.producto_id = v_om.producto_id
        AND ri.insumo_id = v_insumo.id
    ) THEN
      RAISE EXCEPTION 'El insumo "%" no forma parte de la receta de esta dieta', v_insumo.nombre;
    END IF;

    v_cantidad := COALESCE((v_it->>'cantidad_cocido')::NUMERIC, 0);

    SELECT * INTO v_existente
    FROM insumo_sobrante
    WHERE orden_mezcla_id = p_orden_mezcla_id AND insumo_id = v_insumo.id
    FOR UPDATE;

    -- Un sobrante ya consumido por otra orden no se reescribe en silencio:
    -- cambiaría un saldo del que ya se tomaron decisiones de cocción.
    IF FOUND AND v_existente.cocido_consumido > 0 THEN
      RAISE EXCEPTION
        'El sobrante de "%" ya fue aplicado a otra orden (% consumido). Libera esa aplicación antes de modificarlo.',
        v_insumo.nombre, round(v_existente.cocido_consumido, 2);
    END IF;

    IF v_cantidad <= 0 THEN
      IF FOUND THEN
        DELETE FROM insumo_sobrante WHERE id = v_existente.id;
        v_n := v_n + 1;
      END IF;
      CONTINUE;
    END IF;

    v_crudo := fn_crudo_desde_cocido(v_cantidad, v_insumo.rendimiento_pct, v_insumo.merma_pct);
    IF v_crudo IS NULL THEN
      RAISE EXCEPTION 'El insumo "%" tiene factores inválidos: no se puede convertir el sobrante a crudo', v_insumo.nombre;
    END IF;

    INSERT INTO insumo_sobrante (
      insumo_id, orden_origen_id, orden_mezcla_id, cantidad_cocido, cantidad_crudo_equiv,
      merma_pct_snap, rendimiento_pct_snap, nota, created_by
    )
    VALUES (
      v_insumo.id, v_om.orden_id, p_orden_mezcla_id, v_cantidad, v_crudo,
      v_insumo.merma_pct, v_insumo.rendimiento_pct, NULLIF(btrim(COALESCE(v_it->>'nota','')), ''), auth.uid()
    )
    ON CONFLICT (orden_mezcla_id, insumo_id) DO UPDATE SET
      cantidad_cocido      = EXCLUDED.cantidad_cocido,
      cantidad_crudo_equiv = EXCLUDED.cantidad_crudo_equiv,
      merma_pct_snap       = EXCLUDED.merma_pct_snap,
      rendimiento_pct_snap = EXCLUDED.rendimiento_pct_snap,
      nota                 = EXCLUDED.nota,
      estado               = 'disponible';

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;


--
-- Name: fn_resumen_inventario(date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_resumen_inventario(p_desde date, p_hasta date, p_categoria text DEFAULT NULL::text) RETURNS TABLE(item_id uuid, tipo_item text, nombre text, presentacion text, inventario_inicial numeric, entradas numeric, salidas numeric, total_teorico numeric, ajustes numeric, num_ajustes integer)
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  WITH
  -- ----- INSUMOS -----
  insumo_base AS (
    SELECT i.id, i.nombre, i.unidad_medida::text AS presentacion
    FROM insumos i
    WHERE i.is_active = true
      AND (p_categoria IS NULL
           OR (p_categoria <> 'producto_terminado' AND i.tipo::text = p_categoria))
      AND p_categoria IS DISTINCT FROM 'producto_terminado'
  ),
  insumo_mov AS (
    SELECT m.insumo_id AS id,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at < p_desde), 0) AS inicial,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad > 0), 0) AS entradas,
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')), 0) AS ajustes,
      COUNT(*) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')) AS num_ajustes
    FROM movimientos_inventario m
    WHERE m.insumo_id IS NOT NULL
    GROUP BY m.insumo_id
  ),
  insumos_res AS (
    SELECT
      b.id AS item_id,
      'insumo'::text AS tipo_item,
      b.nombre,
      b.presentacion,
      COALESCE(mv.inicial, 0) AS inventario_inicial,
      COALESCE(mv.entradas, 0) AS entradas,
      COALESCE(mv.salidas, 0) AS salidas,
      COALESCE(mv.inicial, 0) + COALESCE(mv.entradas, 0) - COALESCE(mv.salidas, 0) AS total_teorico,
      COALESCE(mv.ajustes, 0) AS ajustes,
      COALESCE(mv.num_ajustes, 0)::integer AS num_ajustes
    FROM insumo_base b
    LEFT JOIN insumo_mov mv ON mv.id = b.id
  ),
  -- ----- PRODUCTO TERMINADO (variantes) -----
  variante_base AS (
    SELECT v.id, p.nombre, v.presentacion
    FROM producto_variantes v
    JOIN productos p ON p.id = v.producto_id
    WHERE v.is_active = true
      AND (p_categoria IS NULL OR p_categoria = 'producto_terminado')
  ),
  variante_mov AS (
    SELECT m.variante_id AS id,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at < p_desde), 0) AS inicial,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad > 0), 0) AS entradas,
      COALESCE(-SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.cantidad < 0), 0) AS salidas,
      COALESCE(SUM(m.cantidad) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')), 0) AS ajustes,
      COUNT(*) FILTER (WHERE m.created_at::date >= p_desde AND m.created_at::date <= p_hasta AND m.tipo IN ('ajuste_positivo', 'ajuste_negativo', 'merma')) AS num_ajustes
    FROM movimientos_inventario m
    WHERE m.variante_id IS NOT NULL
    GROUP BY m.variante_id
  ),
  variantes_res AS (
    SELECT
      b.id AS item_id,
      'producto'::text AS tipo_item,
      b.nombre,
      b.presentacion,
      COALESCE(mv.inicial, 0) AS inventario_inicial,
      COALESCE(mv.entradas, 0) AS entradas,
      COALESCE(mv.salidas, 0) AS salidas,
      COALESCE(mv.inicial, 0) + COALESCE(mv.entradas, 0) - COALESCE(mv.salidas, 0) AS total_teorico,
      COALESCE(mv.ajustes, 0) AS ajustes,
      COALESCE(mv.num_ajustes, 0)::integer AS num_ajustes
    FROM variante_base b
    LEFT JOIN variante_mov mv ON mv.id = b.id
  )
  SELECT * FROM insumos_res
  UNION ALL
  SELECT * FROM variantes_res
  ORDER BY tipo_item, nombre, presentacion;
$$;


--
-- Name: fn_resumen_receta(uuid, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_resumen_receta(p_producto_id uuid, p_cantidad numeric, p_variante_id uuid DEFAULT NULL::uuid) RETURNS TABLE(insumo_id uuid, insumo_codigo text, insumo_nombre text, unidad_medida public.unidad_medida, cocido_por_porcion numeric, merma_pct numeric, rendimiento_pct numeric, factor_conversion numeric, cocido_total numeric, crudo_total numeric, stock_disponible numeric, faltante numeric)
    LANGUAGE plpgsql
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


--
-- Name: FUNCTION fn_resumen_receta(p_producto_id uuid, p_cantidad numeric, p_variante_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_resumen_receta(p_producto_id uuid, p_cantidad numeric, p_variante_id uuid) IS 'Desglose de insumos de una dieta para una cantidad dada (ERP-PROD-08). Reemplaza el Excel "resumen recetas"/"amarre de cocción". Usa los mismos helpers que el resto de producción, así que no puede divergir de la receta cargada.';


--
-- Name: fn_reversar_ingreso_items(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reversar_ingreso_items(p_ingreso_id uuid, p_referencia_tipo text, p_notas text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_row         RECORD;
  v_total_disp  NUMERIC;
  v_total_valor NUMERIC;
BEGIN
  -- Guardia: todos los lotes de este ingreso deben seguir intactos
  FOR v_row IN
    SELECT ii.id AS item_id, i.nombre AS insumo_nombre, il.id AS lote_id,
           il.cantidad_inicial, il.cantidad_disponible
    FROM ingreso_items ii
    JOIN insumos i ON i.id = ii.insumo_id
    LEFT JOIN insumo_lotes il ON il.ingreso_item_id = ii.id
    WHERE ii.ingreso_id = p_ingreso_id
  LOOP
    IF v_row.lote_id IS NULL THEN
      RAISE EXCEPTION 'No se puede modificar el ingreso: el ítem de "%" no tiene un lote vinculado (registro anterior a esta funcionalidad). Usa un Ajuste de Inventario para corregirlo.', v_row.insumo_nombre;
    END IF;
    IF v_row.cantidad_disponible <> v_row.cantidad_inicial THEN
      RAISE EXCEPTION 'No se puede modificar el ingreso: el lote de "%" ya fue consumido o ajustado parcialmente. Usa un Ajuste de Inventario para corregir el saldo.', v_row.insumo_nombre;
    END IF;
  END LOOP;

  -- Reversión: pone cada lote en 0 y registra el movimiento de reversión
  FOR v_row IN
    SELECT ii.insumo_id, il.id AS lote_id, il.cantidad_inicial, il.costo_unitario
    FROM ingreso_items ii
    JOIN insumo_lotes il ON il.ingreso_item_id = ii.id
    WHERE ii.ingreso_id = p_ingreso_id
  LOOP
    INSERT INTO movimientos_inventario (tipo, insumo_id, lote_tipo, lote_id, cantidad, costo_unitario, referencia_tipo, referencia_id, usuario_id, notas)
    VALUES ('ajuste_negativo', v_row.insumo_id, 'insumo_lote', v_row.lote_id, -v_row.cantidad_inicial, v_row.costo_unitario, p_referencia_tipo, p_ingreso_id, v_user_id, p_notas);

    UPDATE insumo_lotes SET cantidad_disponible = 0 WHERE id = v_row.lote_id;

    SELECT COALESCE(SUM(cantidad_disponible), 0), COALESCE(SUM(cantidad_disponible * costo_unitario), 0)
      INTO v_total_disp, v_total_valor
      FROM insumo_lotes WHERE insumo_id = v_row.insumo_id AND cantidad_disponible > 0;

    UPDATE insumos
      SET costo_promedio = CASE WHEN v_total_disp > 0 THEN v_total_valor / v_total_disp ELSE 0 END
      WHERE id = v_row.insumo_id;
  END LOOP;
END;
$$;


--
-- Name: fn_revocar_sesiones_usuario(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_revocar_sesiones_usuario(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- IS DISTINCT FROM, no <>: fn_get_user_role() devuelve NULL para usuarios
  -- inactivos o inexistentes, y `NULL <> 'admin'` es NULL — no true.
  IF fn_get_user_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Solo un admin puede revocar sesiones' USING ERRCODE = '42501';
  END IF;

  BEGIN
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    RETURN true;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
    -- El owner de la función no tiene privilegios sobre el esquema auth en este
    -- proyecto: se informa al llamador en vez de romper la desactivación.
    RETURN false;
  END;
END;
$$;


--
-- Name: fn_set_comision_periodo_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_comision_periodo_on_insert() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: fn_set_firma_receta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_firma_receta() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.firma := fn_firma_receta(NEW.base_modo, NEW.base_gramos, NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: fn_sugerir_grupos_mezcla(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sugerir_grupos_mezcla(p_orden_id uuid) RETURNS TABLE(orden_mezcla_id uuid, producto_id uuid, producto_nombre text, firma text, total_gramos numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id,
    om.producto_id,
    p.nombre,
    r.firma,
    om.total_gramos
  FROM orden_mezcla om
  JOIN productos p ON p.id = om.producto_id
  LEFT JOIN LATERAL (
    SELECT rr.firma
    FROM recetas rr
    WHERE rr.producto_id = om.producto_id
      AND rr.is_active
      AND rr.base_modo = 'gramos'
    ORDER BY (rr.variante_id IS NULL) DESC, rr.created_at
    LIMIT 1
  ) r ON true
  WHERE om.orden_id = p_orden_id
  ORDER BY om.orden_index;
END;
$$;


--
-- Name: fn_top_productos_vendidos(integer, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_top_productos_vendidos(p_limit integer DEFAULT 5, p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(nombre text, unidades numeric, revenue numeric)
    LANGUAGE sql STABLE
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


--
-- Name: fn_top_selling_productos(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_top_selling_productos(p_limit integer DEFAULT 10) RETURNS TABLE(producto_id uuid, total_vendido bigint)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT dp.producto_id, SUM(dp.cantidad)::bigint AS total_vendido
  FROM detalle_pedido dp JOIN productos p ON p.id = dp.producto_id
  WHERE p.is_active = true
  GROUP BY dp.producto_id ORDER BY total_vendido DESC LIMIT p_limit;
$$;


--
-- Name: fn_touch_firma_receta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_touch_firma_receta() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ids UUID[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT receta_id) INTO v_ids FROM nuevas;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT receta_id) INTO v_ids FROM viejas;
  ELSE
    SELECT array_agg(DISTINCT receta_id) INTO v_ids
    FROM (SELECT receta_id FROM nuevas UNION SELECT receta_id FROM viejas) u;
  END IF;

  IF v_ids IS NOT NULL THEN
    UPDATE recetas r
    SET firma = fn_firma_receta(r.base_modo, r.base_gramos, r.id)
    WHERE r.id = ANY(v_ids);
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: fn_touch_orden_produccion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_touch_orden_produccion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_update_insumos_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_insumos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: fn_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: fn_validar_transicion_pedido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_validar_transicion_pedido() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: fn_ventas_aliado_breakdown(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ventas_aliado_breakdown(p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(fuente public.fuente_cliente, aliado_id uuid, aliado_nombre text, pedidos_count bigint, total numeric)
    LANGUAGE sql STABLE
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


--
-- Name: fn_ventas_resumen_periodo(timestamp with time zone, timestamp with time zone, text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ventas_resumen_periodo(p_desde timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hasta timestamp with time zone DEFAULT NULL::timestamp with time zone, p_estados text[] DEFAULT NULL::text[], p_excluir_estados text[] DEFAULT NULL::text[]) RETURNS TABLE(revenue numeric, pedidos_count bigint)
    LANGUAGE sql STABLE
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


--
-- Name: match_documents(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
BEGIN
  RETURN query
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_documents(public.vector, double precision, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_threshold double precision, match_count integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  -- Aquí es donde ocurre la magia del filtro que te daba error:
  and documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: normalizar_texto(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalizar_texto(txt text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT trim(regexp_replace(lower(public.unaccent(txt)), '[\s-]+', ' ', 'g'));
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_memory (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    message jsonb NOT NULL
);


--
-- Name: ai_memory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_memory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_memory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_memory_id_seq OWNED BY public.ai_memory.id;


--
-- Name: aliados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aliados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    tipo public.tipo_aliado NOT NULL,
    celular text,
    correo text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE aliados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aliados IS 'External partners (vets, trainers) who refer clients';


--
-- Name: aliados_referidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aliados_referidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aliado_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    fecha_inicio_comision date,
    fecha_fin_comision date,
    periodo_activo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pedido_primera_entrega_id uuid
);


--
-- Name: TABLE aliados_referidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aliados_referidos IS 'Tracks which partner referred which client and their 6-month commission window';


--
-- Name: categorias_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_producto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE categorias_producto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categorias_producto IS 'Product categories: dietas, kits, snacks, accesorios, magistral';


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    barrio text,
    notas_defecto text,
    creado_por uuid DEFAULT auth.uid()
);


--
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clientes IS 'Client master data with document, address, source, and Kommo integration';


--
-- Name: comisiones_aliado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comisiones_aliado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aliado_referido_id uuid NOT NULL,
    pedido_id uuid NOT NULL,
    tipo public.tipo_comision_aliado NOT NULL,
    base_calculo numeric(12,2) NOT NULL,
    porcentaje numeric(5,2) NOT NULL,
    monto numeric(12,2) NOT NULL,
    estado public.estado_comision_aliado DEFAULT 'pendiente'::public.estado_comision_aliado NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE comisiones_aliado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comisiones_aliado IS 'Partner/vet commissions per order with type (first purchase vs repeat)';


--
-- Name: comisiones_detalle; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    vendedor_id uuid,
    periodo_mes text,
    is_provisional boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE comisiones_detalle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comisiones_detalle IS 'Per-order commission breakdown within a monthly settlement';


--
-- Name: config_comisiones; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT config_comisiones_rango_check CHECK ((cierre_min < cierre_max))
);


--
-- Name: TABLE config_comisiones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.config_comisiones IS 'Commission % matrix by Meta Ads close rate range and sale number';


--
-- Name: config_produccion; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT config_produccion_check CHECK (((mezcla_min_g > (0)::numeric) AND (mezcla_max_g >= mezcla_min_g))),
    CONSTRAINT config_produccion_duracion_mezcla_min_check CHECK ((duracion_mezcla_min > 0)),
    CONSTRAINT config_produccion_porcion_estandar_g_check CHECK ((porcion_estandar_g > (0)::numeric)),
    CONSTRAINT config_produccion_tolerancia_ajuste_g_check CHECK ((tolerancia_ajuste_g >= (0)::numeric))
);


--
-- Name: TABLE config_produccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.config_produccion IS 'Capacidad de la mezcladora y porción estándar de producción. Los valores por defecto reflejan la mezcladora actual (7,2–58 kg, porción de 1.200 g, ~45 min por mezcla); se editan en Admin cuando cambia el equipo.';


--
-- Name: COLUMN config_produccion.duracion_mezcla_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config_produccion.duracion_mezcla_min IS 'Minutos operativos que cuesta una mezcla. Es lo que hace que "menos mezclas" sea un objetivo medible al planificar.';


--
-- Name: COLUMN config_produccion.tolerancia_ajuste_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config_produccion.tolerancia_ajuste_g IS 'Residuo en gramos que se acepta sin alertar cuando el total no es múltiplo exacto de la porción estándar (ERP-PROD-06).';


--
-- Name: conteo_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conteo_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conteo_id uuid NOT NULL,
    insumo_id uuid,
    producto_id uuid,
    variante_id uuid,
    cantidad_sistema numeric DEFAULT 0 NOT NULL,
    cantidad_contada numeric DEFAULT 0 NOT NULL,
    diferencia numeric GENERATED ALWAYS AS ((cantidad_contada - cantidad_sistema)) STORED
);


--
-- Name: conteos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conteos_inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    categoria public.categoria_conteo NOT NULL,
    notas text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    estado public.estado_conteo DEFAULT 'pendiente'::public.estado_conteo NOT NULL,
    motivo_rechazo text,
    revisado_por uuid,
    revisado_at timestamp with time zone
);


--
-- Name: desperdicios; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT desperdicios_cantidad_kg_check CHECK ((cantidad_kg > (0)::numeric)),
    CONSTRAINT desperdicios_item_chk CHECK (((insumo_id IS NULL) <> (producto_id IS NULL)))
);


--
-- Name: TABLE desperdicios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.desperdicios IS 'Reporte de alimento desechado (ERP-DESP-01). Informativo/trazable: NO descuenta stock — el descuento real lo hace el conteo físico (ERP-DESP-02).';


--
-- Name: COLUMN desperdicios.cantidad_kg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desperdicios.cantidad_kg IS 'Kilos desechados. La hoja original captura siempre en kilos, sin importar la unidad_medida del insumo.';


--
-- Name: COLUMN desperdicios.temperatura_c; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desperdicios.temperatura_c IS 'Temperatura en °C al detectar el daño; es el dato de trazabilidad de cadena de frío del lote.';


--
-- Name: COLUMN desperdicios.codigo_lote; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desperdicios.codigo_lote IS 'Lote tal cual lo escribe planta (a veces un código, a veces una fecha). insumo_lote_id/producto_lote_id solo se llenan si se eligió un lote existente del sistema.';


--
-- Name: COLUMN desperdicios.razon_dano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desperdicios.razon_dano IS 'Columna "RAZONES POR QUÉ SE DAÑÓ" de la hoja: texto libre, obligatorio. Es el dato que justifica el módulo.';


--
-- Name: COLUMN desperdicios.accion_correctiva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desperdicios.accion_correctiva IS 'Columna "ACCIÓN CORRECTIVA" de la hoja: qué se hizo para que no vuelva a pasar.';


--
-- Name: detalle_pedido; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    justificacion_precio text,
    es_promo boolean DEFAULT false NOT NULL,
    promo_id uuid,
    cantidad_entregada numeric DEFAULT 0
);


--
-- Name: TABLE detalle_pedido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.detalle_pedido IS 'Order line items with price snapshots for audit integrity';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536)
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: donaciones; Type: TABLE; Schema: public; Owner: -
--

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
    revisado_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT donaciones_cantidad_chk CHECK (((cantidad IS NULL) OR (cantidad > (0)::numeric))),
    CONSTRAINT donaciones_origen_chk CHECK ((((origen = 'pedido'::public.origen_donacion) AND (pedido_id IS NOT NULL) AND (producto_lote_id IS NULL)) OR ((origen = 'lote_pt'::public.origen_donacion) AND (producto_lote_id IS NOT NULL) AND (pedido_id IS NULL))))
);


--
-- Name: TABLE donaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.donaciones IS 'Producto entregado sin cobro (ERP-DON-01/02). Nace pendiente y solo surte efecto al aprobarla un admin (ERP-DON-03/ERP-ADM-03).';


--
-- Name: COLUMN donaciones.cantidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.donaciones.cantidad IS 'Unidades donadas. Solo aplica al origen lote_pt; en el origen pedido las cantidades viven en detalle_pedido.';


--
-- Name: COLUMN donaciones.valor_comercial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.donaciones.valor_comercial IS 'Lo que habría costado el producto donado. No se cobra: existe para poder auditar en $ cuánto se donó por período (ERP-DON-04).';


--
-- Name: ingreso_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingreso_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ingreso_id uuid NOT NULL,
    insumo_id uuid NOT NULL,
    cantidad numeric NOT NULL,
    precio_compra numeric NOT NULL,
    precio_unitario numeric GENERATED ALWAYS AS ((precio_compra / NULLIF(cantidad, (0)::numeric))) STORED,
    codigo_lote text NOT NULL,
    fecha_vencimiento date
);


--
-- Name: ingreso_numero_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingreso_numero_seq (
    year integer NOT NULL,
    ultimo_numero integer DEFAULT 0 NOT NULL
);


--
-- Name: ingresos; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    anulado boolean DEFAULT false NOT NULL,
    anulado_motivo text,
    anulado_at timestamp with time zone,
    anulado_por uuid
);


--
-- Name: insumo_codigo_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumo_codigo_seq (
    tipo public.tipo_insumo NOT NULL,
    ultimo_numero integer DEFAULT 0 NOT NULL
);


--
-- Name: insumo_lotes; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ingreso_item_id uuid
);


--
-- Name: insumo_sobrante; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT insumo_sobrante_cantidad_cocido_check CHECK ((cantidad_cocido > (0)::numeric)),
    CONSTRAINT insumo_sobrante_check CHECK ((cocido_consumido <= cantidad_cocido)),
    CONSTRAINT insumo_sobrante_cocido_consumido_check CHECK ((cocido_consumido >= (0)::numeric)),
    CONSTRAINT insumo_sobrante_estado_check CHECK ((estado = ANY (ARRAY['disponible'::text, 'consumido'::text, 'anulado'::text])))
);


--
-- Name: TABLE insumo_sobrante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.insumo_sobrante IS 'Producto cocido que sobró al armar las mezclas (ERP-PROD-01). Es un saldo OPERATIVO: reduce lo que hay que cocinar en la siguiente orden, pero no genera movimientos de inventario — el crudo ya se descontó al completar la orden que lo produjo.';


--
-- Name: COLUMN insumo_sobrante.cantidad_crudo_equiv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insumo_sobrante.cantidad_crudo_equiv IS 'Equivalente en crudo calculado con fn_crudo_desde_cocido y los factores vigentes al registrar (ver *_snap).';


--
-- Name: insumo_sobrante_aplicacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumo_sobrante_aplicacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sobrante_id uuid NOT NULL,
    orden_destino_id uuid NOT NULL,
    cantidad_cocido numeric NOT NULL,
    cantidad_crudo numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT insumo_sobrante_aplicacion_cantidad_cocido_check CHECK ((cantidad_cocido > (0)::numeric))
);


--
-- Name: TABLE insumo_sobrante_aplicacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.insumo_sobrante_aplicacion IS 'Qué parte de cada sobrante se aplicó a qué orden. Existe para poder revertir la aplicación de forma exacta e idempotente.';


--
-- Name: insumos; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rendimiento_pct numeric DEFAULT 100 NOT NULL,
    CONSTRAINT insumos_rendimiento_pct_check CHECK ((rendimiento_pct > (0)::numeric))
);


--
-- Name: COLUMN insumos.rendimiento_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.insumos.rendimiento_pct IS 'Factor de rendimiento al cocinar (100 = sin cambio de peso, 200 = el peso se duplica). Se combina con merma_pct en crudo_requerido = cocido / (rendimiento_pct/100) / (1 - merma_pct/100).';


--
-- Name: kit_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    variante_id uuid,
    cantidad integer DEFAULT 1 NOT NULL,
    CONSTRAINT kit_items_cantidad_check CHECK ((cantidad >= 1))
);


--
-- Name: kits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads_meta_ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads_meta_ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendedor_id uuid NOT NULL,
    fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
    periodo_mes text NOT NULL,
    cantidad_leads integer DEFAULT 0 NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE leads_meta_ads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.leads_meta_ads IS 'Manual daily entry of Meta Ads leads per salesperson for close rate calculation';


--
-- Name: liquidaciones_comision; Type: TABLE; Schema: public; Owner: -
--

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
    fecha_liquidacion timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE liquidaciones_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.liquidaciones_comision IS 'Monthly commission settlement per salesperson';


--
-- Name: mascotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mascotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    nombre text NOT NULL,
    raza text,
    peso_kg numeric(5,2),
    edad_meses integer,
    necesidad_dolor text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE mascotas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mascotas IS 'Client pets with health/nutrition needs';


--
-- Name: mensajeros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensajeros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    placa_vehiculo text,
    telefono text NOT NULL,
    zona_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notas_logistica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_logistica (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    texto text NOT NULL,
    creado_por uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completada boolean DEFAULT false NOT NULL,
    completada_por uuid,
    completada_en timestamp with time zone,
    CONSTRAINT notas_logistica_texto_check CHECK ((char_length(TRIM(BOTH FROM texto)) > 0))
);


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo public.tipo_notificacion NOT NULL,
    titulo text NOT NULL,
    mensaje text,
    entidad_tipo text,
    entidad_id uuid,
    destinatario_id uuid,
    leida_por uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: op_numero_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.op_numero_seq (
    year integer NOT NULL,
    ultimo_numero integer DEFAULT 0 NOT NULL
);


--
-- Name: orden_mezcla; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    desglose_presentaciones jsonb,
    config_produccion_id uuid,
    mezcla_min_g numeric,
    mezcla_max_g numeric,
    plan_mezclas jsonb,
    grupo_id uuid,
    grupo_firma text
);


--
-- Name: TABLE orden_mezcla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orden_mezcla IS 'Hoja de mezcla por dieta (una fila por producto por orden de producción). El ERP calcula el nº de mezclas sugerido (total gramos / 1200); el nº final y las firmas de trazabilidad los diligencia el equipo de producción.';


--
-- Name: COLUMN orden_mezcla.desglose_presentaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.desglose_presentaciones IS 'Snapshot editable de unidades por presentación para esta dieta: [{presentacion, gramaje, unidades_planificadas, unidades}]. Se re-sugiere (escalado proporcional) al cambiar num_mezclas; el equipo de producción puede ajustar unidades a mano.';


--
-- Name: COLUMN orden_mezcla.mezcla_min_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.mezcla_min_g IS 'Mínimo de mezcla para esta orden. NULL = usa config_produccion.mezcla_min_g.';


--
-- Name: COLUMN orden_mezcla.mezcla_max_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.mezcla_max_g IS 'Máximo de mezcla para esta orden. NULL = usa config_produccion.mezcla_max_g.';


--
-- Name: COLUMN orden_mezcla.plan_mezclas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.plan_mezclas IS 'Plan de división aplicado, congelado: {porciones_totales, num_mezclas, mezclas:[{porciones,gramos}], min_g, max_g, porcion_estandar_g, ajuste_g, generado_en}.';


--
-- Name: COLUMN orden_mezcla.grupo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.grupo_id IS 'Dietas con el mismo grupo_id se mezclan físicamente juntas (ERP-PROD-05). NULL = mezcla independiente.';


--
-- Name: COLUMN orden_mezcla.grupo_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_mezcla.grupo_firma IS 'Firma de receta compartida por el grupo, para poder auditar por qué se combinaron.';


--
-- Name: orden_produccion_actividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_produccion_actividad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orden_id uuid NOT NULL,
    tipo text NOT NULL,
    usuario_id uuid,
    usuario_nombre text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE orden_produccion_actividad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orden_produccion_actividad IS 'Bitácora de cambios de una orden de producción (guardado de proceso, completación de ítems, etc.).';


--
-- Name: orden_produccion_items; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    motivo_parcial text
);


--
-- Name: TABLE orden_produccion_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orden_produccion_items IS 'Ítems (productos terminados) de una orden de producción. Cada ítem se produce/completa por separado y genera su propio lote de PT.';


--
-- Name: COLUMN orden_produccion_items.motivo_parcial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_items.motivo_parcial IS 'Motivo obligatorio cuando el ítem queda en estado parcial (cantidad_producida < cantidad_planificada).';


--
-- Name: orden_produccion_procesos; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cant_cocido_requerido numeric,
    factor_conversion numeric,
    cant_saldo_crudo numeric DEFAULT 0 NOT NULL,
    cant_a_cocinar_crudo numeric,
    cant_obtenida_cocido numeric
);


--
-- Name: TABLE orden_produccion_procesos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orden_produccion_procesos IS 'Registro del proceso de producción por materia prima (una fila por insumo materia_prima por orden). Lo diligencia el jefe de producción.';


--
-- Name: COLUMN orden_produccion_procesos.cant_cocido_requerido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_procesos.cant_cocido_requerido IS 'Cocido requerido por la receta (referencia). Contra esto se compara lo realmente obtenido.';


--
-- Name: COLUMN orden_produccion_procesos.factor_conversion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_procesos.factor_conversion IS 'Crudo necesario por unidad de cocido, snapshot del momento del cálculo.';


--
-- Name: COLUMN orden_produccion_procesos.cant_saldo_crudo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_procesos.cant_saldo_crudo IS 'Saldo a favor (en crudo) aplicado desde sobrantes de días anteriores (ERP-PROD-02).';


--
-- Name: COLUMN orden_produccion_procesos.cant_a_cocinar_crudo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_procesos.cant_a_cocinar_crudo IS 'Lo que la planta debe cocinar hoy: requerido menos saldo a favor. Congelado al aplicar saldos.';


--
-- Name: COLUMN orden_produccion_procesos.cant_obtenida_cocido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orden_produccion_procesos.cant_obtenida_cocido IS 'Peso cocido realmente obtenido, que el jefe de planta ingresa al pesar (ERP-PROD-03).';


--
-- Name: ordenes_produccion; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    orden_origen_id uuid,
    updated_at timestamp with time zone,
    updated_by uuid
);


--
-- Name: COLUMN ordenes_produccion.orden_origen_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordenes_produccion.orden_origen_id IS 'Si esta orden fue generada como reposición del faltante de otra orden parcial, referencia a esa orden origen.';


--
-- Name: COLUMN ordenes_produccion.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordenes_produccion.updated_by IS 'Último usuario que modificó la orden (proceso o completación). Lo fija el trigger a partir de auth.uid().';


--
-- Name: pedido_actividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_actividad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    tipo text NOT NULL,
    usuario_id uuid,
    usuario_nombre text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb
);


--
-- Name: pedido_mascotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_mascotas (
    pedido_id uuid NOT NULL,
    mascota_id uuid NOT NULL
);


--
-- Name: pedido_numero_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_numero_seq (
    year integer NOT NULL,
    ultimo_numero integer DEFAULT 0 NOT NULL
);


--
-- Name: pedido_ruta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_ruta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ruta_id uuid NOT NULL,
    pedido_id uuid NOT NULL,
    numero_bolsas integer DEFAULT 0 NOT NULL,
    orden_entrega integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE pedido_ruta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pedido_ruta IS 'Junction table assigning orders to routes with bag count and delivery order';


--
-- Name: pedido_transiciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_transiciones (
    estado_origen public.estado_pedido NOT NULL,
    estado_destino public.estado_pedido NOT NULL,
    roles public.user_role[] NOT NULL,
    descripcion text
);


--
-- Name: TABLE pedido_transiciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pedido_transiciones IS 'Transiciones legales de pedidos.estado, espejo de STAGE_TRANSITIONS en src/lib/logistica/transitions.ts. La UI puede restringir más (getTransitions), nunca menos. listo_despacho → despachado NO está aquí: solo la produce fn_despachar_ruta.';


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

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
    fecha_confirmacion_pago timestamp with time zone,
    fecha_entrega_real timestamp with time zone,
    fue_editado boolean DEFAULT false NOT NULL,
    editado_por_id uuid,
    editado_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    direccion_entrega text,
    complemento_entrega text,
    barrio_entrega text,
    zona_entrega_id uuid,
    numero_bolsas integer DEFAULT 0 NOT NULL,
    es_donacion boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE pedidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pedidos IS 'Orders with full financial snapshot, state, and edit audit trail';


--
-- Name: COLUMN pedidos.es_donacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pedidos.es_donacion IS 'Pedido entregado como donación (ERP-DON-01): total 0, sin comisión y sin contar para el numero_venta_cliente del cliente.';


--
-- Name: pesos_magistrales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pesos_magistrales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    peso_g integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: precios_escala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precios_escala (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    cantidad_minima integer NOT NULL,
    precio_total numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE precios_escala; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.precios_escala IS 'Volume-based pricing (e.g. compostable bags: 3+ rolls = discount)';


--
-- Name: precios_productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precios_productos (
    id integer NOT NULL,
    nombre_producto text NOT NULL,
    presentacion text NOT NULL,
    precio numeric NOT NULL,
    vigente boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: precios_productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precios_productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: precios_productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precios_productos_id_seq OWNED BY public.precios_productos.id;


--
-- Name: produccion_consumo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produccion_consumo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orden_produccion_id uuid NOT NULL,
    insumo_lote_id uuid NOT NULL,
    cantidad_consumida numeric NOT NULL,
    costo numeric DEFAULT 0 NOT NULL
);


--
-- Name: producto_lotes; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: producto_variantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_variantes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    presentacion text NOT NULL,
    precio_publico numeric(10,2) NOT NULL,
    precio_por_gramo numeric(8,4),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sku text NOT NULL,
    stock_minimo numeric DEFAULT 0 NOT NULL,
    gramaje_g integer,
    CONSTRAINT producto_variantes_gramaje_positivo CHECK (((gramaje_g IS NULL) OR (gramaje_g > 0))),
    CONSTRAINT producto_variantes_stock_minimo_check CHECK ((stock_minimo >= (0)::numeric))
);


--
-- Name: TABLE producto_variantes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.producto_variantes IS 'Product size variants (300g, 500g, 1200g) with prices';


--
-- Name: COLUMN producto_variantes.stock_minimo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.producto_variantes.stock_minimo IS 'Mínimo de producto terminado que debería existir en stock para esta presentación. Se compara contra el PT en estado producido para calcular cuánto falta producir.';


--
-- Name: COLUMN producto_variantes.gramaje_g; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.producto_variantes.gramaje_g IS 'Peso de la presentación en gramos. Fuente de verdad para todo el cálculo de producción y mezclas; producto_variantes.presentacion queda como etiqueta legible. NULL = sin resolver (ver v_variantes_sin_gramaje).';


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE productos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.productos IS 'Product catalog: dietas, kits, snacks, accessories, magistral diets';


--
-- Name: promociones; Type: TABLE; Schema: public; Owner: -
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promociones_lleva_extra_check CHECK ((lleva_extra >= 1)),
    CONSTRAINT promociones_paga_x_check CHECK ((paga_x >= 1))
);


--
-- Name: prompt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt (
    id bigint NOT NULL,
    prompt text
);


--
-- Name: prompt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prompt ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prompt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: receta_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receta_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receta_id uuid NOT NULL,
    insumo_id uuid NOT NULL,
    cantidad numeric NOT NULL,
    unidad_medida public.unidad_medida NOT NULL
);


--
-- Name: recetas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recetas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    variante_id uuid,
    nombre text NOT NULL,
    rendimiento numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    base_gramos numeric,
    base_modo text DEFAULT 'gramos'::text NOT NULL,
    firma text,
    reemplazada_por uuid,
    CONSTRAINT recetas_base_gramos_positiva CHECK (((base_gramos IS NULL) OR (base_gramos > (0)::numeric))),
    CONSTRAINT recetas_base_modo_valido CHECK ((base_modo = ANY (ARRAY['gramos'::text, 'unidades'::text])))
);


--
-- Name: COLUMN recetas.base_gramos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recetas.base_gramos IS 'Base sobre la que están expresadas las cantidades de receta_items. Con base_modo=''gramos'' son gramos de masa (tras esta migración, 1200 = la porción estándar). Con base_modo=''unidades'' conserva la semántica legada de recetas.rendimiento.';


--
-- Name: COLUMN recetas.base_modo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recetas.base_modo IS '''gramos'' = receta por porción de masa (dietas, caso normal). ''unidades'' = receta por unidades de PT por corrida (legado, para productos sin gramaje resoluble).';


--
-- Name: COLUMN recetas.firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recetas.firma IS 'Hash canónico del contenido de la receta (insumos + cantidades normalizadas + base). Dos dietas con la misma firma comparten fórmula y pueden mezclarse juntas (ERP-PROD-05). La mantiene el trigger trg_recetas_firma.';


--
-- Name: COLUMN recetas.reemplazada_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recetas.reemplazada_por IS 'Si esta receta fue deduplicada, apunta a la receta canónica que la sustituye. Nunca se borran recetas: las órdenes históricas conservan su receta_id.';


--
-- Name: reglas_descuento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reglas_descuento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    monto_minimo numeric(12,2) NOT NULL,
    pct_descuento_compra numeric(5,2) DEFAULT 0 NOT NULL,
    descuento_envio_fijo numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE reglas_descuento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reglas_descuento IS 'Discount tiers by order subtotal (food only)';


--
-- Name: remision_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remision_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    remision_id uuid NOT NULL,
    detalle_pedido_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    variante_id uuid,
    cantidad_entregada numeric NOT NULL,
    producto_lote_id uuid
);


--
-- Name: remision_numero_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remision_numero_seq (
    year integer NOT NULL,
    ultimo_numero integer DEFAULT 0 NOT NULL
);


--
-- Name: remisiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.remisiones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    pedido_id uuid NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rutas; Type: TABLE; Schema: public; Owner: -
--

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
    despachada_en timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mensajero_id uuid
);


--
-- Name: TABLE rutas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rutas IS 'Delivery routes grouping orders by date, time slot, and courier';


--
-- Name: user_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permisos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    seccion public.app_seccion NOT NULL,
    puede_ver boolean DEFAULT false NOT NULL,
    puede_editar boolean DEFAULT false NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_permisos_check CHECK (((puede_editar = false) OR (puede_ver = true)))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'vendedor'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Application user profiles extending Supabase Auth';


--
-- Name: v_componentes_venta; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_componentes_venta WITH (security_invoker='on') AS
 SELECT id AS detalle_pedido_id,
    pedido_id,
    producto_id AS componente_producto_id,
    variante_id AS componente_variante_id,
    cantidad AS cantidad_componente,
        CASE
            WHEN es_promo THEN 'promo_regalo'::text
            ELSE 'producto'::text
        END AS tipo_componente
   FROM public.detalle_pedido dp;


--
-- Name: v_compras_anual_producto; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_compras_anual_producto WITH (security_invoker='on') AS
 SELECT ii.insumo_id,
    i.codigo AS insumo_codigo,
    i.nombre AS insumo_nombre,
    i.unidad_medida,
    (EXTRACT(year FROM ing.fecha))::integer AS anio,
    (EXTRACT(month FROM ing.fecha))::integer AS mes,
    sum(ii.cantidad) AS total_cantidad,
    sum(ii.precio_compra) AS total_valor,
    avg(ii.precio_unitario) AS precio_promedio,
    min(ii.precio_unitario) AS precio_minimo,
    max(ii.precio_unitario) AS precio_maximo
   FROM ((public.ingreso_items ii
     JOIN public.ingresos ing ON ((ing.id = ii.ingreso_id)))
     JOIN public.insumos i ON ((i.id = ii.insumo_id)))
  GROUP BY ii.insumo_id, i.codigo, i.nombre, i.unidad_medida, (EXTRACT(year FROM ing.fecha)), (EXTRACT(month FROM ing.fecha));


--
-- Name: v_compras_producto_periodo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_compras_producto_periodo WITH (security_invoker='on') AS
 SELECT ii.insumo_id,
    i.codigo AS insumo_codigo,
    i.nombre AS insumo_nombre,
    i.unidad_medida,
    ing.fecha,
    ing.proveedor,
    ii.cantidad,
    ii.precio_compra,
    ii.precio_unitario,
    ii.codigo_lote,
    ii.fecha_vencimiento
   FROM ((public.ingreso_items ii
     JOIN public.ingresos ing ON ((ing.id = ii.ingreso_id)))
     JOIN public.insumos i ON ((i.id = ii.insumo_id)));


--
-- Name: v_demanda_comprometida; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_demanda_comprometida WITH (security_invoker='on') AS
 SELECT dp.producto_id,
    dp.variante_id,
    sum(((dp.cantidad)::numeric - COALESCE(dp.cantidad_entregada, (0)::numeric))) AS cantidad_pendiente
   FROM (public.detalle_pedido dp
     JOIN public.pedidos p ON ((p.id = dp.pedido_id)))
  WHERE ((p.estado <> ALL (ARRAY['despachado'::public.estado_pedido, 'devolucion'::public.estado_pedido])) AND ((dp.cantidad)::numeric > COALESCE(dp.cantidad_entregada, (0)::numeric)))
  GROUP BY dp.producto_id, dp.variante_id;


--
-- Name: v_desperdicio_resumen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_desperdicio_resumen WITH (security_invoker='on') AS
 SELECT d.fecha,
    d.motivo,
    d.proveedor,
    COALESCE(i.nombre, p.nombre) AS item_nombre,
    d.insumo_id,
    d.producto_id,
    d.variante_id,
    sum(d.cantidad_kg) AS kg,
    count(*) AS eventos
   FROM ((public.desperdicios d
     LEFT JOIN public.insumos i ON ((i.id = d.insumo_id)))
     LEFT JOIN public.productos p ON ((p.id = d.producto_id)))
  GROUP BY d.fecha, d.motivo, d.proveedor, COALESCE(i.nombre, p.nombre), d.insumo_id, d.producto_id, d.variante_id;


--
-- Name: VIEW v_desperdicio_resumen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_desperdicio_resumen IS 'Kilos y eventos de desperdicio por fecha/ítem/motivo/proveedor, para el dashboard de pérdida por período (ERP-DESP-03).';


--
-- Name: v_recetas_multi_firma; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_recetas_multi_firma WITH (security_invoker='on') AS
 SELECT r.producto_id,
    p.nombre AS producto_nombre,
    count(DISTINCT r.firma) AS formulas_distintas,
    array_agg(DISTINCT COALESCE(pv.presentacion, 'todas'::text)) AS presentaciones
   FROM ((public.recetas r
     JOIN public.productos p ON ((p.id = r.producto_id)))
     LEFT JOIN public.producto_variantes pv ON ((pv.id = r.variante_id)))
  WHERE (r.is_active AND (r.base_modo = 'gramos'::text))
  GROUP BY r.producto_id, p.nombre
 HAVING (count(DISTINCT r.firma) > 1);


--
-- Name: VIEW v_recetas_multi_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_recetas_multi_firma IS 'Productos que conservan más de una fórmula activa tras la deduplicación de ERP-PROD-09. Requieren revisión manual: o son dietas legítimamente distintas por presentación, o son datos a unificar.';


--
-- Name: v_sobrante_insumo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sobrante_insumo WITH (security_invoker='on') AS
 SELECT insumo_id,
    sum((cantidad_cocido - cocido_consumido)) AS cocido_disponible,
    sum(public.fn_crudo_desde_cocido((cantidad_cocido - cocido_consumido), rendimiento_pct_snap, merma_pct_snap)) AS crudo_disponible,
    count(*) AS sobrantes_abiertos
   FROM public.insumo_sobrante s
  WHERE ((estado = 'disponible'::text) AND ((cantidad_cocido - cocido_consumido) > (0)::numeric))
  GROUP BY insumo_id;


--
-- Name: VIEW v_sobrante_insumo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sobrante_insumo IS 'Saldo a favor de producto cocido por insumo, con su equivalente en crudo (ERP-PROD-02).';


--
-- Name: v_stock_insumos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_insumos AS
SELECT
    NULL::uuid AS insumo_id,
    NULL::text AS codigo,
    NULL::text AS nombre,
    NULL::public.tipo_insumo AS tipo,
    NULL::public.unidad_medida AS unidad_medida,
    NULL::numeric AS stock_minimo,
    NULL::numeric AS merma_pct,
    NULL::numeric AS costo_promedio,
    NULL::numeric AS stock_disponible,
    NULL::bigint AS lotes_por_vencer,
    NULL::boolean AS bajo_minimo,
    NULL::numeric AS rendimiento_pct;


--
-- Name: v_stock_productos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_productos WITH (security_invoker='on') AS
 SELECT p.id AS producto_id,
    p.nombre AS producto_nombre,
    pv.id AS variante_id,
    pv.presentacion AS variante_presentacion,
    pl.estado,
    COALESCE(sum(pl.cantidad_disponible), (0)::numeric) AS stock_disponible,
    COALESCE((sum((pl.cantidad_disponible * pl.costo_unitario)) / NULLIF(sum(pl.cantidad_disponible), (0)::numeric)), (0)::numeric) AS costo_promedio_lote,
    pv.stock_minimo
   FROM ((public.productos p
     JOIN public.producto_variantes pv ON ((pv.producto_id = p.id)))
     LEFT JOIN public.producto_lotes pl ON (((pl.producto_id = p.id) AND (pl.variante_id = pv.id) AND (pl.cantidad_disponible > (0)::numeric))))
  GROUP BY p.id, p.nombre, pv.id, pv.presentacion, pl.estado, pv.stock_minimo;


--
-- Name: v_trazabilidad_lote; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_trazabilidad_lote WITH (security_invoker='on') AS
 SELECT il.id AS insumo_lote_id,
    il.codigo_lote AS codigo_lote_insumo,
    il.insumo_id,
    ins.nombre AS insumo_nombre,
    il.proveedor,
    il.fecha_ingreso,
    il.fecha_vencimiento AS insumo_fecha_vencimiento,
    il.cantidad_inicial AS insumo_cantidad_inicial,
    pc.cantidad_consumida,
    op.id AS orden_produccion_id,
    op.numero AS numero_op,
    op.fecha AS fecha_produccion,
    op.estado AS estado_op,
    pl.id AS producto_lote_id,
    pl.codigo_lote AS codigo_lote_pt,
    pl.producto_id,
    p.nombre AS producto_nombre,
    pl.variante_id,
    pv.presentacion AS variante_presentacion,
    pl.estado AS estado_pt,
    pl.cantidad_inicial AS pt_cantidad_inicial,
    pl.fecha_vencimiento AS pt_fecha_vencimiento,
    ri.id AS remision_item_id,
    ri.cantidad_entregada,
    rem.id AS remision_id,
    rem.numero AS numero_remision,
    rem.fecha AS fecha_remision,
    ped.id AS pedido_id,
    ped.numero_pedido,
    cli.nombre_completo AS cliente_nombre
   FROM ((((((((((public.insumo_lotes il
     JOIN public.insumos ins ON ((ins.id = il.insumo_id)))
     LEFT JOIN public.produccion_consumo pc ON ((pc.insumo_lote_id = il.id)))
     LEFT JOIN public.ordenes_produccion op ON ((op.id = pc.orden_produccion_id)))
     LEFT JOIN public.producto_lotes pl ON ((pl.orden_produccion_id = op.id)))
     LEFT JOIN public.productos p ON ((p.id = pl.producto_id)))
     LEFT JOIN public.producto_variantes pv ON ((pv.id = pl.variante_id)))
     LEFT JOIN public.remision_items ri ON ((ri.producto_lote_id = pl.id)))
     LEFT JOIN public.remisiones rem ON ((rem.id = ri.remision_id)))
     LEFT JOIN public.pedidos ped ON ((ped.id = rem.pedido_id)))
     LEFT JOIN public.clientes cli ON ((cli.id = ped.cliente_id)))
UNION ALL
 SELECT NULL::uuid AS insumo_lote_id,
    NULL::text AS codigo_lote_insumo,
    NULL::uuid AS insumo_id,
    NULL::text AS insumo_nombre,
    NULL::text AS proveedor,
    NULL::date AS fecha_ingreso,
    NULL::date AS insumo_fecha_vencimiento,
    NULL::numeric AS insumo_cantidad_inicial,
    NULL::numeric AS cantidad_consumida,
    NULL::uuid AS orden_produccion_id,
    NULL::text AS numero_op,
    NULL::date AS fecha_produccion,
    NULL::public.estado_produccion AS estado_op,
    pl.id AS producto_lote_id,
    pl.codigo_lote AS codigo_lote_pt,
    pl.producto_id,
    p.nombre AS producto_nombre,
    pl.variante_id,
    pv.presentacion AS variante_presentacion,
    pl.estado AS estado_pt,
    pl.cantidad_inicial AS pt_cantidad_inicial,
    pl.fecha_vencimiento AS pt_fecha_vencimiento,
    ri.id AS remision_item_id,
    ri.cantidad_entregada,
    rem.id AS remision_id,
    rem.numero AS numero_remision,
    rem.fecha AS fecha_remision,
    ped.id AS pedido_id,
    ped.numero_pedido,
    cli.nombre_completo AS cliente_nombre
   FROM ((((((public.producto_lotes pl
     JOIN public.productos p ON ((p.id = pl.producto_id)))
     LEFT JOIN public.producto_variantes pv ON ((pv.id = pl.variante_id)))
     LEFT JOIN public.remision_items ri ON ((ri.producto_lote_id = pl.id)))
     LEFT JOIN public.remisiones rem ON ((rem.id = ri.remision_id)))
     LEFT JOIN public.pedidos ped ON ((ped.id = rem.pedido_id)))
     LEFT JOIN public.clientes cli ON ((cli.id = ped.cliente_id)))
  WHERE (pl.orden_produccion_id IS NULL);


--
-- Name: v_valor_inventario; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_valor_inventario WITH (security_invoker='on') AS
 SELECT 'insumo'::text AS tipo,
    i.id AS item_id,
    i.nombre,
    i.codigo,
    COALESCE(sum(il.cantidad_disponible), (0)::numeric) AS stock_total,
    i.costo_promedio AS costo_unitario,
    (COALESCE(sum(il.cantidad_disponible), (0)::numeric) * i.costo_promedio) AS valor_total
   FROM (public.insumos i
     LEFT JOIN public.insumo_lotes il ON (((il.insumo_id = i.id) AND (il.cantidad_disponible > (0)::numeric))))
  WHERE (i.is_active = true)
  GROUP BY i.id, i.nombre, i.codigo, i.costo_promedio
UNION ALL
 SELECT 'producto_terminado'::text AS tipo,
    pv.id AS item_id,
    ((p.nombre || ' - '::text) || pv.presentacion) AS nombre,
    NULL::text AS codigo,
    COALESCE(sum(pl.cantidad_disponible), (0)::numeric) AS stock_total,
    COALESCE((sum((pl.cantidad_disponible * pl.costo_unitario)) / NULLIF(sum(pl.cantidad_disponible), (0)::numeric)), (0)::numeric) AS costo_unitario,
    COALESCE(sum((pl.cantidad_disponible * pl.costo_unitario)), (0)::numeric) AS valor_total
   FROM ((public.productos p
     JOIN public.producto_variantes pv ON ((pv.producto_id = p.id)))
     LEFT JOIN public.producto_lotes pl ON (((pl.producto_id = p.id) AND (pl.variante_id = pv.id) AND (pl.cantidad_disponible > (0)::numeric))))
  GROUP BY pv.id, p.nombre, pv.presentacion;


--
-- Name: v_variantes_sin_gramaje; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_variantes_sin_gramaje WITH (security_invoker='on') AS
 SELECT pv.id AS variante_id,
    pv.producto_id,
    p.nombre AS producto_nombre,
    pv.presentacion,
    pv.sku,
    pv.is_active
   FROM (public.producto_variantes pv
     JOIN public.productos p ON ((p.id = pv.producto_id)))
  WHERE (pv.gramaje_g IS NULL)
  ORDER BY pv.is_active DESC, p.nombre, pv.presentacion;


--
-- Name: VIEW v_variantes_sin_gramaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_variantes_sin_gramaje IS 'Presentaciones cuyo gramaje no pudo derivarse del texto. Deben resolverse a mano antes de migrar las recetas a base en gramos (ERP-PROD-09).';


--
-- Name: zonas_envio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zonas_envio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    localidades text NOT NULL,
    tarifa_cliente numeric(10,2) NOT NULL,
    tarifa_mensajero numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE zonas_envio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zonas_envio IS 'Shipping zones with rates for clients and couriers';


--
-- Name: ai_memory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_memory ALTER COLUMN id SET DEFAULT nextval('public.ai_memory_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: precios_productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_productos ALTER COLUMN id SET DEFAULT nextval('public.precios_productos_id_seq'::regclass);


--
-- Name: ai_memory ai_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_memory
    ADD CONSTRAINT ai_memory_pkey PRIMARY KEY (id);


--
-- Name: aliados aliados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados
    ADD CONSTRAINT aliados_pkey PRIMARY KEY (id);


--
-- Name: aliados_referidos aliados_referidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados_referidos
    ADD CONSTRAINT aliados_referidos_pkey PRIMARY KEY (id);


--
-- Name: aliados_referidos aliados_referidos_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados_referidos
    ADD CONSTRAINT aliados_referidos_unique UNIQUE (aliado_id, cliente_id);


--
-- Name: categorias_producto categorias_producto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto
    ADD CONSTRAINT categorias_producto_nombre_key UNIQUE (nombre);


--
-- Name: categorias_producto categorias_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto
    ADD CONSTRAINT categorias_producto_pkey PRIMARY KEY (id);


--
-- Name: categorias_producto categorias_producto_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_producto
    ADD CONSTRAINT categorias_producto_slug_key UNIQUE (slug);


--
-- Name: clientes clientes_codigo_cliente_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente);


--
-- Name: clientes clientes_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_numero_documento_key UNIQUE (numero_documento);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: comisiones_aliado comisiones_aliado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_aliado
    ADD CONSTRAINT comisiones_aliado_pkey PRIMARY KEY (id);


--
-- Name: comisiones_detalle comisiones_detalle_pedido_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_detalle
    ADD CONSTRAINT comisiones_detalle_pedido_unique UNIQUE (pedido_id);


--
-- Name: comisiones_detalle comisiones_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_detalle
    ADD CONSTRAINT comisiones_detalle_pkey PRIMARY KEY (id);


--
-- Name: config_comisiones config_comisiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_comisiones
    ADD CONSTRAINT config_comisiones_pkey PRIMARY KEY (id);


--
-- Name: config_produccion config_produccion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_produccion
    ADD CONSTRAINT config_produccion_pkey PRIMARY KEY (id);


--
-- Name: conteo_items conteo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_items
    ADD CONSTRAINT conteo_items_pkey PRIMARY KEY (id);


--
-- Name: conteos_inventario conteos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteos_inventario
    ADD CONSTRAINT conteos_inventario_pkey PRIMARY KEY (id);


--
-- Name: desperdicios desperdicios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_pkey PRIMARY KEY (id);


--
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: donaciones donaciones_pedido_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_pedido_id_key UNIQUE (pedido_id);


--
-- Name: donaciones donaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_pkey PRIMARY KEY (id);


--
-- Name: ingreso_items ingreso_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_items
    ADD CONSTRAINT ingreso_items_pkey PRIMARY KEY (id);


--
-- Name: ingreso_numero_seq ingreso_numero_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_numero_seq
    ADD CONSTRAINT ingreso_numero_seq_pkey PRIMARY KEY (year);


--
-- Name: ingresos ingresos_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingresos
    ADD CONSTRAINT ingresos_numero_key UNIQUE (numero);


--
-- Name: ingresos ingresos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingresos
    ADD CONSTRAINT ingresos_pkey PRIMARY KEY (id);


--
-- Name: insumo_codigo_seq insumo_codigo_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_codigo_seq
    ADD CONSTRAINT insumo_codigo_seq_pkey PRIMARY KEY (tipo);


--
-- Name: insumo_lotes insumo_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_lotes
    ADD CONSTRAINT insumo_lotes_pkey PRIMARY KEY (id);


--
-- Name: insumo_sobrante_aplicacion insumo_sobrante_aplicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante_aplicacion
    ADD CONSTRAINT insumo_sobrante_aplicacion_pkey PRIMARY KEY (id);


--
-- Name: insumo_sobrante_aplicacion insumo_sobrante_aplicacion_sobrante_id_orden_destino_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante_aplicacion
    ADD CONSTRAINT insumo_sobrante_aplicacion_sobrante_id_orden_destino_id_key UNIQUE (sobrante_id, orden_destino_id);


--
-- Name: insumo_sobrante insumo_sobrante_orden_mezcla_id_insumo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_orden_mezcla_id_insumo_id_key UNIQUE (orden_mezcla_id, insumo_id);


--
-- Name: insumo_sobrante insumo_sobrante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_pkey PRIMARY KEY (id);


--
-- Name: insumos insumos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_codigo_key UNIQUE (codigo);


--
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- Name: kit_items kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_items
    ADD CONSTRAINT kit_items_pkey PRIMARY KEY (id);


--
-- Name: kits kits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kits
    ADD CONSTRAINT kits_pkey PRIMARY KEY (id);


--
-- Name: leads_meta_ads leads_meta_ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_meta_ads
    ADD CONSTRAINT leads_meta_ads_pkey PRIMARY KEY (id);


--
-- Name: leads_meta_ads leads_meta_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_meta_ads
    ADD CONSTRAINT leads_meta_unique UNIQUE (vendedor_id, fecha_registro);


--
-- Name: liquidaciones_comision liquidaciones_comision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones_comision
    ADD CONSTRAINT liquidaciones_comision_pkey PRIMARY KEY (id);


--
-- Name: liquidaciones_comision liquidaciones_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones_comision
    ADD CONSTRAINT liquidaciones_unique UNIQUE (vendedor_id, periodo_mes);


--
-- Name: mascotas mascotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_pkey PRIMARY KEY (id);


--
-- Name: mensajeros mensajeros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajeros
    ADD CONSTRAINT mensajeros_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: notas_logistica notas_logistica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_logistica
    ADD CONSTRAINT notas_logistica_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: op_numero_seq op_numero_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.op_numero_seq
    ADD CONSTRAINT op_numero_seq_pkey PRIMARY KEY (year);


--
-- Name: orden_mezcla orden_mezcla_orden_id_producto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_mezcla
    ADD CONSTRAINT orden_mezcla_orden_id_producto_id_key UNIQUE (orden_id, producto_id);


--
-- Name: orden_mezcla orden_mezcla_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_mezcla
    ADD CONSTRAINT orden_mezcla_pkey PRIMARY KEY (id);


--
-- Name: orden_produccion_actividad orden_produccion_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_actividad
    ADD CONSTRAINT orden_produccion_actividad_pkey PRIMARY KEY (id);


--
-- Name: orden_produccion_items orden_produccion_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_pkey PRIMARY KEY (id);


--
-- Name: orden_produccion_procesos orden_produccion_procesos_orden_id_insumo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_procesos
    ADD CONSTRAINT orden_produccion_procesos_orden_id_insumo_id_key UNIQUE (orden_id, insumo_id);


--
-- Name: orden_produccion_procesos orden_produccion_procesos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_procesos
    ADD CONSTRAINT orden_produccion_procesos_pkey PRIMARY KEY (id);


--
-- Name: ordenes_produccion ordenes_produccion_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_numero_key UNIQUE (numero);


--
-- Name: ordenes_produccion ordenes_produccion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_pkey PRIMARY KEY (id);


--
-- Name: pedido_actividad pedido_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_actividad
    ADD CONSTRAINT pedido_actividad_pkey PRIMARY KEY (id);


--
-- Name: pedido_mascotas pedido_mascotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_mascotas
    ADD CONSTRAINT pedido_mascotas_pkey PRIMARY KEY (pedido_id, mascota_id);


--
-- Name: pedido_numero_seq pedido_numero_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_numero_seq
    ADD CONSTRAINT pedido_numero_seq_pkey PRIMARY KEY (year);


--
-- Name: pedido_ruta pedido_ruta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_ruta
    ADD CONSTRAINT pedido_ruta_pkey PRIMARY KEY (id);


--
-- Name: pedido_ruta pedido_ruta_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_ruta
    ADD CONSTRAINT pedido_ruta_unique UNIQUE (ruta_id, pedido_id);


--
-- Name: pedido_transiciones pedido_transiciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_transiciones
    ADD CONSTRAINT pedido_transiciones_pkey PRIMARY KEY (estado_origen, estado_destino);


--
-- Name: pedidos pedidos_numero_pedido_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_numero_pedido_key UNIQUE (numero_pedido);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: pesos_magistrales pesos_magistrales_peso_g_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesos_magistrales
    ADD CONSTRAINT pesos_magistrales_peso_g_key UNIQUE (peso_g);


--
-- Name: pesos_magistrales pesos_magistrales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesos_magistrales
    ADD CONSTRAINT pesos_magistrales_pkey PRIMARY KEY (id);


--
-- Name: precios_escala precios_escala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_escala
    ADD CONSTRAINT precios_escala_pkey PRIMARY KEY (id);


--
-- Name: precios_escala precios_escala_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_escala
    ADD CONSTRAINT precios_escala_unique UNIQUE (producto_id, cantidad_minima);


--
-- Name: precios_productos precios_productos_nombre_producto_presentacion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_productos
    ADD CONSTRAINT precios_productos_nombre_producto_presentacion_key UNIQUE (nombre_producto, presentacion);


--
-- Name: precios_productos precios_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_productos
    ADD CONSTRAINT precios_productos_pkey PRIMARY KEY (id);


--
-- Name: precios_productos precios_productos_producto_presentacion_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_productos
    ADD CONSTRAINT precios_productos_producto_presentacion_unique UNIQUE (nombre_producto, presentacion);


--
-- Name: produccion_consumo produccion_consumo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produccion_consumo
    ADD CONSTRAINT produccion_consumo_pkey PRIMARY KEY (id);


--
-- Name: producto_lotes producto_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_lotes
    ADD CONSTRAINT producto_lotes_pkey PRIMARY KEY (id);


--
-- Name: producto_variantes producto_variantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_pkey PRIMARY KEY (id);


--
-- Name: producto_variantes producto_variantes_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_sku_key UNIQUE (sku);


--
-- Name: producto_variantes producto_variantes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_unique UNIQUE (producto_id, presentacion);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_sku_key UNIQUE (sku);


--
-- Name: promociones promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_pkey PRIMARY KEY (id);


--
-- Name: prompt prompt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt
    ADD CONSTRAINT prompt_pkey PRIMARY KEY (id);


--
-- Name: receta_items receta_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receta_items
    ADD CONSTRAINT receta_items_pkey PRIMARY KEY (id);


--
-- Name: receta_items receta_items_receta_insumo_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receta_items
    ADD CONSTRAINT receta_items_receta_insumo_unq UNIQUE (receta_id, insumo_id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (id);


--
-- Name: reglas_descuento reglas_descuento_monto_minimo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_descuento
    ADD CONSTRAINT reglas_descuento_monto_minimo_unique UNIQUE (monto_minimo);


--
-- Name: reglas_descuento reglas_descuento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_descuento
    ADD CONSTRAINT reglas_descuento_pkey PRIMARY KEY (id);


--
-- Name: remision_items remision_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_pkey PRIMARY KEY (id);


--
-- Name: remision_numero_seq remision_numero_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_numero_seq
    ADD CONSTRAINT remision_numero_seq_pkey PRIMARY KEY (year);


--
-- Name: remisiones remisiones_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remisiones
    ADD CONSTRAINT remisiones_numero_key UNIQUE (numero);


--
-- Name: remisiones remisiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remisiones
    ADD CONSTRAINT remisiones_pkey PRIMARY KEY (id);


--
-- Name: rutas rutas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rutas
    ADD CONSTRAINT rutas_pkey PRIMARY KEY (id);


--
-- Name: user_permisos user_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permisos
    ADD CONSTRAINT user_permisos_pkey PRIMARY KEY (id);


--
-- Name: user_permisos user_permisos_user_id_seccion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permisos
    ADD CONSTRAINT user_permisos_user_id_seccion_key UNIQUE (user_id, seccion);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zonas_envio zonas_envio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_envio
    ADD CONSTRAINT zonas_envio_pkey PRIMARY KEY (id);


--
-- Name: config_produccion_default_unq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX config_produccion_default_unq ON public.config_produccion USING btree (is_default) WHERE is_default;


--
-- Name: idx_aliados_referidos_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_aliados_referidos_cliente_id ON public.aliados_referidos USING btree (cliente_id);


--
-- Name: idx_clientes_celular_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_celular_trgm ON public.clientes USING gin (celular extensions.gin_trgm_ops);


--
-- Name: idx_clientes_codigo_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_codigo_trgm ON public.clientes USING gin (codigo_cliente extensions.gin_trgm_ops);


--
-- Name: idx_clientes_creado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_creado_por ON public.clientes USING btree (creado_por);


--
-- Name: idx_clientes_documento_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_documento_trgm ON public.clientes USING gin (numero_documento extensions.gin_trgm_ops);


--
-- Name: idx_clientes_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_nombre_trgm ON public.clientes USING gin (nombre_completo extensions.gin_trgm_ops);


--
-- Name: idx_clientes_zona_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_zona_id ON public.clientes USING btree (zona_id) WHERE (zona_id IS NOT NULL);


--
-- Name: idx_comisiones_aliado_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_aliado_pedido_id ON public.comisiones_aliado USING btree (pedido_id);


--
-- Name: idx_comisiones_aliado_referido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_aliado_referido_id ON public.comisiones_aliado USING btree (aliado_referido_id);


--
-- Name: idx_comisiones_detalle_liquidacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_detalle_liquidacion_id ON public.comisiones_detalle USING btree (liquidacion_id) WHERE (liquidacion_id IS NOT NULL);


--
-- Name: idx_comisiones_detalle_vendedor_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_detalle_vendedor_periodo ON public.comisiones_detalle USING btree (vendedor_id, periodo_mes);


--
-- Name: idx_conteo_items_conteo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_items_conteo_id ON public.conteo_items USING btree (conteo_id);


--
-- Name: idx_conteo_items_insumo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_items_insumo_id ON public.conteo_items USING btree (insumo_id) WHERE (insumo_id IS NOT NULL);


--
-- Name: idx_conteo_items_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_items_producto_id ON public.conteo_items USING btree (producto_id) WHERE (producto_id IS NOT NULL);


--
-- Name: idx_conteo_items_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_items_variante_id ON public.conteo_items USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_conteos_inventario_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteos_inventario_categoria ON public.conteos_inventario USING btree (categoria);


--
-- Name: idx_conteos_inventario_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteos_inventario_created_at ON public.conteos_inventario USING btree (created_at DESC);


--
-- Name: idx_conteos_inventario_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteos_inventario_created_by ON public.conteos_inventario USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_conteos_inventario_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteos_inventario_estado ON public.conteos_inventario USING btree (estado);


--
-- Name: idx_conteos_inventario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteos_inventario_fecha ON public.conteos_inventario USING btree (fecha);


--
-- Name: idx_desperdicios_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_desperdicios_fecha ON public.desperdicios USING btree (fecha DESC);


--
-- Name: idx_desperdicios_insumo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_desperdicios_insumo ON public.desperdicios USING btree (insumo_id);


--
-- Name: idx_desperdicios_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_desperdicios_producto ON public.desperdicios USING btree (producto_id);


--
-- Name: idx_detalle_pedido_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_pedido_pedido_id ON public.detalle_pedido USING btree (pedido_id);


--
-- Name: idx_detalle_pedido_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_pedido_producto_id ON public.detalle_pedido USING btree (producto_id);


--
-- Name: idx_donaciones_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_donaciones_created_at ON public.donaciones USING btree (created_at DESC);


--
-- Name: idx_donaciones_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_donaciones_estado ON public.donaciones USING btree (estado);


--
-- Name: idx_ingreso_items_ingreso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingreso_items_ingreso_id ON public.ingreso_items USING btree (ingreso_id);


--
-- Name: idx_ingreso_items_insumo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingreso_items_insumo_id ON public.ingreso_items USING btree (insumo_id);


--
-- Name: idx_ingresos_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingresos_created_by ON public.ingresos USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_ingresos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingresos_fecha ON public.ingresos USING btree (fecha);


--
-- Name: idx_insumo_lotes_codigo_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insumo_lotes_codigo_trgm ON public.insumo_lotes USING gin (codigo_lote extensions.gin_trgm_ops);


--
-- Name: idx_insumo_lotes_insumo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insumo_lotes_insumo_id ON public.insumo_lotes USING btree (insumo_id);


--
-- Name: idx_insumo_lotes_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insumo_lotes_vencimiento ON public.insumo_lotes USING btree (fecha_vencimiento) WHERE (fecha_vencimiento IS NOT NULL);


--
-- Name: idx_insumos_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insumos_nombre_trgm ON public.insumos USING gin (nombre extensions.gin_trgm_ops);


--
-- Name: idx_isaplic_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isaplic_destino ON public.insumo_sobrante_aplicacion USING btree (orden_destino_id);


--
-- Name: idx_isobrante_insumo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isobrante_insumo ON public.insumo_sobrante USING btree (insumo_id) WHERE (estado = 'disponible'::text);


--
-- Name: idx_isobrante_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_isobrante_orden ON public.insumo_sobrante USING btree (orden_origen_id);


--
-- Name: idx_leads_meta_vendedor_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_meta_vendedor_periodo ON public.leads_meta_ads USING btree (vendedor_id, periodo_mes);


--
-- Name: idx_mascotas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mascotas_cliente_id ON public.mascotas USING btree (cliente_id);


--
-- Name: idx_movimientos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_created_at ON public.movimientos_inventario USING btree (created_at);


--
-- Name: idx_movimientos_insumo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_insumo_id ON public.movimientos_inventario USING btree (insumo_id) WHERE (insumo_id IS NOT NULL);


--
-- Name: idx_movimientos_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_lote_id ON public.movimientos_inventario USING btree (lote_id) WHERE (lote_id IS NOT NULL);


--
-- Name: idx_movimientos_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_producto_id ON public.movimientos_inventario USING btree (producto_id) WHERE (producto_id IS NOT NULL);


--
-- Name: idx_movimientos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_tipo ON public.movimientos_inventario USING btree (tipo);


--
-- Name: idx_movimientos_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_usuario_id ON public.movimientos_inventario USING btree (usuario_id) WHERE (usuario_id IS NOT NULL);


--
-- Name: idx_movimientos_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_variante_id ON public.movimientos_inventario USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_notas_logistica_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_logistica_pedido_id ON public.notas_logistica USING btree (pedido_id);


--
-- Name: idx_notificaciones_destinatario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_destinatario ON public.notificaciones USING btree (destinatario_id, created_at DESC);


--
-- Name: idx_om_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_om_grupo ON public.orden_mezcla USING btree (orden_id, grupo_id);


--
-- Name: idx_om_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_om_orden ON public.orden_mezcla USING btree (orden_id);


--
-- Name: idx_opa_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opa_orden ON public.orden_produccion_actividad USING btree (orden_id, created_at DESC);


--
-- Name: idx_opi_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opi_orden ON public.orden_produccion_items USING btree (orden_id);


--
-- Name: idx_opp_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opp_orden ON public.orden_produccion_procesos USING btree (orden_id);


--
-- Name: idx_ordenes_produccion_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_created_by ON public.ordenes_produccion USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_ordenes_produccion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_estado ON public.ordenes_produccion USING btree (estado);


--
-- Name: idx_ordenes_produccion_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_producto_id ON public.ordenes_produccion USING btree (producto_id);


--
-- Name: idx_ordenes_produccion_producto_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_producto_lote_id ON public.ordenes_produccion USING btree (producto_lote_id) WHERE (producto_lote_id IS NOT NULL);


--
-- Name: idx_ordenes_produccion_receta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_receta_id ON public.ordenes_produccion USING btree (receta_id) WHERE (receta_id IS NOT NULL);


--
-- Name: idx_ordenes_produccion_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_produccion_variante_id ON public.ordenes_produccion USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_pedido_actividad_pedido_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedido_actividad_pedido_created ON public.pedido_actividad USING btree (pedido_id, created_at DESC);


--
-- Name: idx_pedido_mascotas_mascota_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedido_mascotas_mascota_id ON public.pedido_mascotas USING btree (mascota_id);


--
-- Name: idx_pedido_ruta_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedido_ruta_pedido_id ON public.pedido_ruta USING btree (pedido_id);


--
-- Name: idx_pedidos_aliado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_aliado_id ON public.pedidos USING btree (aliado_id) WHERE (aliado_id IS NOT NULL);


--
-- Name: idx_pedidos_cierres_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_cierres_meta ON public.pedidos USING btree (vendedor_id, created_at) WHERE ((fuente = 'meta_ads'::public.fuente_cliente) AND (numero_venta_cliente = 1));


--
-- Name: idx_pedidos_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_cliente_id ON public.pedidos USING btree (cliente_id);


--
-- Name: idx_pedidos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_created_at ON public.pedidos USING btree (created_at DESC);


--
-- Name: idx_pedidos_es_donacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_es_donacion ON public.pedidos USING btree (es_donacion) WHERE es_donacion;


--
-- Name: idx_pedidos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_estado ON public.pedidos USING btree (estado);


--
-- Name: idx_pedidos_estado_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_estado_pago ON public.pedidos USING btree (estado_pago);


--
-- Name: idx_pedidos_numero_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_numero_trgm ON public.pedidos USING gin (numero_pedido extensions.gin_trgm_ops);


--
-- Name: idx_pedidos_vendedor_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_vendedor_created_at ON public.pedidos USING btree (vendedor_id, created_at DESC);


--
-- Name: idx_pedidos_vendedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_vendedor_id ON public.pedidos USING btree (vendedor_id);


--
-- Name: idx_produccion_consumo_insumo_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produccion_consumo_insumo_lote ON public.produccion_consumo USING btree (insumo_lote_id);


--
-- Name: idx_produccion_consumo_orden_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produccion_consumo_orden_id ON public.produccion_consumo USING btree (orden_produccion_id);


--
-- Name: idx_producto_lotes_codigo_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_codigo_trgm ON public.producto_lotes USING gin (codigo_lote extensions.gin_trgm_ops);


--
-- Name: idx_producto_lotes_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_estado ON public.producto_lotes USING btree (estado);


--
-- Name: idx_producto_lotes_fefo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_fefo ON public.producto_lotes USING btree (fecha_vencimiento) WHERE (cantidad_disponible > (0)::numeric);


--
-- Name: idx_producto_lotes_orden_produccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_orden_produccion ON public.producto_lotes USING btree (orden_produccion_id) WHERE (orden_produccion_id IS NOT NULL);


--
-- Name: idx_producto_lotes_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_producto_id ON public.producto_lotes USING btree (producto_id);


--
-- Name: idx_producto_lotes_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_lotes_variante_id ON public.producto_lotes USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_productos_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_nombre_trgm ON public.productos USING gin (nombre extensions.gin_trgm_ops);


--
-- Name: idx_productos_sku_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_sku_trgm ON public.productos USING gin (sku extensions.gin_trgm_ops);


--
-- Name: idx_receta_items_insumo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receta_items_insumo_id ON public.receta_items USING btree (insumo_id);


--
-- Name: idx_receta_items_receta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receta_items_receta_id ON public.receta_items USING btree (receta_id);


--
-- Name: idx_recetas_firma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_firma ON public.recetas USING btree (firma) WHERE is_active;


--
-- Name: idx_recetas_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_producto_id ON public.recetas USING btree (producto_id);


--
-- Name: idx_recetas_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recetas_variante_id ON public.recetas USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_remision_items_detalle_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remision_items_detalle_pedido_id ON public.remision_items USING btree (detalle_pedido_id);


--
-- Name: idx_remision_items_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remision_items_producto_id ON public.remision_items USING btree (producto_id);


--
-- Name: idx_remision_items_producto_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remision_items_producto_lote_id ON public.remision_items USING btree (producto_lote_id) WHERE (producto_lote_id IS NOT NULL);


--
-- Name: idx_remision_items_remision_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remision_items_remision_id ON public.remision_items USING btree (remision_id);


--
-- Name: idx_remision_items_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remision_items_variante_id ON public.remision_items USING btree (variante_id) WHERE (variante_id IS NOT NULL);


--
-- Name: idx_remisiones_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remisiones_created_by ON public.remisiones USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_remisiones_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_remisiones_pedido_id ON public.remisiones USING btree (pedido_id);


--
-- Name: idx_rutas_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rutas_estado_fecha ON public.rutas USING btree (estado, fecha DESC);


--
-- Name: idx_user_permisos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_permisos_user_id ON public.user_permisos USING btree (user_id);


--
-- Name: precios_productos_normalizado_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX precios_productos_normalizado_unique ON public.precios_productos USING btree (public.normalizar_texto(nombre_producto), public.normalizar_texto(presentacion));


--
-- Name: recetas_producto_activa_unq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX recetas_producto_activa_unq ON public.recetas USING btree (producto_id) WHERE ((variante_id IS NULL) AND is_active);


--
-- Name: v_stock_insumos _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_stock_insumos WITH (security_invoker='on') AS
 SELECT i.id AS insumo_id,
    i.codigo,
    i.nombre,
    i.tipo,
    i.unidad_medida,
    i.stock_minimo,
    i.merma_pct,
    i.costo_promedio,
    COALESCE(sum(il.cantidad_disponible), (0)::numeric) AS stock_disponible,
    count(il.id) FILTER (WHERE ((il.fecha_vencimiento IS NOT NULL) AND (il.fecha_vencimiento <= (CURRENT_DATE + '30 days'::interval)) AND (il.cantidad_disponible > (0)::numeric))) AS lotes_por_vencer,
    (COALESCE(sum(il.cantidad_disponible), (0)::numeric) < i.stock_minimo) AS bajo_minimo,
    i.rendimiento_pct
   FROM (public.insumos i
     LEFT JOIN public.insumo_lotes il ON (((il.insumo_id = i.id) AND (il.cantidad_disponible > (0)::numeric))))
  WHERE (i.is_active = true)
  GROUP BY i.id;


--
-- Name: pedidos trg_a_guard_pedido_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_a_guard_pedido_update BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_guard_pedido_update();


--
-- Name: pedidos trg_aliado_comision_on_despacho; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_aliado_comision_on_despacho AFTER UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_activar_periodo_aliado();


--
-- Name: pedidos trg_b_validar_transicion_pedido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_b_validar_transicion_pedido BEFORE UPDATE OF estado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_validar_transicion_pedido();


--
-- Name: pedidos trg_calcular_numero_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calcular_numero_venta BEFORE INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_numero_venta_cliente();


--
-- Name: clientes trg_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();


--
-- Name: comisiones_detalle trg_comision_set_vendor_period; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_comision_set_vendor_period BEFORE INSERT ON public.comisiones_detalle FOR EACH ROW EXECUTE FUNCTION public.fn_set_comision_periodo_on_insert();


--
-- Name: pedidos trg_crear_comision_provisional; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_crear_comision_provisional AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_crear_comision_provisional();


--
-- Name: pedidos trg_generar_numero_pedido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generar_numero_pedido BEFORE INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_pedido();


--
-- Name: ingresos trg_ingreso_numero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ingreso_numero BEFORE INSERT ON public.ingresos FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_ingreso();


--
-- Name: insumos trg_insumo_codigo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_insumo_codigo BEFORE INSERT ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.fn_generar_codigo_insumo();


--
-- Name: insumos trg_insumos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_insumos_updated_at BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.fn_update_insumos_updated_at();


--
-- Name: liquidaciones_comision trg_liquidaciones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_liquidaciones_updated_at BEFORE UPDATE ON public.liquidaciones_comision FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();


--
-- Name: ordenes_produccion trg_op_numero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_op_numero BEFORE INSERT ON public.ordenes_produccion FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_op();


--
-- Name: pedidos trg_pedidos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();


--
-- Name: productos trg_productos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.fn_updated_at();


--
-- Name: receta_items trg_receta_items_firma_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_receta_items_firma_del AFTER DELETE ON public.receta_items REFERENCING OLD TABLE AS viejas FOR EACH STATEMENT EXECUTE FUNCTION public.fn_touch_firma_receta();


--
-- Name: receta_items trg_receta_items_firma_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_receta_items_firma_ins AFTER INSERT ON public.receta_items REFERENCING NEW TABLE AS nuevas FOR EACH STATEMENT EXECUTE FUNCTION public.fn_touch_firma_receta();


--
-- Name: receta_items trg_receta_items_firma_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_receta_items_firma_upd AFTER UPDATE ON public.receta_items REFERENCING OLD TABLE AS viejas NEW TABLE AS nuevas FOR EACH STATEMENT EXECUTE FUNCTION public.fn_touch_firma_receta();


--
-- Name: recetas trg_recetas_firma; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recetas_firma BEFORE INSERT OR UPDATE OF base_gramos, base_modo ON public.recetas FOR EACH ROW EXECUTE FUNCTION public.fn_set_firma_receta();


--
-- Name: remisiones trg_remision_numero; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_remision_numero BEFORE INSERT ON public.remisiones FOR EACH ROW EXECUTE FUNCTION public.fn_generar_numero_remision();


--
-- Name: ordenes_produccion trg_touch_orden_produccion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_orden_produccion BEFORE UPDATE ON public.ordenes_produccion FOR EACH ROW EXECUTE FUNCTION public.fn_touch_orden_produccion();


--
-- Name: aliados_referidos aliados_referidos_aliado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados_referidos
    ADD CONSTRAINT aliados_referidos_aliado_id_fkey FOREIGN KEY (aliado_id) REFERENCES public.aliados(id);


--
-- Name: aliados_referidos aliados_referidos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados_referidos
    ADD CONSTRAINT aliados_referidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: aliados_referidos aliados_referidos_pedido_primera_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aliados_referidos
    ADD CONSTRAINT aliados_referidos_pedido_primera_entrega_id_fkey FOREIGN KEY (pedido_primera_entrega_id) REFERENCES public.pedidos(id) ON DELETE RESTRICT;


--
-- Name: clientes clientes_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.users(id);


--
-- Name: clientes clientes_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id);


--
-- Name: comisiones_aliado comisiones_aliado_aliado_referido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_aliado
    ADD CONSTRAINT comisiones_aliado_aliado_referido_id_fkey FOREIGN KEY (aliado_referido_id) REFERENCES public.aliados_referidos(id);


--
-- Name: comisiones_aliado comisiones_aliado_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_aliado
    ADD CONSTRAINT comisiones_aliado_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: comisiones_detalle comisiones_detalle_liquidacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_detalle
    ADD CONSTRAINT comisiones_detalle_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones_comision(id);


--
-- Name: comisiones_detalle comisiones_detalle_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_detalle
    ADD CONSTRAINT comisiones_detalle_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: comisiones_detalle comisiones_detalle_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_detalle
    ADD CONSTRAINT comisiones_detalle_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id);


--
-- Name: conteo_items conteo_items_conteo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_items
    ADD CONSTRAINT conteo_items_conteo_id_fkey FOREIGN KEY (conteo_id) REFERENCES public.conteos_inventario(id) ON DELETE CASCADE;


--
-- Name: conteo_items conteo_items_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_items
    ADD CONSTRAINT conteo_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: conteo_items conteo_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_items
    ADD CONSTRAINT conteo_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: conteo_items conteo_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_items
    ADD CONSTRAINT conteo_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: conteos_inventario conteos_inventario_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteos_inventario
    ADD CONSTRAINT conteos_inventario_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: conteos_inventario conteos_inventario_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteos_inventario
    ADD CONSTRAINT conteos_inventario_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.users(id);


--
-- Name: desperdicios desperdicios_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: desperdicios desperdicios_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: desperdicios desperdicios_insumo_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_insumo_lote_id_fkey FOREIGN KEY (insumo_lote_id) REFERENCES public.insumo_lotes(id);


--
-- Name: desperdicios desperdicios_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: desperdicios desperdicios_producto_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id);


--
-- Name: desperdicios desperdicios_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desperdicios
    ADD CONSTRAINT desperdicios_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: detalle_pedido detalle_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: detalle_pedido detalle_pedido_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_pedido detalle_pedido_promo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.promociones(id);


--
-- Name: detalle_pedido detalle_pedido_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: donaciones donaciones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: donaciones donaciones_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: donaciones donaciones_producto_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id);


--
-- Name: donaciones donaciones_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.users(id);


--
-- Name: producto_lotes fk_producto_lotes_op; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_lotes
    ADD CONSTRAINT fk_producto_lotes_op FOREIGN KEY (orden_produccion_id) REFERENCES public.ordenes_produccion(id);


--
-- Name: ingreso_items ingreso_items_ingreso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_items
    ADD CONSTRAINT ingreso_items_ingreso_id_fkey FOREIGN KEY (ingreso_id) REFERENCES public.ingresos(id) ON DELETE CASCADE;


--
-- Name: ingreso_items ingreso_items_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingreso_items
    ADD CONSTRAINT ingreso_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: ingresos ingresos_anulado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingresos
    ADD CONSTRAINT ingresos_anulado_por_fkey FOREIGN KEY (anulado_por) REFERENCES public.users(id);


--
-- Name: ingresos ingresos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingresos
    ADD CONSTRAINT ingresos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: insumo_lotes insumo_lotes_ingreso_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_lotes
    ADD CONSTRAINT insumo_lotes_ingreso_item_id_fkey FOREIGN KEY (ingreso_item_id) REFERENCES public.ingreso_items(id);


--
-- Name: insumo_lotes insumo_lotes_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_lotes
    ADD CONSTRAINT insumo_lotes_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: insumo_sobrante_aplicacion insumo_sobrante_aplicacion_orden_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante_aplicacion
    ADD CONSTRAINT insumo_sobrante_aplicacion_orden_destino_id_fkey FOREIGN KEY (orden_destino_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: insumo_sobrante_aplicacion insumo_sobrante_aplicacion_sobrante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante_aplicacion
    ADD CONSTRAINT insumo_sobrante_aplicacion_sobrante_id_fkey FOREIGN KEY (sobrante_id) REFERENCES public.insumo_sobrante(id) ON DELETE CASCADE;


--
-- Name: insumo_sobrante insumo_sobrante_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: insumo_sobrante insumo_sobrante_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: insumo_sobrante insumo_sobrante_orden_mezcla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_orden_mezcla_id_fkey FOREIGN KEY (orden_mezcla_id) REFERENCES public.orden_mezcla(id) ON DELETE SET NULL;


--
-- Name: insumo_sobrante insumo_sobrante_orden_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumo_sobrante
    ADD CONSTRAINT insumo_sobrante_orden_origen_id_fkey FOREIGN KEY (orden_origen_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: kit_items kit_items_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_items
    ADD CONSTRAINT kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits(id) ON DELETE CASCADE;


--
-- Name: kit_items kit_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_items
    ADD CONSTRAINT kit_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: kit_items kit_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_items
    ADD CONSTRAINT kit_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: leads_meta_ads leads_meta_ads_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_meta_ads
    ADD CONSTRAINT leads_meta_ads_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id);


--
-- Name: liquidaciones_comision liquidaciones_comision_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones_comision
    ADD CONSTRAINT liquidaciones_comision_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id);


--
-- Name: mascotas mascotas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: mensajeros mensajeros_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajeros
    ADD CONSTRAINT mensajeros_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id) ON DELETE SET NULL;


--
-- Name: movimientos_inventario movimientos_inventario_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: movimientos_inventario movimientos_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: movimientos_inventario movimientos_inventario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id);


--
-- Name: movimientos_inventario movimientos_inventario_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: notas_logistica notas_logistica_completada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_logistica
    ADD CONSTRAINT notas_logistica_completada_por_fkey FOREIGN KEY (completada_por) REFERENCES public.users(id);


--
-- Name: notas_logistica notas_logistica_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_logistica
    ADD CONSTRAINT notas_logistica_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.users(id);


--
-- Name: notas_logistica notas_logistica_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_logistica
    ADD CONSTRAINT notas_logistica_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: notificaciones notificaciones_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.users(id);


--
-- Name: orden_mezcla orden_mezcla_config_produccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_mezcla
    ADD CONSTRAINT orden_mezcla_config_produccion_id_fkey FOREIGN KEY (config_produccion_id) REFERENCES public.config_produccion(id);


--
-- Name: orden_mezcla orden_mezcla_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_mezcla
    ADD CONSTRAINT orden_mezcla_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: orden_mezcla orden_mezcla_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_mezcla
    ADD CONSTRAINT orden_mezcla_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: orden_produccion_actividad orden_produccion_actividad_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_actividad
    ADD CONSTRAINT orden_produccion_actividad_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: orden_produccion_items orden_produccion_items_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: orden_produccion_items orden_produccion_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: orden_produccion_items orden_produccion_items_producto_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id);


--
-- Name: orden_produccion_items orden_produccion_items_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id);


--
-- Name: orden_produccion_items orden_produccion_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_items
    ADD CONSTRAINT orden_produccion_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: orden_produccion_procesos orden_produccion_procesos_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_procesos
    ADD CONSTRAINT orden_produccion_procesos_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: orden_produccion_procesos orden_produccion_procesos_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_produccion_procesos
    ADD CONSTRAINT orden_produccion_procesos_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: ordenes_produccion ordenes_produccion_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ordenes_produccion ordenes_produccion_orden_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_orden_origen_id_fkey FOREIGN KEY (orden_origen_id) REFERENCES public.ordenes_produccion(id);


--
-- Name: ordenes_produccion ordenes_produccion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: ordenes_produccion ordenes_produccion_producto_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id);


--
-- Name: ordenes_produccion ordenes_produccion_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id);


--
-- Name: ordenes_produccion ordenes_produccion_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: ordenes_produccion ordenes_produccion_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_produccion
    ADD CONSTRAINT ordenes_produccion_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: pedido_actividad pedido_actividad_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_actividad
    ADD CONSTRAINT pedido_actividad_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedido_actividad pedido_actividad_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_actividad
    ADD CONSTRAINT pedido_actividad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.users(id);


--
-- Name: pedido_mascotas pedido_mascotas_mascota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_mascotas
    ADD CONSTRAINT pedido_mascotas_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES public.mascotas(id);


--
-- Name: pedido_mascotas pedido_mascotas_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_mascotas
    ADD CONSTRAINT pedido_mascotas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedido_ruta pedido_ruta_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_ruta
    ADD CONSTRAINT pedido_ruta_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: pedido_ruta pedido_ruta_ruta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_ruta
    ADD CONSTRAINT pedido_ruta_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES public.rutas(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_aliado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_aliado_id_fkey FOREIGN KEY (aliado_id) REFERENCES public.aliados(id);


--
-- Name: pedidos pedidos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: pedidos pedidos_editado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_editado_por_id_fkey FOREIGN KEY (editado_por_id) REFERENCES public.users(id);


--
-- Name: pedidos pedidos_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users(id);


--
-- Name: pedidos pedidos_zona_entrega_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_zona_entrega_id_fkey FOREIGN KEY (zona_entrega_id) REFERENCES public.zonas_envio(id);


--
-- Name: pedidos pedidos_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_envio(id);


--
-- Name: precios_escala precios_escala_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_escala
    ADD CONSTRAINT precios_escala_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: produccion_consumo produccion_consumo_insumo_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produccion_consumo
    ADD CONSTRAINT produccion_consumo_insumo_lote_id_fkey FOREIGN KEY (insumo_lote_id) REFERENCES public.insumo_lotes(id);


--
-- Name: produccion_consumo produccion_consumo_orden_produccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produccion_consumo
    ADD CONSTRAINT produccion_consumo_orden_produccion_id_fkey FOREIGN KEY (orden_produccion_id) REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE;


--
-- Name: producto_lotes producto_lotes_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_lotes
    ADD CONSTRAINT producto_lotes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: producto_lotes producto_lotes_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_lotes
    ADD CONSTRAINT producto_lotes_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: producto_variantes producto_variantes_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_producto(id);


--
-- Name: promociones promociones_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: promociones promociones_regalo_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_regalo_producto_id_fkey FOREIGN KEY (regalo_producto_id) REFERENCES public.productos(id);


--
-- Name: promociones promociones_regalo_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_regalo_variante_id_fkey FOREIGN KEY (regalo_variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: promociones promociones_trigger_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_trigger_producto_id_fkey FOREIGN KEY (trigger_producto_id) REFERENCES public.productos(id);


--
-- Name: promociones promociones_trigger_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_trigger_variante_id_fkey FOREIGN KEY (trigger_variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: promociones promociones_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: receta_items receta_items_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receta_items
    ADD CONSTRAINT receta_items_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id);


--
-- Name: receta_items receta_items_receta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receta_items
    ADD CONSTRAINT receta_items_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id) ON DELETE CASCADE;


--
-- Name: recetas recetas_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: recetas recetas_reemplazada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_reemplazada_por_fkey FOREIGN KEY (reemplazada_por) REFERENCES public.recetas(id);


--
-- Name: recetas recetas_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: remision_items remision_items_detalle_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_detalle_pedido_id_fkey FOREIGN KEY (detalle_pedido_id) REFERENCES public.detalle_pedido(id);


--
-- Name: remision_items remision_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: remision_items remision_items_producto_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_producto_lote_id_fkey FOREIGN KEY (producto_lote_id) REFERENCES public.producto_lotes(id);


--
-- Name: remision_items remision_items_remision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_remision_id_fkey FOREIGN KEY (remision_id) REFERENCES public.remisiones(id) ON DELETE CASCADE;


--
-- Name: remision_items remision_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remision_items
    ADD CONSTRAINT remision_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id);


--
-- Name: remisiones remisiones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remisiones
    ADD CONSTRAINT remisiones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: remisiones remisiones_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.remisiones
    ADD CONSTRAINT remisiones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: rutas rutas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rutas
    ADD CONSTRAINT rutas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: rutas rutas_mensajero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rutas
    ADD CONSTRAINT rutas_mensajero_id_fkey FOREIGN KEY (mensajero_id) REFERENCES public.mensajeros(id) ON DELETE SET NULL;


--
-- Name: user_permisos user_permisos_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permisos
    ADD CONSTRAINT user_permisos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: user_permisos user_permisos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permisos
    ADD CONSTRAINT user_permisos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pesos_magistrales admin puede eliminar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin puede eliminar" ON public.pesos_magistrales FOR DELETE TO authenticated USING ((public.fn_get_user_role(auth.uid()) = 'admin'::text));


--
-- Name: pesos_magistrales admin puede insertar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin puede insertar" ON public.pesos_magistrales FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role(auth.uid()) = 'admin'::text));


--
-- Name: ai_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: aliados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aliados ENABLE ROW LEVEL SECURITY;

--
-- Name: aliados aliados_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_admin_delete ON public.aliados FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: aliados aliados_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_admin_insert ON public.aliados FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: aliados aliados_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_admin_update ON public.aliados FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: aliados_referidos aliados_ref_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_ref_insert ON public.aliados_referidos FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: aliados_referidos aliados_ref_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_ref_select ON public.aliados_referidos FOR SELECT TO authenticated USING (true);


--
-- Name: aliados_referidos aliados_ref_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_ref_update ON public.aliados_referidos FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: aliados_referidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aliados_referidos ENABLE ROW LEVEL SECURITY;

--
-- Name: aliados aliados_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aliados_select_auth ON public.aliados FOR SELECT TO authenticated USING (true);


--
-- Name: pesos_magistrales autenticados pueden leer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "autenticados pueden leer" ON public.pesos_magistrales FOR SELECT TO authenticated USING (true);


--
-- Name: categorias_producto categorias_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_admin_delete ON public.categorias_producto FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: categorias_producto categorias_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_admin_insert ON public.categorias_producto FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: categorias_producto categorias_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_admin_update ON public.categorias_producto FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: categorias_producto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias_producto categorias_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_select_auth ON public.categorias_producto FOR SELECT TO authenticated USING (true);


--
-- Name: clientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

--
-- Name: clientes clientes_insert_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clientes_insert_ventas ON public.clientes FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: clientes clientes_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clientes_select_auth ON public.clientes FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role, 'logistica'::public.user_role])) OR (creado_por = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.cliente_id = clientes.id) AND (p.vendedor_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: clientes clientes_update_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clientes_update_ventas ON public.clientes FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: comisiones_aliado com_aliado_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_aliado_admin_delete ON public.comisiones_aliado FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_aliado com_aliado_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_aliado_admin_insert ON public.comisiones_aliado FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_aliado com_aliado_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_aliado_admin_update ON public.comisiones_aliado FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_aliado com_aliado_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_aliado_select ON public.comisiones_aliado FOR SELECT TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_detalle com_detalle_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_detalle_admin_delete ON public.comisiones_detalle FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_detalle com_detalle_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_detalle_admin_insert ON public.comisiones_detalle FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_detalle com_detalle_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_detalle_admin_update ON public.comisiones_detalle FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: comisiones_detalle com_detalle_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY com_detalle_select ON public.comisiones_detalle FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])) OR (vendedor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.liquidaciones_comision lc
  WHERE ((lc.id = comisiones_detalle.liquidacion_id) AND (lc.vendedor_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: comisiones_aliado; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comisiones_aliado ENABLE ROW LEVEL SECURITY;

--
-- Name: comisiones_detalle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comisiones_detalle ENABLE ROW LEVEL SECURITY;

--
-- Name: config_comisiones config_com_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_com_admin_delete ON public.config_comisiones FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_comisiones config_com_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_com_admin_insert ON public.config_comisiones FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_comisiones config_com_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_com_admin_update ON public.config_comisiones FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_comisiones config_com_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_com_select_auth ON public.config_comisiones FOR SELECT TO authenticated USING (true);


--
-- Name: config_comisiones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config_comisiones ENABLE ROW LEVEL SECURITY;

--
-- Name: config_produccion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config_produccion ENABLE ROW LEVEL SECURITY;

--
-- Name: conteo_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conteo_items ENABLE ROW LEVEL SECURITY;

--
-- Name: conteo_items conteo_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteo_items_delete ON public.conteo_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: conteo_items conteo_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteo_items_insert ON public.conteo_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: conteo_items conteo_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteo_items_select ON public.conteo_items FOR SELECT TO authenticated USING (true);


--
-- Name: conteo_items conteo_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteo_items_update ON public.conteo_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: conteos_inventario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conteos_inventario ENABLE ROW LEVEL SECURITY;

--
-- Name: conteos_inventario conteos_inventario_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteos_inventario_delete ON public.conteos_inventario FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: conteos_inventario conteos_inventario_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteos_inventario_insert ON public.conteos_inventario FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: conteos_inventario conteos_inventario_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteos_inventario_select ON public.conteos_inventario FOR SELECT TO authenticated USING (true);


--
-- Name: conteos_inventario conteos_inventario_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conteos_inventario_update ON public.conteos_inventario FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_produccion cprod_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cprod_delete ON public.config_produccion FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_produccion cprod_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cprod_insert ON public.config_produccion FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: config_produccion cprod_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cprod_select ON public.config_produccion FOR SELECT TO authenticated USING (true);


--
-- Name: config_produccion cprod_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cprod_update ON public.config_produccion FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: desperdicios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.desperdicios ENABLE ROW LEVEL SECURITY;

--
-- Name: desperdicios desperdicios_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY desperdicios_delete_admin ON public.desperdicios FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: desperdicios desperdicios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY desperdicios_select ON public.desperdicios FOR SELECT TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: desperdicios desperdicios_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY desperdicios_update_admin ON public.desperdicios FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: detalle_pedido detalle_delete_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY detalle_delete_ventas ON public.detalle_pedido FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: detalle_pedido detalle_insert_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY detalle_insert_ventas ON public.detalle_pedido FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = detalle_pedido.pedido_id) AND ((public.fn_get_user_role() = 'admin'::public.user_role) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (p.vendedor_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: detalle_pedido; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.detalle_pedido ENABLE ROW LEVEL SECURITY;

--
-- Name: detalle_pedido detalle_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY detalle_select_auth ON public.detalle_pedido FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])) OR (EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = detalle_pedido.pedido_id) AND (((public.fn_get_user_role() = 'logistica'::public.user_role) AND ((p.estado_pago = 'confirmado'::public.estado_pago) OR (p.estado <> 'fecha_tentativa'::public.estado_pedido))) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (p.vendedor_id = ( SELECT auth.uid() AS uid)))))))));


--
-- Name: detalle_pedido detalle_update_logistica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY detalle_update_logistica ON public.detalle_pedido FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'logistica'::public.user_role)) WITH CHECK ((public.fn_get_user_role() = 'logistica'::public.user_role));


--
-- Name: detalle_pedido detalle_update_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY detalle_update_ventas ON public.detalle_pedido FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: donaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: donaciones donaciones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY donaciones_select ON public.donaciones FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])) OR (created_by = auth.uid())));


--
-- Name: donaciones donaciones_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY donaciones_update_admin ON public.donaciones FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: precios_escala escala_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY escala_admin_delete ON public.precios_escala FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: precios_escala escala_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY escala_admin_insert ON public.precios_escala FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: precios_escala escala_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY escala_admin_update ON public.precios_escala FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: precios_escala escala_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY escala_select_auth ON public.precios_escala FOR SELECT TO authenticated USING (true);


--
-- Name: ingreso_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingreso_items ENABLE ROW LEVEL SECURITY;

--
-- Name: ingreso_items ingreso_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingreso_items_delete ON public.ingreso_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ingreso_items ingreso_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingreso_items_insert ON public.ingreso_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ingreso_items ingreso_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingreso_items_select ON public.ingreso_items FOR SELECT TO authenticated USING (true);


--
-- Name: ingreso_items ingreso_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingreso_items_update ON public.ingreso_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ingreso_numero_seq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingreso_numero_seq ENABLE ROW LEVEL SECURITY;

--
-- Name: ingresos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;

--
-- Name: ingresos ingresos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingresos_delete ON public.ingresos FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ingresos ingresos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingresos_insert ON public.ingresos FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ingresos ingresos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingresos_select ON public.ingresos FOR SELECT TO authenticated USING (true);


--
-- Name: ingresos ingresos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingresos_update ON public.ingresos FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumo_codigo_seq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumo_codigo_seq ENABLE ROW LEVEL SECURITY;

--
-- Name: insumo_codigo_seq insumo_codigo_seq_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumo_codigo_seq_rw ON public.insumo_codigo_seq TO authenticated USING (true) WITH CHECK (true);


--
-- Name: insumo_lotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumo_lotes ENABLE ROW LEVEL SECURITY;

--
-- Name: insumo_lotes insumo_lotes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumo_lotes_delete ON public.insumo_lotes FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumo_lotes insumo_lotes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumo_lotes_insert ON public.insumo_lotes FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumo_lotes insumo_lotes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumo_lotes_select ON public.insumo_lotes FOR SELECT TO authenticated USING (true);


--
-- Name: insumo_lotes insumo_lotes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumo_lotes_update ON public.insumo_lotes FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: insumo_sobrante; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumo_sobrante ENABLE ROW LEVEL SECURITY;

--
-- Name: insumo_sobrante_aplicacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumo_sobrante_aplicacion ENABLE ROW LEVEL SECURITY;

--
-- Name: insumos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

--
-- Name: insumos insumos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_delete ON public.insumos FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumos insumos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_insert ON public.insumos FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumos insumos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_select ON public.insumos FOR SELECT TO authenticated USING (true);


--
-- Name: insumos insumos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insumos_update ON public.insumos FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: insumo_sobrante_aplicacion isaplic_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isaplic_delete ON public.insumo_sobrante_aplicacion FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: insumo_sobrante_aplicacion isaplic_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isaplic_insert ON public.insumo_sobrante_aplicacion FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: insumo_sobrante_aplicacion isaplic_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isaplic_select ON public.insumo_sobrante_aplicacion FOR SELECT TO authenticated USING (true);


--
-- Name: insumo_sobrante isob_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isob_delete ON public.insumo_sobrante FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: insumo_sobrante isob_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isob_insert ON public.insumo_sobrante FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: insumo_sobrante isob_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isob_select ON public.insumo_sobrante FOR SELECT TO authenticated USING (true);


--
-- Name: insumo_sobrante isob_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isob_update ON public.insumo_sobrante FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: kit_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_items kit_items_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kit_items_admin_delete ON public.kit_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kit_items kit_items_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kit_items_admin_insert ON public.kit_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kit_items kit_items_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kit_items_admin_update ON public.kit_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role)) WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kit_items kit_items_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kit_items_select_auth ON public.kit_items FOR SELECT TO authenticated USING ((public.fn_get_user_role() IS NOT NULL));


--
-- Name: kits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

--
-- Name: kits kits_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kits_admin_delete ON public.kits FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kits kits_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kits_admin_insert ON public.kits FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kits kits_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kits_admin_update ON public.kits FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role)) WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: kits kits_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kits_select_auth ON public.kits FOR SELECT TO authenticated USING ((public.fn_get_user_role() IS NOT NULL));


--
-- Name: leads_meta_ads leads_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_insert ON public.leads_meta_ads FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: leads_meta_ads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads_meta_ads ENABLE ROW LEVEL SECURITY;

--
-- Name: leads_meta_ads leads_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_select ON public.leads_meta_ads FOR SELECT TO authenticated USING (((public.fn_get_user_role() = 'admin'::public.user_role) OR (vendedor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: leads_meta_ads leads_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_update ON public.leads_meta_ads FOR UPDATE TO authenticated USING (((public.fn_get_user_role() = 'admin'::public.user_role) OR (vendedor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: liquidaciones_comision liquidaciones_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY liquidaciones_admin_delete ON public.liquidaciones_comision FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: liquidaciones_comision liquidaciones_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY liquidaciones_admin_insert ON public.liquidaciones_comision FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: liquidaciones_comision liquidaciones_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY liquidaciones_admin_update ON public.liquidaciones_comision FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])));


--
-- Name: liquidaciones_comision; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.liquidaciones_comision ENABLE ROW LEVEL SECURITY;

--
-- Name: liquidaciones_comision liquidaciones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY liquidaciones_select ON public.liquidaciones_comision FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])) OR (vendedor_id = ( SELECT auth.uid() AS uid))));


--
-- Name: mascotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mascotas ENABLE ROW LEVEL SECURITY;

--
-- Name: mascotas mascotas_delete_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mascotas_delete_ventas ON public.mascotas FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: mascotas mascotas_insert_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mascotas_insert_ventas ON public.mascotas FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: mascotas mascotas_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mascotas_select_auth ON public.mascotas FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role, 'logistica'::public.user_role])) OR (EXISTS ( SELECT 1
   FROM public.clientes c
  WHERE ((c.id = mascotas.cliente_id) AND ((c.creado_por = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.pedidos p
          WHERE ((p.cliente_id = c.id) AND (p.vendedor_id = ( SELECT auth.uid() AS uid)))))))))));


--
-- Name: mascotas mascotas_update_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mascotas_update_ventas ON public.mascotas FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'vendedor'::public.user_role])));


--
-- Name: mensajeros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mensajeros ENABLE ROW LEVEL SECURITY;

--
-- Name: mensajeros mensajeros_delete_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mensajeros_delete_ops ON public.mensajeros FOR DELETE USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: mensajeros mensajeros_insert_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mensajeros_insert_ops ON public.mensajeros FOR INSERT WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: mensajeros mensajeros_select_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mensajeros_select_ops ON public.mensajeros FOR SELECT USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: mensajeros mensajeros_update_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mensajeros_update_ops ON public.mensajeros FOR UPDATE USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: movimientos_inventario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

--
-- Name: movimientos_inventario movimientos_inventario_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_inventario_delete ON public.movimientos_inventario FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: movimientos_inventario movimientos_inventario_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_inventario_insert ON public.movimientos_inventario FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: movimientos_inventario movimientos_inventario_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_inventario_select ON public.movimientos_inventario FOR SELECT TO authenticated USING (true);


--
-- Name: movimientos_inventario movimientos_inventario_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_inventario_update ON public.movimientos_inventario FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: notas_logistica; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notas_logistica ENABLE ROW LEVEL SECURITY;

--
-- Name: notas_logistica notas_logistica_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notas_logistica_insert ON public.notas_logistica FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role]))))) AND (creado_por = auth.uid())));


--
-- Name: notas_logistica notas_logistica_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notas_logistica_select ON public.notas_logistica FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'vendedor'::public.user_role]))))));


--
-- Name: notas_logistica notas_logistica_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notas_logistica_update ON public.notas_logistica FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role]))))));


--
-- Name: notificaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: notificaciones notificaciones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notificaciones_select ON public.notificaciones FOR SELECT TO authenticated USING (((destinatario_id = auth.uid()) OR ((destinatario_id IS NULL) AND (public.fn_get_user_role() = 'admin'::public.user_role))));


--
-- Name: orden_mezcla om_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY om_delete ON public.orden_mezcla FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_mezcla om_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY om_insert ON public.orden_mezcla FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_mezcla om_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY om_select ON public.orden_mezcla FOR SELECT TO authenticated USING (true);


--
-- Name: orden_mezcla om_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY om_update ON public.orden_mezcla FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: op_numero_seq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.op_numero_seq ENABLE ROW LEVEL SECURITY;

--
-- Name: orden_produccion_actividad opa_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opa_insert ON public.orden_produccion_actividad FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_produccion_actividad opa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opa_select ON public.orden_produccion_actividad FOR SELECT TO authenticated USING (true);


--
-- Name: orden_produccion_procesos opp_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opp_delete ON public.orden_produccion_procesos FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_produccion_procesos opp_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opp_insert ON public.orden_produccion_procesos FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_produccion_procesos opp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opp_select ON public.orden_produccion_procesos FOR SELECT TO authenticated USING (true);


--
-- Name: orden_produccion_procesos opp_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opp_update ON public.orden_produccion_procesos FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_mezcla; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orden_mezcla ENABLE ROW LEVEL SECURITY;

--
-- Name: orden_produccion_actividad; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orden_produccion_actividad ENABLE ROW LEVEL SECURITY;

--
-- Name: orden_produccion_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orden_produccion_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orden_produccion_items orden_produccion_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_produccion_items_delete ON public.orden_produccion_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: orden_produccion_items orden_produccion_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_produccion_items_insert ON public.orden_produccion_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_produccion_items orden_produccion_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_produccion_items_select ON public.orden_produccion_items FOR SELECT TO authenticated USING (true);


--
-- Name: orden_produccion_items orden_produccion_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orden_produccion_items_update ON public.orden_produccion_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: orden_produccion_procesos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orden_produccion_procesos ENABLE ROW LEVEL SECURITY;

--
-- Name: ordenes_produccion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ordenes_produccion ENABLE ROW LEVEL SECURITY;

--
-- Name: ordenes_produccion ordenes_produccion_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ordenes_produccion_delete ON public.ordenes_produccion FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: ordenes_produccion ordenes_produccion_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ordenes_produccion_insert ON public.ordenes_produccion FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: ordenes_produccion ordenes_produccion_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ordenes_produccion_select ON public.ordenes_produccion FOR SELECT TO authenticated USING (true);


--
-- Name: ordenes_produccion ordenes_produccion_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ordenes_produccion_update ON public.ordenes_produccion FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: pedido_actividad; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_actividad ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_actividad pedido_actividad_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_actividad_insert ON public.pedido_actividad FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role]))))));


--
-- Name: pedido_actividad pedido_actividad_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_actividad_select ON public.pedido_actividad FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'vendedor'::public.user_role]))))));


--
-- Name: pedido_mascotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_mascotas ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_mascotas pedido_mascotas_insert_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_mascotas_insert_ventas ON public.pedido_mascotas FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_mascotas.pedido_id) AND ((public.fn_get_user_role() = 'admin'::public.user_role) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (p.vendedor_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: pedido_mascotas pedido_mascotas_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_mascotas_select_auth ON public.pedido_mascotas FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_mascotas.pedido_id) AND ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])) OR ((public.fn_get_user_role() = 'logistica'::public.user_role) AND ((p.estado_pago = 'confirmado'::public.estado_pago) OR (p.estado <> 'fecha_tentativa'::public.estado_pedido))) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (p.vendedor_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: pedido_numero_seq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_numero_seq ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_ruta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_ruta ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_ruta pedido_ruta_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_ruta_delete ON public.pedido_ruta FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: pedido_ruta pedido_ruta_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_ruta_insert ON public.pedido_ruta FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: pedido_ruta pedido_ruta_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_ruta_select ON public.pedido_ruta FOR SELECT TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: pedido_ruta pedido_ruta_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_ruta_update ON public.pedido_ruta FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: pedido_transiciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_transiciones ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_transiciones pedido_transiciones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedido_transiciones_select ON public.pedido_transiciones FOR SELECT TO authenticated USING ((public.fn_get_user_role() IS NOT NULL));


--
-- Name: pedidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos pedidos_insert_ventas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_insert_ventas ON public.pedidos FOR INSERT TO authenticated WITH CHECK (((public.fn_get_user_role() = 'admin'::public.user_role) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (vendedor_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: pedidos pedidos_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_select_auth ON public.pedidos FOR SELECT TO authenticated USING (((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'contable'::public.user_role])) OR ((public.fn_get_user_role() = 'logistica'::public.user_role) AND ((estado_pago = 'confirmado'::public.estado_pago) OR (estado <> 'fecha_tentativa'::public.estado_pedido))) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (vendedor_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: pedidos pedidos_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_update_own ON public.pedidos FOR UPDATE TO authenticated USING (((public.fn_get_user_role() = 'admin'::public.user_role) OR ((public.fn_get_user_role() = 'vendedor'::public.user_role) AND (vendedor_id = ( SELECT auth.uid() AS uid)) AND (estado <> ALL (ARRAY['listo_despacho'::public.estado_pedido, 'despachado'::public.estado_pedido]))) OR (public.fn_get_user_role() = 'contable'::public.user_role) OR (public.fn_get_user_role() = 'logistica'::public.user_role)));


--
-- Name: pesos_magistrales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pesos_magistrales ENABLE ROW LEVEL SECURITY;

--
-- Name: precios_escala; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.precios_escala ENABLE ROW LEVEL SECURITY;

--
-- Name: precios_productos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.precios_productos ENABLE ROW LEVEL SECURITY;

--
-- Name: produccion_consumo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produccion_consumo ENABLE ROW LEVEL SECURITY;

--
-- Name: produccion_consumo produccion_consumo_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produccion_consumo_delete ON public.produccion_consumo FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: produccion_consumo produccion_consumo_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produccion_consumo_insert ON public.produccion_consumo FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: produccion_consumo produccion_consumo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produccion_consumo_select ON public.produccion_consumo FOR SELECT TO authenticated USING (true);


--
-- Name: produccion_consumo produccion_consumo_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY produccion_consumo_update ON public.produccion_consumo FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: producto_lotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.producto_lotes ENABLE ROW LEVEL SECURITY;

--
-- Name: producto_lotes producto_lotes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY producto_lotes_delete ON public.producto_lotes FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: producto_lotes producto_lotes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY producto_lotes_insert ON public.producto_lotes FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role, 'jefe_produccion'::public.user_role])));


--
-- Name: producto_lotes producto_lotes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY producto_lotes_select ON public.producto_lotes FOR SELECT TO authenticated USING (true);


--
-- Name: producto_lotes producto_lotes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY producto_lotes_update ON public.producto_lotes FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: producto_variantes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.producto_variantes ENABLE ROW LEVEL SECURITY;

--
-- Name: productos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

--
-- Name: productos productos_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_admin_delete ON public.productos FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: productos productos_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_admin_insert ON public.productos FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: productos productos_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_admin_update ON public.productos FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: productos productos_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_select_auth ON public.productos FOR SELECT TO authenticated USING (true);


--
-- Name: promociones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;

--
-- Name: promociones promociones_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promociones_admin_delete ON public.promociones FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: promociones promociones_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promociones_admin_insert ON public.promociones FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: promociones promociones_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promociones_admin_update ON public.promociones FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role)) WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: promociones promociones_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promociones_select_auth ON public.promociones FOR SELECT TO authenticated USING ((public.fn_get_user_role() IS NOT NULL));


--
-- Name: prompt; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt ENABLE ROW LEVEL SECURITY;

--
-- Name: receta_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receta_items ENABLE ROW LEVEL SECURITY;

--
-- Name: receta_items receta_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receta_items_delete ON public.receta_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: receta_items receta_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receta_items_insert ON public.receta_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: receta_items receta_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receta_items_select ON public.receta_items FOR SELECT TO authenticated USING (true);


--
-- Name: receta_items receta_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receta_items_update ON public.receta_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: recetas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

--
-- Name: recetas recetas_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recetas_delete ON public.recetas FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: recetas recetas_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recetas_insert ON public.recetas FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: recetas recetas_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recetas_select ON public.recetas FOR SELECT TO authenticated USING (true);


--
-- Name: recetas recetas_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recetas_update ON public.recetas FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: reglas_descuento reglas_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reglas_admin_delete ON public.reglas_descuento FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: reglas_descuento reglas_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reglas_admin_insert ON public.reglas_descuento FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: reglas_descuento reglas_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reglas_admin_update ON public.reglas_descuento FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: reglas_descuento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reglas_descuento ENABLE ROW LEVEL SECURITY;

--
-- Name: reglas_descuento reglas_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reglas_select_auth ON public.reglas_descuento FOR SELECT TO authenticated USING (true);


--
-- Name: remision_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.remision_items ENABLE ROW LEVEL SECURITY;

--
-- Name: remision_items remision_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remision_items_delete ON public.remision_items FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: remision_items remision_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remision_items_insert ON public.remision_items FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: remision_items remision_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remision_items_select ON public.remision_items FOR SELECT TO authenticated USING (true);


--
-- Name: remision_items remision_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remision_items_update ON public.remision_items FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: remision_numero_seq; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.remision_numero_seq ENABLE ROW LEVEL SECURITY;

--
-- Name: remisiones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.remisiones ENABLE ROW LEVEL SECURITY;

--
-- Name: remisiones remisiones_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remisiones_delete ON public.remisiones FOR DELETE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: remisiones remisiones_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remisiones_insert ON public.remisiones FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: remisiones remisiones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remisiones_select ON public.remisiones FOR SELECT TO authenticated USING (true);


--
-- Name: remisiones remisiones_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY remisiones_update ON public.remisiones FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: rutas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;

--
-- Name: rutas rutas_insert_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rutas_insert_ops ON public.rutas FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: rutas rutas_select_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rutas_select_ops ON public.rutas FOR SELECT TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: rutas rutas_update_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rutas_update_ops ON public.rutas FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = ANY (ARRAY['admin'::public.user_role, 'logistica'::public.user_role])));


--
-- Name: user_permisos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permisos ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permisos user_permisos_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_permisos_select_own_or_admin ON public.user_permisos FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.fn_get_user_role() = 'admin'::public.user_role)));


--
-- Name: user_permisos user_permisos_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_permisos_write_admin ON public.user_permisos TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role)) WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_admin_delete ON public.users FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: users users_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_admin_insert ON public.users FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: users users_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_admin_update ON public.users FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR (public.fn_get_user_role() = 'admin'::public.user_role)));


--
-- Name: producto_variantes variantes_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_admin_delete ON public.producto_variantes FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: producto_variantes variantes_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_admin_insert ON public.producto_variantes FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: producto_variantes variantes_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_admin_update ON public.producto_variantes FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: producto_variantes variantes_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_select_auth ON public.producto_variantes FOR SELECT TO authenticated USING (true);


--
-- Name: zonas_envio zonas_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zonas_admin_delete ON public.zonas_envio FOR DELETE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: zonas_envio zonas_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zonas_admin_insert ON public.zonas_envio FOR INSERT TO authenticated WITH CHECK ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: zonas_envio zonas_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zonas_admin_update ON public.zonas_envio FOR UPDATE TO authenticated USING ((public.fn_get_user_role() = 'admin'::public.user_role));


--
-- Name: zonas_envio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zonas_envio ENABLE ROW LEVEL SECURITY;

--
-- Name: zonas_envio zonas_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zonas_select_auth ON public.zonas_envio FOR SELECT TO authenticated USING (true);


--
-- PostgreSQL database dump complete
--

COMMIT;


