-- =====================================================================
-- PASO 4 — Post-migración: lo que el dump de `public` NO puede traer
-- Ejecutar DESPUÉS de 00 → 01 → 02.
--
-- Son tres cosas, y las tres rompen la app si se olvidan:
--   A) El trigger sobre auth.users (vive fuera de `public`).
--   B) Repoblar public.users desde auth.users (el reset lo vació y sin
--      fila ahí fn_get_user_role() devuelve NULL, así que RLS bloquea
--      absolutamente todo para ese usuario).
--   C) Reafirmar los GRANT sobre lo que acaba de crear el dump.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- A. Trigger de alta de usuarios
--    Al crear un usuario en Supabase Auth se crea su perfil en public.users.
--    fn_handle_new_user() sí viene en el dump (está en `public`); el trigger
--    no, porque cuelga de auth.users.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ---------------------------------------------------------------------
-- B. Repoblar perfiles de los usuarios de Auth que ya existían
--    Misma lógica que fn_handle_new_user: nombre y rol salen de
--    raw_app_meta_data (app_metadata, no user_metadata), con fallback a
--    email y rol 'vendedor'.
-- ---------------------------------------------------------------------
INSERT INTO public.users (id, full_name, role)
SELECT
  au.id,
  COALESCE(au.raw_app_meta_data->>'full_name', au.email),
  COALESCE((au.raw_app_meta_data->>'role')::public.user_role, 'vendedor'::public.user_role)
FROM auth.users au
WHERE au.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- C. Permisos sobre los objetos recién creados por el dump
--    Los DEFAULT PRIVILEGES de 00_reset_prod.sql cubren lo que se cree a
--    partir de ahora; esto cubre lo que ya creó el dump en la misma sesión.
-- ---------------------------------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMIT;

-- =====================================================================
-- D. ACCIÓN MANUAL — designar al menos un admin
--
-- Sin un admin, nadie puede crear usuarios, editar catálogo, aprobar
-- conteos ni aprobar donaciones: casi todas las policies exigen
-- fn_get_user_role() = 'admin'. El paso B deja a todo el mundo como
-- 'vendedor'.
--
-- Reemplaza el correo y ejecuta:
--
-- UPDATE public.users u
-- SET role = 'admin'::public.user_role
-- FROM auth.users au
-- WHERE au.id = u.id AND au.email = 'TU_CORREO_ADMIN@amatu.co';
-- =====================================================================


-- =====================================================================
-- E. VERIFICACIÓN — corre esto y compara contra los valores esperados
--    (los esperados son el estado de dev al 2026-08-20)
-- =====================================================================

-- Conteo de objetos. Esperado: 63 tablas, 12 vistas, 27 enums.
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')                       AS tablas,
  (SELECT count(*) FROM pg_views WHERE schemaname='public')            AS vistas,
  (SELECT count(DISTINCT t.typname) FROM pg_type t
     JOIN pg_enum e ON e.enumtypid=t.oid
     JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE n.nspname='public')                                         AS enums;

-- Funciones de negocio. Esperado: 81.
SELECT count(*) AS funciones_app
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind IN ('f','p')
  AND (p.proname LIKE 'fn\_%'
       OR p.proname IN ('create_cliente_con_mascotas','normalizar_texto','match_documents'));

-- Policies RLS. Esperado: 193.
SELECT count(*) AS policies
FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';

-- Triggers de negocio en public. Esperado: 21.
SELECT count(*) AS triggers_public
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal;

-- ⚠️ Tablas SIN RLS habilitada: debe devolver 0 filas.
SELECT c.relname AS tabla_sin_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;

-- Trigger de auth: debe devolver exactamente 1 fila.
SELECT tgname FROM pg_trigger
WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;

-- Semilla de configuración.
-- Esperado: transiciones=21, zonas=4, categorias=5, reglas=6, pesos=9, config_prod=1.
SELECT
  (SELECT count(*) FROM public.pedido_transiciones) AS transiciones,
  (SELECT count(*) FROM public.zonas_envio)         AS zonas,
  (SELECT count(*) FROM public.categorias_producto) AS categorias,
  (SELECT count(*) FROM public.reglas_descuento)    AS reglas,
  (SELECT count(*) FROM public.pesos_magistrales)   AS pesos,
  (SELECT count(*) FROM public.config_produccion)   AS config_prod;

-- Perfiles vs usuarios de Auth: ambas columnas deben coincidir.
SELECT
  (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL) AS usuarios_auth,
  (SELECT count(*) FROM public.users)                        AS perfiles,
  (SELECT count(*) FROM public.users WHERE role='admin')     AS admins;
