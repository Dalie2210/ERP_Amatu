-- ============================================================
-- MIGRACIÓN: ERP-PROD-00 — Helper compartido de conversión crudo↔cocido
--
-- Contexto: la fórmula unificada del proyecto
--     crudo = cocido / (rendimiento_pct/100) / (1 - merma_pct/100)
-- está hoy repetida literalmente en cuatro funciones SQL
-- (fn_get_or_create_procesos_orden, fn_preview_consumo_item,
-- fn_completar_item_produccion, fn_explosion_materiales) y en dos componentes
-- de cliente (NuevaOrdenProduccionDialog, RecetaFormDialog). Seis copias de la
-- misma regla de negocio es una invitación a que se desincronicen, y ninguna de
-- ellas protege contra rendimiento_pct = 0 (división por cero) ni contra
-- merma_pct >= 100 (el factor se vuelve cero o negativo y el crudo sale
-- negativo, en silencio).
--
-- Esta migración crea el helper único. NO reemplaza todavía a sus consumidores:
-- eso ocurre en 20260820030000_rpc_base_gramos.sql, cuando ya exista la base en
-- gramos de las recetas (ERP-PROD-09). Así este paso es puramente aditivo y se
-- puede desplegar y validar por separado.
--
-- El gemelo TypeScript vive en src/lib/inventario/receta.ts y debe mantenerse
-- sincronizado con esta función (hay tests que fijan el vector de valores).
-- ============================================================

-- ------------------------------------------------------------
-- 1. fn_crudo_desde_cocido: conversión cocido → crudo
--    IMMUTABLE: depende solo de sus argumentos, así el planificador puede
--    inlinearla dentro de agregaciones grandes (explosión de materiales).
--    Devuelve NULL cuando los factores son inválidos: NULL se propaga y es
--    visible aguas arriba, mientras que un 0 o un negativo se confundirían con
--    un dato real y descuadrarían un consumo de inventario.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_crudo_desde_cocido(
  p_cocido          NUMERIC,
  p_rendimiento_pct NUMERIC,
  p_merma_pct       NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
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

COMMENT ON FUNCTION fn_crudo_desde_cocido(NUMERIC, NUMERIC, NUMERIC) IS
  'Fórmula unificada de conversión cocido→crudo del proyecto: crudo = cocido / (rendimiento_pct/100) / (1 - merma_pct/100). Devuelve NULL si rendimiento_pct <= 0 o merma_pct >= 100 (factores inválidos). Gemelo TS en src/lib/inventario/receta.ts::crudoDesdeCocido.';

GRANT EXECUTE ON FUNCTION fn_crudo_desde_cocido(NUMERIC, NUMERIC, NUMERIC) TO authenticated;
