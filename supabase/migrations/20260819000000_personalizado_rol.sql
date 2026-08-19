-- ============================================================
-- MIGRACIÓN: Nuevo rol 'personalizado'
--
-- Contexto: ERP-ADM-01 — perfiles personalizados. Un usuario con este rol no
-- tiene permisos fijos por rol; el admin configura sección por sección qué
-- puede ver/editar (tabla user_permisos, ver 20260819010000).
--
-- IMPORTANTE: agregar un valor a un enum debe ir en su PROPIA migración
-- (transacción) — Postgres no permite usar el valor recién agregado en la
-- misma transacción que lo crea. Mismo patrón que 20260726000000_jefe_produccion_rol.sql.
--
-- Los 4 roles fijos existentes (admin, vendedor, logistica, jefe_produccion)
-- y sus ~205 políticas RLS no se modifican: 'personalizado' nunca aparece en
-- esos arrays de rol, así que por defecto un usuario personalizado no tiene
-- acceso a ninguna tabla existente hasta que se le enrute explícitamente por
-- funciones SECURITY DEFINER (patrón fn_despachar_ruta / fn_registrar_conteo).
-- ============================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'personalizado';
