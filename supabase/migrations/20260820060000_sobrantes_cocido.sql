-- ============================================================
-- MIGRACIÓN: ERP-PROD-01/02/03 — Sobrante de producto cocido y saldo a favor
--
-- Contexto: el sobrante de producto cocido NO se genera al cerrar la orden de
-- producción, sino antes, al armar las mezclas. Hoy no hay dónde registrarlo,
-- así que se pierde: al día siguiente se vuelve a cocinar la cantidad completa
-- de ese insumo aunque quede producto del día anterior.
--
-- Se registra el sobrante por insumo desde la pantalla de mezcla, se convierte
-- a crudo con el factor de conversión del insumo, y ese saldo a favor reduce
-- automáticamente lo que hay que cocinar en la siguiente orden. Cuando el saldo
-- se consume, vuelve a cero.
--
-- ⚠ DECISIÓN DE DISEÑO DELIBERADA — el saldo es OPERATIVO, no contable.
-- Ninguna función de esta migración toca insumo_lotes, produccion_consumo,
-- movimientos_inventario ni producto_lotes, y fn_completar_item_produccion NO
-- se modifica. El motivo: el insumo crudo YA se descontó del inventario el día
-- que se completó la orden que generó el sobrante. El saldo cambia lo que el
-- jefe de planta ve que debe cocinar, no lo que el sistema descuenta.
-- Convertir esto en un movimiento de inventario descuadraría el costeo del lote
-- de PT. Si alguien quiere "corregirlo" más adelante, que lea esto primero.
--
-- Requiere haber aplicado 20260820030000_rpc_base_gramos.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Sobrantes registrados al mezclar
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insumo_sobrante (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id            UUID        NOT NULL REFERENCES insumos(id),
  orden_origen_id      UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  orden_mezcla_id      UUID        REFERENCES orden_mezcla(id) ON DELETE SET NULL,
  fecha                DATE        NOT NULL DEFAULT CURRENT_DATE,
  cantidad_cocido      NUMERIC     NOT NULL CHECK (cantidad_cocido > 0),
  cantidad_crudo_equiv NUMERIC     NOT NULL,
  -- Snapshot de los factores del momento: si alguien edita el insumo entre el
  -- día que sobró y el día que se aplica, el equivalente en crudo no debe
  -- cambiar retroactivamente.
  merma_pct_snap       NUMERIC     NOT NULL,
  rendimiento_pct_snap NUMERIC     NOT NULL,
  cocido_consumido     NUMERIC     NOT NULL DEFAULT 0 CHECK (cocido_consumido >= 0),
  estado               TEXT        NOT NULL DEFAULT 'disponible'
                                   CHECK (estado IN ('disponible', 'consumido', 'anulado')),
  nota                 TEXT,
  created_by           UUID        REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cocido_consumido <= cantidad_cocido),
  UNIQUE (orden_mezcla_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_isobrante_insumo
  ON insumo_sobrante(insumo_id) WHERE estado = 'disponible';
CREATE INDEX IF NOT EXISTS idx_isobrante_orden ON insumo_sobrante(orden_origen_id);

COMMENT ON TABLE insumo_sobrante IS
  'Producto cocido que sobró al armar las mezclas (ERP-PROD-01). Es un saldo OPERATIVO: reduce lo que hay que cocinar en la siguiente orden, pero no genera movimientos de inventario — el crudo ya se descontó al completar la orden que lo produjo.';
COMMENT ON COLUMN insumo_sobrante.cantidad_crudo_equiv IS
  'Equivalente en crudo calculado con fn_crudo_desde_cocido y los factores vigentes al registrar (ver *_snap).';

-- Aplicaciones del saldo a órdenes posteriores (permite revertir sin ambigüedad)
CREATE TABLE IF NOT EXISTS insumo_sobrante_aplicacion (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sobrante_id      UUID        NOT NULL REFERENCES insumo_sobrante(id) ON DELETE CASCADE,
  orden_destino_id UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  cantidad_cocido  NUMERIC     NOT NULL CHECK (cantidad_cocido > 0),
  cantidad_crudo   NUMERIC     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sobrante_id, orden_destino_id)
);

CREATE INDEX IF NOT EXISTS idx_isaplic_destino ON insumo_sobrante_aplicacion(orden_destino_id);

COMMENT ON TABLE insumo_sobrante_aplicacion IS
  'Qué parte de cada sobrante se aplicó a qué orden. Existe para poder revertir la aplicación de forma exacta e idempotente.';

-- Saldo disponible por insumo
CREATE OR REPLACE VIEW v_sobrante_insumo
WITH (security_invoker = on) AS
SELECT
  s.insumo_id,
  SUM(s.cantidad_cocido - s.cocido_consumido)                          AS cocido_disponible,
  SUM(
    fn_crudo_desde_cocido(
      s.cantidad_cocido - s.cocido_consumido,
      s.rendimiento_pct_snap,
      s.merma_pct_snap
    )
  )                                                                     AS crudo_disponible,
  COUNT(*)                                                              AS sobrantes_abiertos
FROM insumo_sobrante s
WHERE s.estado = 'disponible'
  AND s.cantidad_cocido - s.cocido_consumido > 0
GROUP BY s.insumo_id;

COMMENT ON VIEW v_sobrante_insumo IS
  'Saldo a favor de producto cocido por insumo, con su equivalente en crudo (ERP-PROD-02).';

-- ------------------------------------------------------------
-- 2. Panel en tiempo real de la hoja de proceso (ERP-PROD-03)
--
--    cant_a_cocinar_crudo es columna real, no generada, a propósito: se congela
--    al aplicar los saldos. Si fuera calculada, editar una receta a media
--    producción cambiaría el número que la planta ya tiene en la hoja impresa.
-- ------------------------------------------------------------
ALTER TABLE orden_produccion_procesos ADD COLUMN IF NOT EXISTS cant_cocido_requerido NUMERIC;
ALTER TABLE orden_produccion_procesos ADD COLUMN IF NOT EXISTS factor_conversion     NUMERIC;
ALTER TABLE orden_produccion_procesos ADD COLUMN IF NOT EXISTS cant_saldo_crudo      NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orden_produccion_procesos ADD COLUMN IF NOT EXISTS cant_a_cocinar_crudo  NUMERIC;
ALTER TABLE orden_produccion_procesos ADD COLUMN IF NOT EXISTS cant_obtenida_cocido  NUMERIC;

COMMENT ON COLUMN orden_produccion_procesos.cant_cocido_requerido IS
  'Cocido requerido por la receta (referencia). Contra esto se compara lo realmente obtenido.';
COMMENT ON COLUMN orden_produccion_procesos.factor_conversion IS
  'Crudo necesario por unidad de cocido, snapshot del momento del cálculo.';
COMMENT ON COLUMN orden_produccion_procesos.cant_saldo_crudo IS
  'Saldo a favor (en crudo) aplicado desde sobrantes de días anteriores (ERP-PROD-02).';
COMMENT ON COLUMN orden_produccion_procesos.cant_a_cocinar_crudo IS
  'Lo que la planta debe cocinar hoy: requerido menos saldo a favor. Congelado al aplicar saldos.';
COMMENT ON COLUMN orden_produccion_procesos.cant_obtenida_cocido IS
  'Peso cocido realmente obtenido, que el jefe de planta ingresa al pesar (ERP-PROD-03).';

-- ------------------------------------------------------------
-- 3. RLS (mismo patrón que orden_produccion_procesos / orden_mezcla)
-- ------------------------------------------------------------
ALTER TABLE insumo_sobrante             ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_sobrante_aplicacion  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "isob_select" ON insumo_sobrante;
DROP POLICY IF EXISTS "isob_insert" ON insumo_sobrante;
DROP POLICY IF EXISTS "isob_update" ON insumo_sobrante;
DROP POLICY IF EXISTS "isob_delete" ON insumo_sobrante;

CREATE POLICY "isob_select" ON insumo_sobrante FOR SELECT TO authenticated USING (true);
CREATE POLICY "isob_insert" ON insumo_sobrante FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "isob_update" ON insumo_sobrante FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "isob_delete" ON insumo_sobrante FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

DROP POLICY IF EXISTS "isaplic_select" ON insumo_sobrante_aplicacion;
DROP POLICY IF EXISTS "isaplic_insert" ON insumo_sobrante_aplicacion;
DROP POLICY IF EXISTS "isaplic_delete" ON insumo_sobrante_aplicacion;

CREATE POLICY "isaplic_select" ON insumo_sobrante_aplicacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "isaplic_insert" ON insumo_sobrante_aplicacion FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));
CREATE POLICY "isaplic_delete" ON insumo_sobrante_aplicacion FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role,'jefe_produccion'::user_role]));

-- ------------------------------------------------------------
-- 4. fn_insumos_mezcla: insumos de la receta de una dieta, con su requerimiento
--    Alimenta el panel "sobró producto" sin engordar la carga del detalle de
--    la orden, que ya hace cinco consultas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_insumos_mezcla(p_orden_mezcla_id UUID)
RETURNS TABLE(
  insumo_id         UUID,
  insumo_nombre     TEXT,
  unidad_medida     unidad_medida,
  merma_pct         NUMERIC,
  rendimiento_pct   NUMERIC,
  factor_conversion NUMERIC,
  cocido_requerido  NUMERIC,
  sobrante_actual   NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_om orden_mezcla%ROWTYPE;
BEGIN
  SELECT * INTO v_om FROM orden_mezcla WHERE id = p_orden_mezcla_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hoja de mezcla no encontrada'; END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.nombre,
    i.unidad_medida,
    i.merma_pct,
    i.rendimiento_pct,
    fn_crudo_desde_cocido(1, i.rendimiento_pct, i.merma_pct),
    SUM(ri.cantidad * fn_porciones_base(r.id, opi.variante_id, opi.cantidad_planificada)),
    MAX(COALESCE(s.cantidad_cocido, 0))
  FROM orden_produccion_items opi
  JOIN recetas r       ON r.id = opi.receta_id
  JOIN receta_items ri ON ri.receta_id = r.id
  JOIN insumos i       ON i.id = ri.insumo_id
  LEFT JOIN insumo_sobrante s
    ON s.orden_mezcla_id = p_orden_mezcla_id AND s.insumo_id = i.id AND s.estado <> 'anulado'
  WHERE opi.orden_id = v_om.orden_id
    AND opi.producto_id = v_om.producto_id
    AND i.tipo = 'materia_prima'
  GROUP BY i.id, i.nombre, i.unidad_medida, i.merma_pct, i.rendimiento_pct
  ORDER BY i.nombre;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_insumos_mezcla(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 5. fn_registrar_sobrante_mezcla (ERP-PROD-01)
--    p_items = [{"insumo_id": uuid, "cantidad_cocido": number, "nota": text}]
--    Upsert por (orden_mezcla, insumo). Cantidad 0 borra el registro.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_registrar_sobrante_mezcla(
  p_orden_mezcla_id UUID,
  p_items           JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_om        orden_mezcla%ROWTYPE;
  v_orden     ordenes_produccion%ROWTYPE;
  v_it        JSONB;
  v_insumo    insumos%ROWTYPE;
  v_cantidad  NUMERIC;
  v_crudo     NUMERIC;
  v_existente insumo_sobrante%ROWTYPE;
  v_n         INTEGER := 0;
BEGIN
  SELECT * INTO v_om FROM orden_mezcla WHERE id = p_orden_mezcla_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hoja de mezcla no encontrada'; END IF;

  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = v_om.orden_id FOR UPDATE;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se pueden registrar sobrantes';
  END IF;

  FOR v_it IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB))
  LOOP
    SELECT * INTO v_insumo FROM insumos WHERE id = (v_it->>'insumo_id')::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado'; END IF;

    -- El insumo debe pertenecer a la receta de ESTA dieta: si no, el sobrante
    -- se estaría atribuyendo a una mezcla que nunca lo usó.
    IF NOT EXISTS (
      SELECT 1
      FROM orden_produccion_items opi
      JOIN receta_items ri ON ri.receta_id = opi.receta_id
      WHERE opi.orden_id = v_om.orden_id
        AND opi.producto_id = v_om.producto_id
        AND ri.insumo_id = v_insumo.id
    ) THEN
      RAISE EXCEPTION 'El insumo "%" no forma parte de la receta de esta dieta', v_insumo.nombre;
    END IF;

    v_cantidad := COALESCE((v_it->>'cantidad_cocido')::NUMERIC, 0);

    SELECT * INTO v_existente
    FROM insumo_sobrante
    WHERE orden_mezcla_id = p_orden_mezcla_id AND insumo_id = v_insumo.id
    FOR UPDATE;

    -- Un sobrante ya consumido por otra orden no se reescribe en silencio:
    -- cambiaría un saldo del que ya se tomaron decisiones de cocción.
    IF FOUND AND v_existente.cocido_consumido > 0 THEN
      RAISE EXCEPTION
        'El sobrante de "%" ya fue aplicado a otra orden (% consumido). Libera esa aplicación antes de modificarlo.',
        v_insumo.nombre, round(v_existente.cocido_consumido, 2);
    END IF;

    IF v_cantidad <= 0 THEN
      IF FOUND THEN
        DELETE FROM insumo_sobrante WHERE id = v_existente.id;
        v_n := v_n + 1;
      END IF;
      CONTINUE;
    END IF;

    v_crudo := fn_crudo_desde_cocido(v_cantidad, v_insumo.rendimiento_pct, v_insumo.merma_pct);
    IF v_crudo IS NULL THEN
      RAISE EXCEPTION 'El insumo "%" tiene factores inválidos: no se puede convertir el sobrante a crudo', v_insumo.nombre;
    END IF;

    INSERT INTO insumo_sobrante (
      insumo_id, orden_origen_id, orden_mezcla_id, cantidad_cocido, cantidad_crudo_equiv,
      merma_pct_snap, rendimiento_pct_snap, nota, created_by
    )
    VALUES (
      v_insumo.id, v_om.orden_id, p_orden_mezcla_id, v_cantidad, v_crudo,
      v_insumo.merma_pct, v_insumo.rendimiento_pct, NULLIF(btrim(COALESCE(v_it->>'nota','')), ''), auth.uid()
    )
    ON CONFLICT (orden_mezcla_id, insumo_id) DO UPDATE SET
      cantidad_cocido      = EXCLUDED.cantidad_cocido,
      cantidad_crudo_equiv = EXCLUDED.cantidad_crudo_equiv,
      merma_pct_snap       = EXCLUDED.merma_pct_snap,
      rendimiento_pct_snap = EXCLUDED.rendimiento_pct_snap,
      nota                 = EXCLUDED.nota,
      estado               = 'disponible';

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_registrar_sobrante_mezcla(UUID, JSONB) TO authenticated;

-- ------------------------------------------------------------
-- 6. fn_liberar_saldos_orden: deshace lo aplicado a una orden
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_liberar_saldos_orden(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_ap RECORD;
BEGIN
  FOR v_ap IN
    SELECT a.id, a.sobrante_id, a.cantidad_cocido
    FROM insumo_sobrante_aplicacion a
    WHERE a.orden_destino_id = p_orden_id
    FOR UPDATE
  LOOP
    UPDATE insumo_sobrante
    SET cocido_consumido = GREATEST(cocido_consumido - v_ap.cantidad_cocido, 0),
        estado = 'disponible'
    WHERE id = v_ap.sobrante_id;

    DELETE FROM insumo_sobrante_aplicacion WHERE id = v_ap.id;
  END LOOP;

  UPDATE orden_produccion_procesos
  SET cant_saldo_crudo = 0,
      cant_a_cocinar_crudo = cant_requerida_crudo
  WHERE orden_id = p_orden_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_liberar_saldos_orden(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 7. fn_aplicar_saldos_orden (ERP-PROD-02)
--
--    Idempotente por revert-then-apply: primero suelta lo que esta orden ya
--    tenía tomado y luego vuelve a repartir. Pulsar "aplicar" dos veces no
--    duplica el descuento, y el FOR UPDATE serializa dos órdenes del mismo día
--    que compitan por el mismo sobrante.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aplicar_saldos_orden(p_orden_id UUID)
RETURNS TABLE(insumo_id UUID, saldo_crudo NUMERIC, a_cocinar_crudo NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden   ordenes_produccion%ROWTYPE;
  v_proc    RECORD;
  v_sob     RECORD;
  v_cocido_req  NUMERIC;
  v_factor      NUMERIC;
  v_restante    NUMERIC;
  v_toma        NUMERIC;
  v_saldo_crudo NUMERIC;
  v_crudo_toma  NUMERIC;
BEGIN
  SELECT * INTO v_orden FROM ordenes_produccion WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de producción no encontrada'; END IF;
  IF v_orden.estado IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'La orden ya está cerrada: no se pueden aplicar saldos';
  END IF;

  PERFORM fn_liberar_saldos_orden(p_orden_id);

  FOR v_proc IN
    SELECT p.id, p.insumo_id, p.cant_requerida_crudo, i.merma_pct, i.rendimiento_pct
    FROM orden_produccion_procesos p
    JOIN insumos i ON i.id = p.insumo_id
    WHERE p.orden_id = p_orden_id
    ORDER BY p.orden_index
  LOOP
    v_factor := fn_crudo_desde_cocido(1, v_proc.rendimiento_pct, v_proc.merma_pct);

    -- Cocido requerido = crudo requerido / factor. Se recalcula aquí para que
    -- el panel muestre siempre la conversión coherente con lo que se cocina.
    v_cocido_req := CASE
      WHEN v_factor IS NULL OR v_factor = 0 THEN NULL
      ELSE v_proc.cant_requerida_crudo / v_factor
    END;

    v_restante := COALESCE(v_cocido_req, 0);
    v_saldo_crudo := 0;

    IF v_restante > 0 THEN
      FOR v_sob IN
        SELECT s.id, s.cantidad_cocido, s.cocido_consumido,
               s.rendimiento_pct_snap, s.merma_pct_snap
        FROM insumo_sobrante s
        WHERE s.insumo_id = v_proc.insumo_id
          AND s.estado = 'disponible'
          AND s.cantidad_cocido - s.cocido_consumido > 0
        ORDER BY s.fecha, s.created_at
        FOR UPDATE
      LOOP
        EXIT WHEN v_restante <= 0;
        v_toma := LEAST(v_restante, v_sob.cantidad_cocido - v_sob.cocido_consumido);
        v_crudo_toma := fn_crudo_desde_cocido(v_toma, v_sob.rendimiento_pct_snap, v_sob.merma_pct_snap);

        INSERT INTO insumo_sobrante_aplicacion (sobrante_id, orden_destino_id, cantidad_cocido, cantidad_crudo)
        VALUES (v_sob.id, p_orden_id, v_toma, COALESCE(v_crudo_toma, 0));

        UPDATE insumo_sobrante
        SET cocido_consumido = cocido_consumido + v_toma,
            estado = CASE WHEN cocido_consumido + v_toma >= cantidad_cocido THEN 'consumido' ELSE 'disponible' END
        WHERE id = v_sob.id;

        v_saldo_crudo := v_saldo_crudo + COALESCE(v_crudo_toma, 0);
        v_restante := v_restante - v_toma;
      END LOOP;
    END IF;

    UPDATE orden_produccion_procesos
    SET cant_cocido_requerido = v_cocido_req,
        factor_conversion     = v_factor,
        cant_saldo_crudo      = v_saldo_crudo,
        cant_a_cocinar_crudo  = GREATEST(COALESCE(cant_requerida_crudo, 0) - v_saldo_crudo, 0)
    WHERE id = v_proc.id;

    insumo_id       := v_proc.insumo_id;
    saldo_crudo     := v_saldo_crudo;
    a_cocinar_crudo := GREATEST(COALESCE(v_proc.cant_requerida_crudo, 0) - v_saldo_crudo, 0);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aplicar_saldos_orden(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 8. Al cancelar una orden se sueltan sus saldos: no tiene sentido que un
--    sobrante quede reservado por una orden que nunca se va a cocinar.
--
--    Copia literal de 20260725020000 con UNA línea añadida (la liberación de
--    saldos). Las validaciones y los mensajes se conservan tal cual a propósito.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cancelar_orden_produccion(p_orden_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_con_produccion INTEGER;
BEGIN
  SELECT count(*) INTO v_con_produccion
  FROM orden_produccion_items
  WHERE orden_id = p_orden_id AND estado NOT IN ('planificada', 'cancelada');

  IF v_con_produccion > 0 THEN
    RAISE EXCEPTION 'No se puede cancelar: la orden ya tiene productos con producción registrada';
  END IF;

  PERFORM fn_liberar_saldos_orden(p_orden_id);

  UPDATE orden_produccion_items SET estado = 'cancelada' WHERE orden_id = p_orden_id AND estado = 'planificada';
  UPDATE ordenes_produccion SET estado = 'cancelada' WHERE id = p_orden_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_cancelar_orden_produccion(UUID) TO authenticated;
