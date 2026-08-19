-- ============================================================
-- MIGRACIÓN: ERP-DESP-01/02/03 — Reporte de desperdicio de materia prima
-- ------------------------------------------------------------
-- Reemplaza la hoja de cálculo que hoy diligencia el jefe de planta, con las
-- mismas columnas: FECHA · PRODUCTO · CANTIDAD (KILOS) · TEMPERATURA (°C) ·
-- PROVEEDOR · LOTE · RAZONES POR QUÉ SE DAÑÓ · ACCIÓN CORRECTIVA.
--
-- ⚠ DECISIÓN DE DISEÑO DELIBERADA (ERP-DESP-02) — este registro es
-- INFORMATIVO Y TRAZABLE, no contable. Ninguna función de esta migración
-- toca insumo_lotes, producto_lotes ni movimientos_inventario, y no llama a
-- fn_ajuste_inventario. El descuento real del stock ya ocurre por el conteo
-- físico (fn_aprobar_conteo); descontar también aquí duplicaría la pérdida.
-- Es el mismo criterio con el que 20260820060000_sobrantes_cocido.sql mantiene
-- el saldo de cocido fuera del inventario, por razones opuestas: allá porque
-- el producto sigue existiendo, acá porque el conteo ya lo dio de baja.
--
-- Se distingue de tres cosas que ya existen y no deben confundirse:
--   · merma (tipo_movimiento) — ajuste puntual que SÍ mueve stock.
--   · sobrante de mezcla (ERP-PROD-01) — saldo operativo de cocción.
--   · `ajusteG` de src/lib/inventario/mezcla.ts — residuo en gramos del plan
--     de mezclas, que el código llama "desperdicio" y no tiene relación.
-- ============================================================

-- Motivo normalizado, para que el dashboard de ERP-DESP-03 pueda agrupar. La
-- prosa original de la hoja ("se descongeló todo y tuvo cambios de
-- temperatura") se conserva íntegra en razon_dano — el enum la clasifica, no
-- la sustituye.
CREATE TYPE motivo_desperdicio AS ENUM (
  'vencimiento',
  'quemado',
  'cambio_temperatura',
  'nevera_danada',
  'bolsa_rota',
  'contaminacion',
  'otro'
);

CREATE TABLE desperdicios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  insumo_id         UUID REFERENCES insumos(id),
  producto_id       UUID REFERENCES productos(id),
  variante_id       UUID REFERENCES producto_variantes(id),
  cantidad_kg       NUMERIC NOT NULL CHECK (cantidad_kg > 0),
  temperatura_c     NUMERIC,
  proveedor         TEXT,
  codigo_lote       TEXT,
  insumo_lote_id    UUID REFERENCES insumo_lotes(id),
  producto_lote_id  UUID REFERENCES producto_lotes(id),
  motivo            motivo_desperdicio NOT NULL DEFAULT 'otro',
  razon_dano        TEXT NOT NULL,
  accion_correctiva TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT desperdicios_item_chk CHECK ((insumo_id IS NULL) <> (producto_id IS NULL))
);

CREATE INDEX idx_desperdicios_fecha ON desperdicios(fecha DESC);
CREATE INDEX idx_desperdicios_insumo ON desperdicios(insumo_id);
CREATE INDEX idx_desperdicios_producto ON desperdicios(producto_id);

COMMENT ON TABLE desperdicios IS
  'Reporte de alimento desechado (ERP-DESP-01). Informativo/trazable: NO descuenta stock — el descuento real lo hace el conteo físico (ERP-DESP-02).';
COMMENT ON COLUMN desperdicios.cantidad_kg IS
  'Kilos desechados. La hoja original captura siempre en kilos, sin importar la unidad_medida del insumo.';
COMMENT ON COLUMN desperdicios.temperatura_c IS
  'Temperatura en °C al detectar el daño; es el dato de trazabilidad de cadena de frío del lote.';
COMMENT ON COLUMN desperdicios.codigo_lote IS
  'Lote tal cual lo escribe planta (a veces un código, a veces una fecha). insumo_lote_id/producto_lote_id solo se llenan si se eligió un lote existente del sistema.';
COMMENT ON COLUMN desperdicios.razon_dano IS
  'Columna "RAZONES POR QUÉ SE DAÑÓ" de la hoja: texto libre, obligatorio. Es el dato que justifica el módulo.';
COMMENT ON COLUMN desperdicios.accion_correctiva IS
  'Columna "ACCIÓN CORRECTIVA" de la hoja: qué se hizo para que no vuelva a pasar.';

ALTER TABLE desperdicios ENABLE ROW LEVEL SECURITY;

-- Lectura para los mismos roles que operan inventario. Las escrituras van
-- exclusivamente por fn_registrar_desperdicio (SECURITY DEFINER), igual que
-- los conteos: así 'personalizado' puede registrar sin necesitar INSERT
-- directo sobre la tabla.
CREATE POLICY "desperdicios_select" ON desperdicios FOR SELECT TO authenticated
  USING (fn_get_user_role() IN ('admin'::user_role, 'logistica'::user_role, 'jefe_produccion'::user_role));

-- Solo admin puede corregir o borrar un registro ya diligenciado.
CREATE POLICY "desperdicios_update_admin" ON desperdicios FOR UPDATE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);
CREATE POLICY "desperdicios_delete_admin" ON desperdicios FOR DELETE TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role);


-- ------------------------------------------------------------
-- fn_registrar_desperdicio — guarda la grilla completa de una vez
-- ------------------------------------------------------------
-- Recibe el array de filas de la hoja. Mismo guard de rol que
-- fn_registrar_conteo, porque es el mismo usuario (jefe de planta) el que
-- diligencia ambos formatos.
CREATE OR REPLACE FUNCTION fn_registrar_desperdicio(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol         user_role := fn_get_user_role();
  v_item        JSONB;
  v_insumo_id   UUID;
  v_producto_id UUID;
  v_variante_id UUID;
  v_cantidad    NUMERIC;
  v_razon       TEXT;
  v_n           INTEGER := 0;
BEGIN
  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'logistica', 'jefe_produccion') THEN
    RAISE EXCEPTION 'No autorizado para registrar desperdicio';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No hay filas para registrar';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_insumo_id   := NULLIF(v_item ->> 'insumo_id', '')::UUID;
    v_producto_id := NULLIF(v_item ->> 'producto_id', '')::UUID;
    v_variante_id := NULLIF(v_item ->> 'variante_id', '')::UUID;
    v_cantidad    := (v_item ->> 'cantidad_kg')::NUMERIC;
    v_razon       := NULLIF(btrim(COALESCE(v_item ->> 'razon_dano', '')), '');

    IF (v_insumo_id IS NULL) = (v_producto_id IS NULL) THEN
      RAISE EXCEPTION 'Cada fila debe referenciar exactamente un insumo o un producto';
    END IF;

    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'La cantidad en kilos debe ser mayor a cero';
    END IF;

    IF v_razon IS NULL THEN
      RAISE EXCEPTION 'La razón por la que se dañó es obligatoria';
    END IF;

    IF v_insumo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM insumos WHERE id = v_insumo_id) THEN
      RAISE EXCEPTION 'Insumo no encontrado';
    END IF;

    IF v_producto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM productos WHERE id = v_producto_id) THEN
      RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    INSERT INTO desperdicios (
      fecha, insumo_id, producto_id, variante_id, cantidad_kg, temperatura_c,
      proveedor, codigo_lote, insumo_lote_id, producto_lote_id,
      motivo, razon_dano, accion_correctiva, created_by
    ) VALUES (
      COALESCE(NULLIF(v_item ->> 'fecha', '')::DATE, CURRENT_DATE),
      v_insumo_id, v_producto_id, v_variante_id,
      v_cantidad,
      NULLIF(v_item ->> 'temperatura_c', '')::NUMERIC,
      NULLIF(btrim(COALESCE(v_item ->> 'proveedor', '')), ''),
      NULLIF(btrim(COALESCE(v_item ->> 'codigo_lote', '')), ''),
      NULLIF(v_item ->> 'insumo_lote_id', '')::UUID,
      NULLIF(v_item ->> 'producto_lote_id', '')::UUID,
      COALESCE(NULLIF(v_item ->> 'motivo', '')::motivo_desperdicio, 'otro'::motivo_desperdicio),
      v_razon,
      NULLIF(btrim(COALESCE(v_item ->> 'accion_correctiva', '')), ''),
      auth.uid()
    );

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION fn_registrar_desperdicio(JSONB) IS
  'Registra una o varias filas del reporte de desperdicio (ERP-DESP-01). NO mueve inventario a propósito: el stock lo corrige el conteo físico (ERP-DESP-02).';

GRANT EXECUTE ON FUNCTION fn_registrar_desperdicio(JSONB) TO authenticated;


-- ------------------------------------------------------------
-- v_desperdicio_resumen — insumo agregado del dashboard (ERP-DESP-03)
-- ------------------------------------------------------------
-- security_invoker = on para que la vista respete el RLS de desperdicios, igual
-- que el resto de las vistas de inventario (ver 20260626_sprint_2a_01_schema).
CREATE OR REPLACE VIEW v_desperdicio_resumen WITH (security_invoker = on) AS
SELECT
  d.fecha,
  d.motivo,
  d.proveedor,
  COALESCE(i.nombre, p.nombre) AS item_nombre,
  d.insumo_id,
  d.producto_id,
  d.variante_id,
  SUM(d.cantidad_kg) AS kg,
  COUNT(*)           AS eventos
FROM desperdicios d
LEFT JOIN insumos   i ON i.id = d.insumo_id
LEFT JOIN productos p ON p.id = d.producto_id
GROUP BY d.fecha, d.motivo, d.proveedor, COALESCE(i.nombre, p.nombre),
         d.insumo_id, d.producto_id, d.variante_id;

COMMENT ON VIEW v_desperdicio_resumen IS
  'Kilos y eventos de desperdicio por fecha/ítem/motivo/proveedor, para el dashboard de pérdida por período (ERP-DESP-03).';


-- ------------------------------------------------------------
-- Nueva sección configurable para el rol 'personalizado' (ERP-ADM-01)
-- ------------------------------------------------------------
-- Debe quedar sincronizada a mano con ALL_SECCIONES/SECCION_BY_URL
-- (src/lib/permisos/secciones.ts), SECCION_ROLES_FIJOS
-- (src/lib/auth/requireRole.ts) y SECCION_LABELS (src/lib/constants/labels.ts).
ALTER TYPE app_seccion ADD VALUE IF NOT EXISTS 'inventario_desperdicio';
