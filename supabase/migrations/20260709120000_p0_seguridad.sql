-- ============================================================================
-- P0 — Seguridad: aislamiento por vendedor + anti-fraude de comisiones
-- ----------------------------------------------------------------------------
-- Contexto: las políticas SELECT de pedidos/clientes/detalle_pedido/mascotas
-- usaban USING (true), exponiendo TODOS los pedidos y TODO el PII de clientes a
-- cualquier vendedor. Además el INSERT de pedidos no fijaba vendedor_id, y la
-- comisión provisional la insertaba el cliente (bloqueada por RLS para vendedor).
--
-- Este archivo:
--   1. Agrega clientes.creado_por (dueño del cliente) + backfill + default.
--   2. Reescribe las políticas SELECT para aislar por vendedor (admin/contable
--      ven todo; logística ve lo operativo).
--   3. Fija vendedor_id = auth.uid() en el INSERT de pedidos y verifica la
--      pertenencia del pedido padre en el INSERT de detalle_pedido.
--   4. Crea la comisión provisional vía trigger AFTER INSERT ON pedidos
--      (SECURITY DEFINER), reemplazando el insert del cliente.
--   5. Endurece fn_calcular_numero_venta_cliente como SECURITY DEFINER para que
--      el conteo de ventas del cliente no se vea afectado por el nuevo RLS.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. clientes.creado_por — dueño del cliente para el aislamiento por vendedor
-- ----------------------------------------------------------------------------
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES public.users(id);

-- Backfill: asigna como dueño al vendedor del pedido más antiguo del cliente.
UPDATE public.clientes c
SET creado_por = sub.vendedor_id
FROM (
  SELECT DISTINCT ON (p.cliente_id) p.cliente_id, p.vendedor_id
  FROM public.pedidos p
  WHERE p.vendedor_id IS NOT NULL
  ORDER BY p.cliente_id, p.created_at ASC
) sub
WHERE c.id = sub.cliente_id
  AND c.creado_por IS NULL;

-- Nuevos clientes quedan a nombre de quien los crea.
ALTER TABLE public.clientes
  ALTER COLUMN creado_por SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_clientes_creado_por ON public.clientes (creado_por);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON public.pedidos (vendedor_id);

-- ----------------------------------------------------------------------------
-- 2. Políticas SELECT — aislamiento por vendedor
-- ----------------------------------------------------------------------------

-- pedidos: admin/contable ven todo; logística ve lo confirmado; vendedor lo suyo.
DROP POLICY IF EXISTS pedidos_select_auth ON public.pedidos;
CREATE POLICY pedidos_select_auth ON public.pedidos FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR ((fn_get_user_role() = 'logistica'::user_role) AND (estado_pago = 'confirmado'::estado_pago))
    OR ((fn_get_user_role() = 'vendedor'::user_role) AND (vendedor_id = (SELECT auth.uid())))
  );

-- clientes: admin/contable/logística ven todo; vendedor ve los que creó o los
-- que tienen un pedido suyo (cubre clientes migrados sin creado_por).
DROP POLICY IF EXISTS clientes_select_auth ON public.clientes;
CREATE POLICY clientes_select_auth ON public.clientes FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role, 'logistica'::user_role]))
    OR (creado_por = (SELECT auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.cliente_id = clientes.id
        AND p.vendedor_id = (SELECT auth.uid())
    ))
  );

-- mascotas: visibles si su cliente es visible para el usuario.
DROP POLICY IF EXISTS mascotas_select_auth ON public.mascotas;
CREATE POLICY mascotas_select_auth ON public.mascotas FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role, 'logistica'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = mascotas.cliente_id
        AND (c.creado_por = (SELECT auth.uid())
             OR EXISTS (SELECT 1 FROM public.pedidos p
                        WHERE p.cliente_id = c.id AND p.vendedor_id = (SELECT auth.uid())))
    ))
  );

-- detalle_pedido: visible si su pedido padre es visible.
DROP POLICY IF EXISTS detalle_select_auth ON public.detalle_pedido;
CREATE POLICY detalle_select_auth ON public.detalle_pedido FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = detalle_pedido.pedido_id
        AND (
          ((fn_get_user_role() = 'logistica'::user_role) AND (p.estado_pago = 'confirmado'::estado_pago))
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    ))
  );

-- ----------------------------------------------------------------------------
-- 3. Políticas INSERT — anti-fraude (fijar dueño real)
-- ----------------------------------------------------------------------------

-- pedidos: el vendedor solo puede crear pedidos a su propio nombre.
DROP POLICY IF EXISTS pedidos_insert_ventas ON public.pedidos;
CREATE POLICY pedidos_insert_ventas ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (
    (fn_get_user_role() = 'admin'::user_role)
    OR ((fn_get_user_role() = 'vendedor'::user_role) AND (vendedor_id = (SELECT auth.uid())))
  );

-- detalle_pedido: solo se pueden insertar líneas en un pedido que el usuario posee.
DROP POLICY IF EXISTS detalle_insert_ventas ON public.detalle_pedido;
CREATE POLICY detalle_insert_ventas ON public.detalle_pedido FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = detalle_pedido.pedido_id
        AND (
          (fn_get_user_role() = 'admin'::user_role)
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Comisión provisional vía trigger (reemplaza el insert del cliente)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_crear_comision_provisional()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_base numeric(12,2);
BEGIN
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

DROP TRIGGER IF EXISTS trg_crear_comision_provisional ON public.pedidos;
CREATE TRIGGER trg_crear_comision_provisional
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_crear_comision_provisional();

-- ----------------------------------------------------------------------------
-- 5. Conteo de ventas del cliente robusto frente al nuevo RLS
-- ----------------------------------------------------------------------------
-- Debe contar los pedidos del cliente de TODOS los vendedores; como ahora el RLS
-- aísla pedidos, se ejecuta como SECURITY DEFINER para no subcontar.
CREATE OR REPLACE FUNCTION public.fn_calcular_numero_venta_cliente()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
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

COMMIT;
