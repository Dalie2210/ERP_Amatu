-- ============================================================
-- MIGRACIÓN: ERP-PROD-07 — Límites de mezcla configurables (no hardcodeados)
--
-- Contexto: el tamaño máximo de una mezcla (~58 kg) y el mínimo (~7-8 kg)
-- dependen de la capacidad física de la mezcladora, que puede cambiar si se
-- compra otra. Hoy esos números no existen en el sistema: viven en comentarios
-- de código y en el copy de la pantalla de mezcla, y el operario los aplica de
-- memoria. Fijarlos en el código sería repetir el mismo error una capa más
-- abajo.
--
-- Se crean como configuración editable por el admin, sobrescribible a mano al
-- cuadrar cada orden de mezcla (que es como el negocio pidió trabajarlo), y se
-- guarda en la propia orden el plan que se terminó usando, para que quede
-- auditable qué límites regían ese día.
--
-- De paso corrige un defecto de fn_get_or_create_mezclas_orden: la columna
-- orden_mezcla.porcion_estandar existe y es configurable desde 20260727000000,
-- pero la función divide por un 1200.0 literal. Cambiar la porción de una fila
-- dejaba el nº sugerido inconsistente con lo que muestra el frontend, que sí
-- respeta la columna.
--
-- Requiere haber aplicado 20260820010000_variantes_gramaje.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Configuración de mezcladora (patrón de config_comisiones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_produccion (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT        NOT NULL,
  porcion_estandar_g  NUMERIC     NOT NULL DEFAULT 1200 CHECK (porcion_estandar_g > 0),
  mezcla_min_g        NUMERIC     NOT NULL DEFAULT 7200,
  mezcla_max_g        NUMERIC     NOT NULL DEFAULT 58000,
  duracion_mezcla_min INT         NOT NULL DEFAULT 45 CHECK (duracion_mezcla_min > 0),
  tolerancia_ajuste_g NUMERIC     NOT NULL DEFAULT 0 CHECK (tolerancia_ajuste_g >= 0),
  is_default          BOOLEAN     NOT NULL DEFAULT false,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mezcla_min_g > 0 AND mezcla_max_g >= mezcla_min_g)
);

-- Una sola configuración puede ser la predeterminada.
CREATE UNIQUE INDEX IF NOT EXISTS config_produccion_default_unq
  ON config_produccion(is_default) WHERE is_default;

COMMENT ON TABLE config_produccion IS
  'Capacidad de la mezcladora y porción estándar de producción. Los valores por defecto reflejan la mezcladora actual (7,2–58 kg, porción de 1.200 g, ~45 min por mezcla); se editan en Admin cuando cambia el equipo.';
COMMENT ON COLUMN config_produccion.duracion_mezcla_min IS
  'Minutos operativos que cuesta una mezcla. Es lo que hace que "menos mezclas" sea un objetivo medible al planificar.';
COMMENT ON COLUMN config_produccion.tolerancia_ajuste_g IS
  'Residuo en gramos que se acepta sin alertar cuando el total no es múltiplo exacto de la porción estándar (ERP-PROD-06).';

INSERT INTO config_produccion (nombre, is_default)
SELECT 'Mezcladora principal', true
WHERE NOT EXISTS (SELECT 1 FROM config_produccion WHERE is_default);

-- RLS: lectura para toda la app (producción necesita los límites), escritura
-- solo admin — cambiar la capacidad de la mezcladora es una decisión de planta.
ALTER TABLE config_produccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cprod_select" ON config_produccion;
DROP POLICY IF EXISTS "cprod_insert" ON config_produccion;
DROP POLICY IF EXISTS "cprod_update" ON config_produccion;
DROP POLICY IF EXISTS "cprod_delete" ON config_produccion;

CREATE POLICY "cprod_select" ON config_produccion FOR SELECT TO authenticated USING (true);
CREATE POLICY "cprod_insert" ON config_produccion FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY "cprod_update" ON config_produccion FOR UPDATE TO authenticated USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY "cprod_delete" ON config_produccion FOR DELETE TO authenticated USING (fn_get_user_role() = 'admin'::user_role);

-- ------------------------------------------------------------
-- 2. Override por orden de mezcla
--    NULL en los límites = "usa los de la configuración". Se guarda además el
--    plan efectivamente aplicado, congelado: si mañana alguien cambia la
--    capacidad de la mezcladora, la hoja de una orden pasada debe seguir
--    explicando por qué se dividió como se dividió.
-- ------------------------------------------------------------
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS config_produccion_id UUID REFERENCES config_produccion(id);
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS mezcla_min_g NUMERIC;
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS mezcla_max_g NUMERIC;
ALTER TABLE orden_mezcla ADD COLUMN IF NOT EXISTS plan_mezclas JSONB;

COMMENT ON COLUMN orden_mezcla.mezcla_min_g IS
  'Mínimo de mezcla para esta orden. NULL = usa config_produccion.mezcla_min_g.';
COMMENT ON COLUMN orden_mezcla.mezcla_max_g IS
  'Máximo de mezcla para esta orden. NULL = usa config_produccion.mezcla_max_g.';
COMMENT ON COLUMN orden_mezcla.plan_mezclas IS
  'Plan de división aplicado, congelado: {porciones_totales, num_mezclas, mezclas:[{porciones,gramos}], min_g, max_g, porcion_estandar_g, ajuste_g, generado_en}.';

-- ------------------------------------------------------------
-- 3. fn_get_or_create_mezclas_orden: gramaje numérico + porción configurable
--    (reemplaza 20260727000000)
--
--    Cambios: usa pv.gramaje_g en vez del regexp sobre el texto (con el regexp
--    como respaldo mientras queden variantes sin resolver), y el nº sugerido
--    sale de la porción estándar real, no de un 1200 literal.
--
--    Sigue sin pisar lo diligenciado (num_mezclas, firmas, desglose) ni la
--    configuración ya elegida para la orden: una orden ya cuadrada no cambia de
--    mezcladora sola porque alguien recargue la página.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_or_create_mezclas_orden(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
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

GRANT EXECUTE ON FUNCTION fn_get_or_create_mezclas_orden(UUID) TO authenticated;
