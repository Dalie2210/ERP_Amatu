-- ============================================================
-- MIGRACIÓN: Documentación del proceso de producción + auditoría
--
-- Contexto: hasta ahora una orden de producción solo se planificaba y se
-- completaba/quedaba parcial (consumo FEFO + lote de PT). No había registro
-- de lo que ocurre DURANTE la producción. El jefe de producción debe
-- documentar, por materia prima, la descongelación, cocción, molienda,
-- responsables y controles de calidad (empaque, rotulado, liberación de
-- lote). Ese registro hoy vive en un Excel ("MATERIAS PRIMAS"), una fila por
-- materia prima.
--
-- Esta migración agrega:
--   1. orden_produccion_procesos  — una fila por MP por orden (datos del proceso)
--   2. auditoría en ordenes_produccion (updated_at / updated_by + trigger)
--   3. orden_produccion_actividad — historial de cambios (espejo de pedido_actividad)
--   4. fn_get_or_create_procesos_orden — genera/actualiza la hoja de proceso
--   5. RLS que incluye el rol 'jefe_produccion' (agregado en 20260726000000)
--
-- Requiere haber aplicado 20260726000000_jefe_produccion_rol.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla de proceso por materia prima (una fila por MP por orden)
-- ------------------------------------------------------------
CREATE TABLE orden_produccion_procesos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id             UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  insumo_id            UUID        NOT NULL REFERENCES insumos(id),
  cant_requerida_crudo NUMERIC,                 -- snapshot calculado (referencia, no editable)
  temp_descongelacion  NUMERIC,                 -- Temp desp. descongelación °C
  cant_real_crudo      NUMERIC,                 -- Cant. real en crudo
  lotes                TEXT,                    -- Lote(s) de la materia prima (texto libre)
  tiempo_coccion_horas NUMERIC,                 -- Tiempo de cocción (horas)
  temp_final_coccion   NUMERIC,                 -- Temperatura final de cocción °C
  kilos_antes_molido   NUMERIC,                 -- Kilos antes de molido
  tiempo_molienda      NUMERIC,                 -- Tiempo de molienda
  kilos_final_molido   NUMERIC,                 -- Kilos final (molido)
  responsable_coccion  TEXT,                    -- Responsable de la cocción
  responsable          TEXT,                    -- Responsable (general)
  empaque_conforme     BOOLEAN,                 -- Empaque conforme (check; null = sin marcar)
  rotulado             BOOLEAN,                 -- Rotulado (check)
  liberacion_lote      BOOLEAN,                 -- Liberación de lote (check)
  orden_index          INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (orden_id, insumo_id)
);

CREATE INDEX idx_opp_orden ON orden_produccion_procesos(orden_id);

COMMENT ON TABLE orden_produccion_procesos IS
  'Registro del proceso de producción por materia prima (una fila por insumo materia_prima por orden). Lo diligencia el jefe de producción.';

-- ------------------------------------------------------------
-- 2. Auditoría en el encabezado de la orden
-- ------------------------------------------------------------
ALTER TABLE ordenes_produccion ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE ordenes_produccion ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

COMMENT ON COLUMN ordenes_produccion.updated_by IS
  'Último usuario que modificó la orden (proceso o completación). Lo fija el trigger a partir de auth.uid().';

-- Trigger: en cada UPDATE fija updated_at y captura al actor (auth.uid()).
CREATE OR REPLACE FUNCTION fn_touch_orden_produccion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_orden_produccion ON ordenes_produccion;
CREATE TRIGGER trg_touch_orden_produccion
  BEFORE UPDATE ON ordenes_produccion
  FOR EACH ROW EXECUTE FUNCTION fn_touch_orden_produccion();

-- ------------------------------------------------------------
-- 3. Historial de cambios (espejo de pedido_actividad)
-- ------------------------------------------------------------
CREATE TABLE orden_produccion_actividad (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id       UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL,   -- proceso_guardado | item_completado | item_parcial | orden_completada | orden_cancelada
  usuario_id     UUID,
  usuario_nombre TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opa_orden ON orden_produccion_actividad(orden_id, created_at DESC);

COMMENT ON TABLE orden_produccion_actividad IS
  'Bitácora de cambios de una orden de producción (guardado de proceso, completación de ítems, etc.).';

-- ------------------------------------------------------------
-- 4. fn_get_or_create_procesos_orden: genera/actualiza la hoja de proceso
--    Idempotente. Lista las materias primas distintas de todos los ítems de
--    la orden (insumos tipo 'materia_prima'), agregando la cantidad requerida
--    en crudo con la fórmula unificada del proyecto. No pisa lo diligenciado:
--    solo refresca la cantidad requerida (referencia).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_or_create_procesos_orden(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO orden_produccion_procesos (orden_id, insumo_id, cant_requerida_crudo, orden_index)
  SELECT
    p_orden_id,
    d.insumo_id,
    d.crudo_total,
    (ROW_NUMBER() OVER (ORDER BY d.insumo_nombre) - 1)::INT AS orden_index
  FROM (
    SELECT
      ri.insumo_id,
      i.nombre AS insumo_nombre,
      SUM(
        (ri.cantidad * (opi.cantidad_planificada / NULLIF(r.rendimiento, 0)))
        / (i.rendimiento_pct / 100.0)
        / (1 - (i.merma_pct / 100.0))
      ) AS crudo_total
    FROM orden_produccion_items opi
    JOIN recetas r      ON r.id = opi.receta_id
    JOIN receta_items ri ON ri.receta_id = r.id
    JOIN insumos i       ON i.id = ri.insumo_id
    WHERE opi.orden_id = p_orden_id
      AND i.tipo = 'materia_prima'
    GROUP BY ri.insumo_id, i.nombre
  ) d
  ON CONFLICT (orden_id, insumo_id)
  DO UPDATE SET cant_requerida_crudo = EXCLUDED.cant_requerida_crudo;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_or_create_procesos_orden(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
ALTER TABLE orden_produccion_procesos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_produccion_actividad ENABLE ROW LEVEL SECURITY;

-- orden_produccion_procesos
CREATE POLICY "opp_select" ON orden_produccion_procesos FOR SELECT TO authenticated USING (true);
CREATE POLICY "opp_insert" ON orden_produccion_procesos FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "opp_update" ON orden_produccion_procesos FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "opp_delete" ON orden_produccion_procesos FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

-- orden_produccion_actividad (insert = registrar bitácora; sin update/delete)
CREATE POLICY "opa_select" ON orden_produccion_actividad FOR SELECT TO authenticated USING (true);
CREATE POLICY "opa_insert" ON orden_produccion_actividad FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

-- ------------------------------------------------------------
-- 6. Ampliar RLS de escritura de producción para incluir 'jefe_produccion'
--    (las de lectura ya son abiertas a authenticated).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "ordenes_produccion_insert" ON ordenes_produccion;
DROP POLICY IF EXISTS "ordenes_produccion_update" ON ordenes_produccion;
CREATE POLICY "ordenes_produccion_insert" ON ordenes_produccion FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "ordenes_produccion_update" ON ordenes_produccion FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

DROP POLICY IF EXISTS "orden_produccion_items_insert" ON orden_produccion_items;
DROP POLICY IF EXISTS "orden_produccion_items_update" ON orden_produccion_items;
CREATE POLICY "orden_produccion_items_insert" ON orden_produccion_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "orden_produccion_items_update" ON orden_produccion_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

DROP POLICY IF EXISTS "produccion_consumo_insert" ON produccion_consumo;
CREATE POLICY "produccion_consumo_insert" ON produccion_consumo FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

-- Al completar un ítem se consumen insumo_lotes y se crea producto_lotes;
-- el jefe de producción debe poder ejecutar ese flujo.
DROP POLICY IF EXISTS "insumo_lotes_update" ON insumo_lotes;
CREATE POLICY "insumo_lotes_update" ON insumo_lotes FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

DROP POLICY IF EXISTS "producto_lotes_insert" ON producto_lotes;
CREATE POLICY "producto_lotes_insert" ON producto_lotes FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

DROP POLICY IF EXISTS "movimientos_inventario_insert" ON movimientos_inventario;
CREATE POLICY "movimientos_inventario_insert" ON movimientos_inventario FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
