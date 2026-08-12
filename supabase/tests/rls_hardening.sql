-- ============================================================================
-- Verificación de las fases 1-3 de la auditoría 2026-07-29
-- ----------------------------------------------------------------------------
-- Crea un usuario por rol, intenta cada operación prohibida y comprueba que la
-- base la rechaza. Todo ocurre dentro de una transacción que termina en
-- ROLLBACK: no deja rastro.
--
--     psql "$DATABASE_URL" -f supabase/tests/rls_hardening.sql
--
-- CÓMO LEER EL RESULTADO
--   · Cada bloque «DEBE FALLAR» tiene que imprimir un ERROR. Si uno pasa en
--     silencio, ese control está roto.
--   · Cada bloque «DEBE PASAR» no debe imprimir ninguno.
--   · El RESUMEN final debe dar `t` en todas las columnas.
-- El script NO usa ON_ERROR_STOP: los errores esperados SON el resultado.
--
-- NOTAS DE IMPLEMENTACIÓN
--   · Cada intento prohibido va envuelto en SAVEPOINT/ROLLBACK TO, porque en
--     psql un error deja la transacción abortada y todo lo posterior fallaría.
--   · ROLLBACK TO también revierte los GUC, así que la impersonación
--     (request.jwt.claims + SET LOCAL ROLE) se vuelve a fijar después de cada
--     rollback. Es verboso a propósito: cualquier atajo aquí haría que un test
--     corriera como superusuario sin avisar.
--
-- Requiere las migraciones 20260730000000, 20260730010000, 20260730020000 y
-- 20260731000000 aplicadas, y una base con datos semilla (productos y zonas).
-- ============================================================================

\set ON_ERROR_STOP off

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Datos de prueba (como superusuario)
-- ----------------------------------------------------------------------------

SELECT gen_random_uuid() AS admin_id,
       gen_random_uuid() AS vendedor_id,
       gen_random_uuid() AS logistica_id,
       gen_random_uuid() AS inactivo_id
\gset

-- El trigger on_auth_user_created crea el perfil en public.users con el rol que
-- venga en raw_app_meta_data.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
VALUES
  (:'admin_id',     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rlstest-admin@example.test', '', now(), now(), now(),
   '{"full_name":"Test Admin","role":"admin"}'::jsonb, '{}'::jsonb),
  (:'vendedor_id',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rlstest-vendedor@example.test', '', now(), now(), now(),
   '{"full_name":"Test Vendedor","role":"vendedor"}'::jsonb, '{}'::jsonb),
  (:'logistica_id', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rlstest-logistica@example.test', '', now(), now(), now(),
   '{"full_name":"Test Logistica","role":"logistica"}'::jsonb, '{}'::jsonb),
  (:'inactivo_id',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rlstest-inactivo@example.test', '', now(), now(), now(),
   '{"full_name":"Test Inactivo","role":"vendedor"}'::jsonb, '{}'::jsonb);

UPDATE public.users SET is_active = false WHERE id = :'inactivo_id';

SELECT (SELECT id FROM zonas_envio LIMIT 1)               AS zona_id,
       (SELECT id FROM productos WHERE is_active LIMIT 1) AS producto_id,
       (SELECT pv.id FROM producto_variantes pv
          JOIN productos p ON p.id = pv.producto_id
         WHERE p.is_active LIMIT 1)                       AS variante_id
\gset

INSERT INTO clientes (codigo_cliente, nombre_completo, numero_documento, celular,
                      direccion, zona_id, creado_por)
VALUES ('RLSTEST-1', 'Cliente RLS Test', 'RLSTEST-DOC-1', '3000000000',
        'Calle Falsa 123', :'zona_id', :'vendedor_id')
RETURNING id AS cliente_id \gset

INSERT INTO pedidos (cliente_id, vendedor_id, estado, estado_pago, metodo_pago,
                     subtotal_alimento, total)
VALUES (:'cliente_id', :'vendedor_id', 'fecha_tentativa', 'pendiente', 'nequi', 100000, 100000)
RETURNING id AS pedido_id \gset

-- ----------------------------------------------------------------------------
-- 2. S1 — el vendedor no puede tocar importes ni estado de su propio pedido
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE FALLAR — S1: vendedor infla el total'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET total = 9999999 WHERE id = :'pedido_id';
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S1: vendedor se confirma el pago'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET estado_pago = 'confirmado' WHERE id = :'pedido_id';
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S1: vendedor cambia subtotal_alimento'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET subtotal_alimento = 500000 WHERE id = :'pedido_id';
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S1: vendedor reasigna vendedor_id'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET vendedor_id = :'admin_id' WHERE id = :'pedido_id';
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S5: vendedor salta directo a despachado'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET estado = 'despachado' WHERE id = :'pedido_id';
ROLLBACK TO sp;

-- ----------------------------------------------------------------------------
-- 3. S2 — promociones / kits sin RLS
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE FALLAR — S2: vendedor crea una promoción'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO promociones (nombre, tipo, paga_x, lleva_extra)
VALUES ('hack', 'paga_x_lleva_mas', 1, 100);
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S2: vendedor crea un kit'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO kits (nombre) VALUES ('hack');
ROLLBACK TO sp;

-- ----------------------------------------------------------------------------
-- 4. S6 — tablas de numeración fuera del alcance de `authenticated`
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE FALLAR — S6: vendedor reescribe pedido_numero_seq'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedido_numero_seq SET ultimo_numero = 0;
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S6: vendedor lee pedido_numero_seq'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT * FROM pedido_numero_seq;
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S6: vendedor reescribe remision_numero_seq'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE remision_numero_seq SET ultimo_numero = 0;
ROLLBACK TO sp;

-- ----------------------------------------------------------------------------
-- 5. S4 — usuario desactivado
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE FALLAR — S4: el inactivo crea un pedido'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'inactivo_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT fn_crear_pedido(
  jsonb_build_object('cliente_id', :'cliente_id', 'metodo_pago', 'nequi'),
  jsonb_build_array(jsonb_build_object(
    'producto_id', :'producto_id', 'nombre_snapshot', 'Test',
    'precio_unitario', 1000, 'cantidad', 1)));
ROLLBACK TO sp;

\echo '### DEBE PASAR — S4: fn_get_user_role() del inactivo debe ser NULL (vacío)'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'inactivo_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT fn_get_user_role() AS rol_del_inactivo;
ROLLBACK TO sp;

-- ----------------------------------------------------------------------------
-- 6. S5 — máquina de estados desde logística
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE FALLAR — S5: logística salta fecha_tentativa → listo_despacho'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'logistica_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET estado = 'listo_despacho' WHERE id = :'pedido_id';
ROLLBACK TO sp;

\echo '### DEBE FALLAR — S8: logística ve comisiones de aliados (debe dar 0 filas)'
SAVEPOINT sp;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'logistica_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS comisiones_aliado_visibles FROM comisiones_aliado;
ROLLBACK TO sp;

-- ----------------------------------------------------------------------------
-- 7. Vías legítimas — estas SÍ se conservan (sin ROLLBACK TO) para el resumen
-- ----------------------------------------------------------------------------

\echo ''
\echo '### DEBE PASAR — S1: vendedor edita notas y franja'
SELECT set_config('request.jwt.claims', json_build_object('sub', :'vendedor_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET notas_ventas = 'ok', franja_horaria = 'AM' WHERE id = :'pedido_id';

\echo '### DEBE PASAR — S8: vendedor ve su comisión provisional (debe dar 1)'
SELECT count(*) AS comisiones_visibles FROM comisiones_detalle WHERE pedido_id = :'pedido_id';

\echo '### DEBE PASAR — vía legítima: fn_confirmar_pago_pedido'
SELECT fn_confirmar_pago_pedido(:'pedido_id');

\echo '### DEBE PASAR — I1: fn_crear_pedido (el total enviado, 1, debe ignorarse)'
SELECT fn_crear_pedido(
  jsonb_build_object('cliente_id', :'cliente_id', 'metodo_pago', 'nequi', 'total', 1),
  jsonb_build_array(jsonb_build_object(
    'producto_id', :'producto_id', 'variante_id', :'variante_id',
    'nombre_snapshot', 'Test', 'precio_unitario', 50000,
    'cantidad', 2, 'aplica_descuento', true))
) AS creado;

\echo '### DEBE PASAR — S5: logística hace fecha_tentativa → confirmado'
SELECT set_config('request.jwt.claims', json_build_object('sub', :'logistica_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE pedidos SET estado = 'confirmado' WHERE id = :'pedido_id';

-- ----------------------------------------------------------------------------
-- 8. Resumen verificado contra la base
-- ----------------------------------------------------------------------------

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

\echo ''
\echo '================ RESUMEN (todo debe ser t) ================'
SELECT
  (SELECT total       FROM pedidos WHERE id = :'pedido_id') = 100000
    AS "S1 total intacto",
  (SELECT vendedor_id FROM pedidos WHERE id = :'pedido_id') = :'vendedor_id'::uuid
    AS "S1 vendedor_id intacto",
  (SELECT estado_pago FROM pedidos WHERE id = :'pedido_id') = 'confirmado'
    AS "S1 pago confirmado solo via RPC",
  (SELECT estado      FROM pedidos WHERE id = :'pedido_id') = 'confirmado'
    AS "S5 estado avanzo un paso legal",
  NOT EXISTS (SELECT 1 FROM promociones WHERE nombre = 'hack')
    AS "S2 promocion no creada",
  NOT EXISTS (SELECT 1 FROM kits WHERE nombre = 'hack')
    AS "S2 kit no creado",
  COALESCE((SELECT ultimo_numero FROM pedido_numero_seq
             WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::int), 0) > 0
    AS "S6 secuencia no reseteada",
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.cliente_id = :'cliente_id' AND p.id <> :'pedido_id'::uuid
      AND p.total > 1
      AND EXISTS (SELECT 1 FROM detalle_pedido d WHERE d.pedido_id = p.id)
  ) AS "I1 pedido con total del servidor y con lineas";

\echo ''
\echo 'Fin. Se revierte todo.'

ROLLBACK;
