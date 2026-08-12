-- ============================================================================
-- FASE 1 — P0 de la auditoría 2026-07-29 (docs/AUDITORIA_2026-07-29.md)
-- ----------------------------------------------------------------------------
-- Cierra el fraude de comisiones y la exposición de datos:
--   S2  RLS + políticas en promociones, kits, kit_items (hoy sin RLS → anon).
--   S1  Trigger fn_guard_pedido_update(): ningún cliente PostgREST puede mutar
--       columnas financieras ni de estado de `pedidos` sin pasar por una RPC.
--   S6  REVOKE sobre las 4 tablas *_numero_seq; solo los triggers (SECURITY
--       DEFINER) las tocan.
--   S4  fn_get_user_role() devuelve NULL para usuarios con is_active = false,
--       lo que hace fallar TODAS las políticas que dependen del rol.
--   S8  com_detalle_select ve las comisiones provisionales propias;
--       com_aliado_select se restringe a admin/contable.
--
-- IMPORTANTE — orden de aplicación: esta migración debe aplicarse junto con
-- 20260731000000_transaccionalidad.sql, que introduce las RPC (fn_crear_pedido,
-- fn_editar_lineas_pedido, fn_confirmar_pago_pedido y la versión SECURITY
-- DEFINER de fn_confirmar_venta) por las que pasan a fluir los cambios
-- legítimos que S1 bloquea aquí. Aplicar solo esta rompería la confirmación de
-- pago del vendedor y la edición de líneas para roles no-admin.
-- ============================================================================

BEGIN;

-- ============================================================================
-- S4 — is_active corta el acceso a nivel de base de datos
-- ----------------------------------------------------------------------------
-- Al devolver NULL, cada política del tipo `fn_get_user_role() = 'x'` evalúa a
-- NULL (≠ true) y deniega. Un usuario desactivado conserva la sesión JWT hasta
-- que expire, pero no puede leer ni escribir nada que dependa del rol.
-- Sigue siendo SECURITY DEFINER: ver 20260722120000_fix_fn_get_user_role_recursion.sql
-- (quitarlo reintroduce la recursión infinita en users_select_own).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_user_role()
  RETURNS public.user_role
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_user_role(user_id uuid)
  RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.users WHERE id = user_id AND is_active = true;
$$;

COMMENT ON FUNCTION public.fn_get_user_role() IS
  'Rol efectivo del usuario autenticado. Devuelve NULL si el usuario está inactivo (is_active = false), lo que deniega todas las políticas RLS basadas en rol.';

-- Revocación de sesiones al desactivar un usuario.
-- La API admin de auth-js expone signOut(jwt), que necesita el token del propio
-- usuario — el admin no lo tiene. El equivalente real de un "global logout" es
-- borrar sus filas de auth.sessions (auth.refresh_tokens cae en cascada). El
-- access token JWT vigente sobrevive hasta expirar; ese hueco lo cubren
-- fn_get_user_role() (NULL ⇒ RLS deniega), requireRole y el middleware.
CREATE OR REPLACE FUNCTION public.fn_revocar_sesiones_usuario(p_user_id uuid)
  RETURNS boolean
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

REVOKE ALL ON FUNCTION public.fn_revocar_sesiones_usuario(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_revocar_sesiones_usuario(uuid) TO authenticated, service_role;

-- ============================================================================
-- S2 — promociones, kits, kit_items sin RLS
-- ----------------------------------------------------------------------------
-- Una tabla del esquema `public` sin RLS queda expuesta por PostgREST al rol
-- anon (cuya key va en el bundle del navegador): lectura Y escritura sin
-- autenticar. Se aplica el mismo patrón que `productos`.
-- ============================================================================

ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promociones_select_auth  ON public.promociones;
DROP POLICY IF EXISTS promociones_admin_insert ON public.promociones;
DROP POLICY IF EXISTS promociones_admin_update ON public.promociones;
DROP POLICY IF EXISTS promociones_admin_delete ON public.promociones;

CREATE POLICY promociones_select_auth ON public.promociones FOR SELECT TO authenticated
  USING (fn_get_user_role() IS NOT NULL);
CREATE POLICY promociones_admin_insert ON public.promociones FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY promociones_admin_update ON public.promociones FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role)
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY promociones_admin_delete ON public.promociones FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

DROP POLICY IF EXISTS kits_select_auth  ON public.kits;
DROP POLICY IF EXISTS kits_admin_insert ON public.kits;
DROP POLICY IF EXISTS kits_admin_update ON public.kits;
DROP POLICY IF EXISTS kits_admin_delete ON public.kits;

CREATE POLICY kits_select_auth ON public.kits FOR SELECT TO authenticated
  USING (fn_get_user_role() IS NOT NULL);
CREATE POLICY kits_admin_insert ON public.kits FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY kits_admin_update ON public.kits FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role)
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY kits_admin_delete ON public.kits FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

DROP POLICY IF EXISTS kit_items_select_auth  ON public.kit_items;
DROP POLICY IF EXISTS kit_items_admin_insert ON public.kit_items;
DROP POLICY IF EXISTS kit_items_admin_update ON public.kit_items;
DROP POLICY IF EXISTS kit_items_admin_delete ON public.kit_items;

CREATE POLICY kit_items_select_auth ON public.kit_items FOR SELECT TO authenticated
  USING (fn_get_user_role() IS NOT NULL);
CREATE POLICY kit_items_admin_insert ON public.kit_items FOR INSERT TO authenticated
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY kit_items_admin_update ON public.kit_items FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role)
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY kit_items_admin_delete ON public.kit_items FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);

-- Cinturón y tirantes: aunque RLS ya bloquea a anon, se le retira el privilegio.
REVOKE ALL ON public.promociones FROM anon;
REVOKE ALL ON public.kits        FROM anon;
REVOKE ALL ON public.kit_items   FROM anon;

-- ============================================================================
-- S6 — Tablas de secuencia escribibles por cualquier autenticado
-- ----------------------------------------------------------------------------
-- `UPDATE pedido_numero_seq SET ultimo_numero = 0` colisiona con
-- UNIQUE (numero_pedido) y bloquea la creación de pedidos para todo el equipo.
-- El INSERT … ON CONFLICT DO UPDATE … RETURNING de los triggers ya es atómico;
-- el problema es solo el acceso directo vía PostgREST.
-- ============================================================================

DROP POLICY IF EXISTS authenticated_rw_seq ON public.pedido_numero_seq;
DROP POLICY IF EXISTS "ingreso_seq_rw"     ON public.ingreso_numero_seq;
DROP POLICY IF EXISTS "op_seq_rw"          ON public.op_numero_seq;
DROP POLICY IF EXISTS "remision_seq_rw"    ON public.remision_numero_seq;

REVOKE ALL ON public.pedido_numero_seq   FROM authenticated, anon;
REVOKE ALL ON public.ingreso_numero_seq  FROM authenticated, anon;
REVOKE ALL ON public.op_numero_seq       FROM authenticated, anon;
REVOKE ALL ON public.remision_numero_seq FROM authenticated, anon;

-- Los triggers de numeración de inventario eran SECURITY INVOKER: sin el GRANT
-- anterior dejarían de poder tocar la secuencia. Pasan a SECURITY DEFINER
-- (fn_generar_numero_pedido ya lo era desde el baseline).
CREATE OR REPLACE FUNCTION public.fn_generar_numero_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

CREATE OR REPLACE FUNCTION public.fn_generar_numero_op()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

CREATE OR REPLACE FUNCTION public.fn_generar_numero_remision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

-- ============================================================================
-- S8 — Comisiones: un permiso de más y uno de menos
-- ----------------------------------------------------------------------------
-- (a) Las comisiones provisionales tienen liquidacion_id = NULL, así que la
--     política anterior (basada solo en la liquidación) dejaba al vendedor sin
--     ver sus comisiones del mes en curso: el dashboard salía en blanco.
-- (b) com_aliado_select con USING (true) exponía todas las comisiones de
--     aliados a cualquier autenticado, incluida logística.
-- ============================================================================

DROP POLICY IF EXISTS com_detalle_select ON public.comisiones_detalle;
CREATE POLICY com_detalle_select ON public.comisiones_detalle FOR SELECT TO authenticated
  USING (
    (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
    OR (vendedor_id = (SELECT auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM public.liquidaciones_comision lc
      WHERE lc.id = comisiones_detalle.liquidacion_id
        AND lc.vendedor_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS com_aliado_select ON public.comisiones_aliado;
CREATE POLICY com_aliado_select ON public.comisiones_aliado FOR SELECT TO authenticated
  USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]));

-- ============================================================================
-- S1 — Guard de mutación sobre `pedidos`
-- ----------------------------------------------------------------------------
-- La política pedidos_update_own no restringe COLUMNAS. Con la anon key un
-- vendedor podía hacer, sin pasar por la app:
--   supabase.from('pedidos').update({ estado_pago: 'confirmado', total: 9e6 })
-- `estado_pago = 'confirmado'` es lo que separa montoGanado de montoBloqueado, y
-- `total` alimenta base_calculo → fraude de comisiones directo.
--
-- El trigger clasifica las columnas y exige que el cambio venga por una vía
-- autorizada. Las RPC de confianza marcan un GUC transaccional
-- (app.pedido_guard_bypass) que solo puede fijarse desde dentro de la base:
-- PostgREST no expone pg_catalog.set_config, así que un cliente no puede
-- activarlo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_pedido_guard_bypass()
  RETURNS boolean LANGUAGE sql STABLE
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(current_setting('app.pedido_guard_bypass', true), '') = 'on';
$$;

COMMENT ON FUNCTION public.fn_pedido_guard_bypass() IS
  'true cuando la transacción actual corre dentro de una RPC de confianza que ya validó la operación sobre pedidos. Se activa con set_config(''app.pedido_guard_bypass'', ''on'', true), no accesible desde PostgREST.';

CREATE OR REPLACE FUNCTION public.fn_guard_pedido_update()
  RETURNS trigger LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_guard_pedido_update   ON public.pedidos;
DROP TRIGGER IF EXISTS trg_a_guard_pedido_update ON public.pedidos;
-- Nombre con prefijo `trg_a_` para que corra ANTES que trg_pedidos_updated_at
-- y que el validador de transiciones (Postgres ordena por nombre de trigger).
CREATE TRIGGER trg_a_guard_pedido_update
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_pedido_update();

COMMIT;
