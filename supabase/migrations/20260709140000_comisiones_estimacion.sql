-- ============================================================================
-- P1.1/P1.2 — Fuente única de estimación de comisiones
-- ----------------------------------------------------------------------------
-- Había 3 implementaciones divergentes del cálculo de comisión (TS muerto, JS en
-- /api/comisiones/preview, y fn_recalcular_comisiones_periodo que persiste).
-- Esta función replica EXACTAMENTE la lógica de fn_recalcular_comisiones_periodo
-- pero es de SOLO LECTURA (no hace UPDATE): devuelve, por pedido del período, el
-- monto/pct estimado con la tasa de cierre vigente. La usan tanto el preview del
-- vendedor como la tarjeta del dashboard, para que muestren el mismo número.
--
-- Para filas ya liquidadas (is_provisional = false) devuelve los valores YA
-- almacenados (definitivos); para las provisionales calcula el estimado.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_estimar_comisiones_periodo(
  p_vendedor_id uuid,
  p_periodo_mes text
)
  RETURNS TABLE(
    comision_id       uuid,
    pedido_id         uuid,
    numero_venta_cliente integer,
    base_calculo      numeric,
    pct_comision      numeric,
    monto_comision    numeric,
    aplica_comision   boolean,
    razon_no_comision text,
    estado_pago       text,
    is_provisional    boolean
  ) LANGUAGE plpgsql STABLE SECURITY DEFINER
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
