-- ============================================================================
-- Fix: "stack depth limit exceeded" al crear productos (y potencialmente
-- cualquier operación admin) para ciertos usuarios.
-- ----------------------------------------------------------------------------
-- Causa: fn_get_user_role() es SECURITY INVOKER y consulta public.users
-- ("SELECT role FROM public.users WHERE id = auth.uid()"). Esa consulta
-- interna vuelve a evaluar la política RLS users_select_own:
--   (id = auth.uid()) OR (fn_get_user_role() = 'admin')
-- El OR debería cortar en corto en el lado izquierdo (es tu propia fila), pero
-- para algunas sesiones ese short-circuit no se da en el plan de ejecución
-- (p. ej. seq scan evaluando la fila de OTRO usuario primero), y entonces
-- SIEMPRE se evalúa el lado derecho, re-invocando fn_get_user_role() — lo que
-- recursa indefinidamente hasta agotar el stack (54001).
--
-- fn_get_user_role() ya fue SECURITY DEFINER antes (ver auditoría de
-- seguridad 2026-05-12), pero se le quitó ese atributo para atender una
-- advertencia del Security Advisor sin entender que era justamente lo que
-- evitaba esta recursión: al ser SECURITY DEFINER, la consulta interna a
-- public.users corre como el dueño de la función (bypassa RLS de esa tabla
-- por completo), rompiendo el ciclo desde la raíz.
--
-- El search_path ya está fijado ("SET search_path TO 'public'"), que es la
-- mitigación estándar recomendada por Supabase para funciones SECURITY
-- DEFINER — por lo que el Advisor puede seguir señalándola como informativa,
-- pero es el patrón correcto para un helper de rol/permiso. No quitar de
-- nuevo el SECURITY DEFINER sin reemplazar el mecanismo anti-recursión.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_user_role()
  RETURNS public.user_role
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_get_user_role(user_id uuid)
  RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.users WHERE id = user_id;
$$;

COMMIT;
