-- =====================================================================
-- PASO 1 — Reset del schema `public` en PRODUCCIÓN
-- Proyecto destino: jpdospwrcrbbwiwbedya
--
-- ⚠️  DESTRUCTIVO. Borra TODAS las tablas, datos, funciones, vistas y
--     políticas del schema `public`. Confirmado con el equipo: los datos
--     actuales de producción son descartables.
--
--     NO toca `auth` ni `storage`: los usuarios de Supabase Auth y sus
--     contraseñas se conservan. Sí se pierde `public.users`, así que hay
--     que repoblar los perfiles (ver 03_post_migracion.sql).
--
-- Ejecutar en: SQL Editor de producción, antes de 01_schema_dev.sql
-- =====================================================================

BEGIN;

-- El trigger vive en `auth.users` pero ejecuta una función de `public`.
-- Si no se quita primero, el DROP SCHEMA ... CASCADE lo arrastra de forma
-- implícita; lo hacemos explícito para que el estado quede claro.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

ALTER SCHEMA public OWNER TO pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';

-- Al borrar el schema se pierden también sus DEFAULT PRIVILEGES.
-- Sin esto, cada tabla que cree el dump nace sin permisos para los roles
-- de la API y la app responde "permission denied for table ..." en todo.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL   ON SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- Extensiones que el dump da por sentadas.
--
-- pg_dump con --schema=public NO emite ningún CREATE EXTENSION (verificado:
-- 0 ocurrencias en 01_schema_dev.sql), así que hay que crearlas aquí a mano
-- o el dump falla.
--
-- En `public`, porque así están en dev y el dump las referencia calificadas:
--   vector   -> documents.embedding es public.vector(1536)   (5 referencias)
--   unaccent -> lo usa public.normalizar_texto()             (1 referencia)
CREATE EXTENSION IF NOT EXISTS vector   WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- En `extensions` (schema que este script no borra). pg_trgm es obligatoria:
-- el dump crea 10 índices GIN con `extensions.gin_trgm_ops` (búsqueda por
-- nombre/celular/documento en clientes, productos, insumos y lotes). Si no
-- estuviera instalada en prod, esos 10 CREATE INDEX abortan la migración.
CREATE EXTENSION IF NOT EXISTS pg_trgm     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

COMMIT;
