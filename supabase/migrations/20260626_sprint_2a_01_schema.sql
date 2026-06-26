-- ============================================================
-- MIGRACIÓN 1/2: Sprint 2A — Inventario Schema base
-- Proyecto destino: ERP dev (jhznkgqnqulsesqcyszr)
-- Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ============================================================

-- 1. ENUMS
CREATE TYPE tipo_insumo AS ENUM ('materia_prima', 'producto_seco', 'aseo', 'empaque');
CREATE TYPE unidad_medida AS ENUM ('g', 'kg', 'ml', 'l', 'unidad');
CREATE TYPE estado_produccion AS ENUM ('planificada', 'en_proceso', 'completada', 'cancelada');
CREATE TYPE estado_pt AS ENUM ('producido', 'empacado', 'despachado');
CREATE TYPE categoria_conteo AS ENUM ('materia_prima', 'producto_seco', 'aseo', 'producto_terminado');
CREATE TYPE tipo_movimiento AS ENUM ('ingreso_compra', 'consumo_produccion', 'entrada_produccion', 'empaque', 'salida_despacho', 'ajuste_positivo', 'ajuste_negativo', 'merma', 'devolucion');

-- 2. SEQUENCE TABLES (patron igual a pedido_numero_seq)
CREATE TABLE ingreso_numero_seq  (year INTEGER PRIMARY KEY, ultimo_numero INTEGER NOT NULL DEFAULT 0);
CREATE TABLE op_numero_seq       (year INTEGER PRIMARY KEY, ultimo_numero INTEGER NOT NULL DEFAULT 0);
CREATE TABLE remision_numero_seq (year INTEGER PRIMARY KEY, ultimo_numero INTEGER NOT NULL DEFAULT 0);

-- 3. MASTER TABLES
CREATE TABLE insumos (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         TEXT          UNIQUE NOT NULL,
  nombre         TEXT          NOT NULL,
  tipo           tipo_insumo   NOT NULL,
  unidad_medida  unidad_medida NOT NULL,
  stock_minimo   NUMERIC       NOT NULL DEFAULT 0,
  merma_pct      NUMERIC       NOT NULL DEFAULT 0,
  costo_promedio NUMERIC       NOT NULL DEFAULT 0,
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  notas          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE recetas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID        NOT NULL REFERENCES productos(id),
  variante_id UUID        REFERENCES producto_variantes(id),
  nombre      TEXT        NOT NULL,
  rendimiento NUMERIC     NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receta_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id     UUID          NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id     UUID          NOT NULL REFERENCES insumos(id),
  cantidad      NUMERIC       NOT NULL,
  unidad_medida unidad_medida NOT NULL
);

-- 4. LOT TABLES
CREATE TABLE insumo_lotes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id           UUID        NOT NULL REFERENCES insumos(id),
  codigo_lote         TEXT        NOT NULL,
  cantidad_inicial    NUMERIC     NOT NULL,
  cantidad_disponible NUMERIC     NOT NULL,
  costo_unitario      NUMERIC     NOT NULL DEFAULT 0,
  proveedor           TEXT,
  fecha_ingreso       DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- producto_lotes: FK a ordenes_produccion se agrega después
CREATE TABLE producto_lotes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id         UUID        NOT NULL REFERENCES productos(id),
  variante_id         UUID        REFERENCES producto_variantes(id),
  codigo_lote         TEXT        NOT NULL,
  cantidad_inicial    NUMERIC     NOT NULL,
  cantidad_disponible NUMERIC     NOT NULL,
  estado              estado_pt   NOT NULL DEFAULT 'producido',
  costo_unitario      NUMERIC     NOT NULL DEFAULT 0,
  fecha_produccion    DATE        NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  orden_produccion_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TRANSACTIONAL TABLES
CREATE TABLE ingresos (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              TEXT          UNIQUE,
  tipo_ingreso        tipo_insumo   NOT NULL,
  proveedor           TEXT,
  fecha               DATE          NOT NULL DEFAULT CURRENT_DATE,
  temperatura_llegada NUMERIC,
  placa_vehiculo      TEXT,
  total_costo         NUMERIC       NOT NULL DEFAULT 0,
  notas               TEXT,
  created_by          UUID          REFERENCES users(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE ingreso_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ingreso_id       UUID        NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
  insumo_id        UUID        NOT NULL REFERENCES insumos(id),
  cantidad         NUMERIC     NOT NULL,
  precio_compra    NUMERIC     NOT NULL,
  precio_unitario  NUMERIC     GENERATED ALWAYS AS (precio_compra / NULLIF(cantidad, 0)) STORED,
  codigo_lote      TEXT        NOT NULL,
  fecha_vencimiento DATE
);

CREATE TABLE ordenes_produccion (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               TEXT              UNIQUE,
  producto_id          UUID              NOT NULL REFERENCES productos(id),
  variante_id          UUID              REFERENCES producto_variantes(id),
  receta_id            UUID              REFERENCES recetas(id),
  cantidad_planificada NUMERIC           NOT NULL,
  cantidad_producida   NUMERIC,
  estado               estado_produccion NOT NULL DEFAULT 'planificada',
  fecha                DATE              NOT NULL DEFAULT CURRENT_DATE,
  costo_total          NUMERIC,
  producto_lote_id     UUID              REFERENCES producto_lotes(id),
  notas                TEXT,
  created_by           UUID              REFERENCES users(id),
  created_at           TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- FK diferida: producto_lotes -> ordenes_produccion
ALTER TABLE producto_lotes
  ADD CONSTRAINT fk_producto_lotes_op
  FOREIGN KEY (orden_produccion_id) REFERENCES ordenes_produccion(id);

CREATE TABLE produccion_consumo (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_produccion_id UUID        NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  insumo_lote_id      UUID        NOT NULL REFERENCES insumo_lotes(id),
  cantidad_consumida  NUMERIC     NOT NULL,
  costo               NUMERIC     NOT NULL DEFAULT 0
);

CREATE TABLE remisiones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero     TEXT        UNIQUE,
  pedido_id  UUID        NOT NULL REFERENCES pedidos(id),
  fecha      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID        REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE remision_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  remision_id        UUID        NOT NULL REFERENCES remisiones(id) ON DELETE CASCADE,
  detalle_pedido_id  UUID        NOT NULL REFERENCES detalle_pedido(id),
  producto_id        UUID        NOT NULL REFERENCES productos(id),
  variante_id        UUID        REFERENCES producto_variantes(id),
  cantidad_entregada NUMERIC     NOT NULL,
  producto_lote_id   UUID        REFERENCES producto_lotes(id)
);

CREATE TABLE conteos_inventario (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha      DATE             NOT NULL DEFAULT CURRENT_DATE,
  categoria  categoria_conteo NOT NULL,
  notas      TEXT,
  created_by UUID             REFERENCES users(id),
  created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TABLE conteo_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id        UUID        NOT NULL REFERENCES conteos_inventario(id) ON DELETE CASCADE,
  insumo_id        UUID        REFERENCES insumos(id),
  producto_id      UUID        REFERENCES productos(id),
  variante_id      UUID        REFERENCES producto_variantes(id),
  cantidad_sistema NUMERIC     NOT NULL DEFAULT 0,
  cantidad_contada NUMERIC     NOT NULL DEFAULT 0,
  diferencia       NUMERIC     GENERATED ALWAYS AS (cantidad_contada - cantidad_sistema) STORED
);

CREATE TABLE movimientos_inventario (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            tipo_movimiento NOT NULL,
  insumo_id       UUID            REFERENCES insumos(id),
  producto_id     UUID            REFERENCES productos(id),
  variante_id     UUID            REFERENCES producto_variantes(id),
  lote_tipo       TEXT,
  lote_id         UUID,
  cantidad        NUMERIC         NOT NULL,
  costo_unitario  NUMERIC         NOT NULL DEFAULT 0,
  referencia_tipo TEXT,
  referencia_id   UUID,
  usuario_id      UUID            REFERENCES users(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 6. ALTER detalle_pedido
ALTER TABLE detalle_pedido ADD COLUMN IF NOT EXISTS cantidad_entregada NUMERIC DEFAULT 0;

-- 7. TRIGGER updated_at en insumos
CREATE OR REPLACE FUNCTION fn_update_insumos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION fn_update_insumos_updated_at();

-- 8. TRIGGERS DE NUMERACIÓN
CREATE OR REPLACE FUNCTION fn_generar_numero_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO ingreso_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = ingreso_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'ING-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ingreso_numero BEFORE INSERT ON ingresos FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_ingreso();

CREATE OR REPLACE FUNCTION fn_generar_numero_op()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO op_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = op_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'OP-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_op_numero BEFORE INSERT ON ordenes_produccion FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_op();

CREATE OR REPLACE FUNCTION fn_generar_numero_remision()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_year INTEGER; v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  INSERT INTO remision_numero_seq (year, ultimo_numero) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET ultimo_numero = remision_numero_seq.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_seq;
  NEW.numero := 'REM-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_remision_numero BEFORE INSERT ON remisiones FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_remision();

-- 9. HABILITAR RLS
ALTER TABLE ingreso_numero_seq     ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_numero_seq          ENABLE ROW LEVEL SECURITY;
ALTER TABLE remision_numero_seq    ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_lotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_lotes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingreso_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_consumo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE remisiones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE remision_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_inventario     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteo_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- 10. POLICIES RLS
-- Secuencias: todos los autenticados (la restricción real la da la tabla padre)
CREATE POLICY "ingreso_seq_rw"  ON ingreso_numero_seq  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "op_seq_rw"       ON op_numero_seq       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "remision_seq_rw" ON remision_numero_seq FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- insumos
CREATE POLICY "insumos_select" ON insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_insert" ON insumos FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "insumos_update" ON insumos FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "insumos_delete" ON insumos FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- recetas
CREATE POLICY "recetas_select" ON recetas FOR SELECT TO authenticated USING (true);
CREATE POLICY "recetas_insert" ON recetas FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "recetas_update" ON recetas FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "recetas_delete" ON recetas FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- receta_items
CREATE POLICY "receta_items_select" ON receta_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "receta_items_insert" ON receta_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "receta_items_update" ON receta_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "receta_items_delete" ON receta_items FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- insumo_lotes
CREATE POLICY "insumo_lotes_select" ON insumo_lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumo_lotes_insert" ON insumo_lotes FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "insumo_lotes_update" ON insumo_lotes FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "insumo_lotes_delete" ON insumo_lotes FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- producto_lotes
CREATE POLICY "producto_lotes_select" ON producto_lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "producto_lotes_insert" ON producto_lotes FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "producto_lotes_update" ON producto_lotes FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "producto_lotes_delete" ON producto_lotes FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- ingresos
CREATE POLICY "ingresos_select" ON ingresos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingresos_insert" ON ingresos FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ingresos_update" ON ingresos FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ingresos_delete" ON ingresos FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- ingreso_items
CREATE POLICY "ingreso_items_select" ON ingreso_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingreso_items_insert" ON ingreso_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ingreso_items_update" ON ingreso_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ingreso_items_delete" ON ingreso_items FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- ordenes_produccion
CREATE POLICY "ordenes_produccion_select" ON ordenes_produccion FOR SELECT TO authenticated USING (true);
CREATE POLICY "ordenes_produccion_insert" ON ordenes_produccion FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ordenes_produccion_update" ON ordenes_produccion FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "ordenes_produccion_delete" ON ordenes_produccion FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- produccion_consumo
CREATE POLICY "produccion_consumo_select" ON produccion_consumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "produccion_consumo_insert" ON produccion_consumo FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "produccion_consumo_update" ON produccion_consumo FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "produccion_consumo_delete" ON produccion_consumo FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- remisiones
CREATE POLICY "remisiones_select" ON remisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "remisiones_insert" ON remisiones FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "remisiones_update" ON remisiones FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "remisiones_delete" ON remisiones FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- remision_items
CREATE POLICY "remision_items_select" ON remision_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "remision_items_insert" ON remision_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "remision_items_update" ON remision_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "remision_items_delete" ON remision_items FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- conteos_inventario
CREATE POLICY "conteos_inventario_select" ON conteos_inventario FOR SELECT TO authenticated USING (true);
CREATE POLICY "conteos_inventario_insert" ON conteos_inventario FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "conteos_inventario_update" ON conteos_inventario FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "conteos_inventario_delete" ON conteos_inventario FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- conteo_items
CREATE POLICY "conteo_items_select" ON conteo_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "conteo_items_insert" ON conteo_items FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "conteo_items_update" ON conteo_items FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "conteo_items_delete" ON conteo_items FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- movimientos_inventario
CREATE POLICY "movimientos_inventario_select" ON movimientos_inventario FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimientos_inventario_insert" ON movimientos_inventario FOR INSERT TO authenticated WITH CHECK (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "movimientos_inventario_update" ON movimientos_inventario FOR UPDATE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));
CREATE POLICY "movimientos_inventario_delete" ON movimientos_inventario FOR DELETE TO authenticated USING (fn_get_user_role() = ANY (ARRAY['admin'::user_role,'logistica'::user_role]));

-- 11. VISTAS (security_invoker = on respeta RLS del usuario que consulta)
CREATE OR REPLACE VIEW v_stock_insumos WITH (security_invoker = on) AS
SELECT i.id AS insumo_id, i.codigo, i.nombre, i.tipo, i.unidad_medida, i.stock_minimo, i.merma_pct, i.costo_promedio,
  COALESCE(SUM(il.cantidad_disponible), 0) AS stock_disponible,
  COUNT(il.id) FILTER (WHERE il.fecha_vencimiento IS NOT NULL AND il.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' AND il.cantidad_disponible > 0) AS lotes_por_vencer,
  COALESCE(SUM(il.cantidad_disponible), 0) < i.stock_minimo AS bajo_minimo
FROM insumos i LEFT JOIN insumo_lotes il ON il.insumo_id = i.id AND il.cantidad_disponible > 0
WHERE i.is_active = true GROUP BY i.id;

CREATE OR REPLACE VIEW v_stock_productos WITH (security_invoker = on) AS
SELECT p.id AS producto_id, p.nombre AS producto_nombre, pv.id AS variante_id,
  pv.presentacion AS variante_presentacion, pl.estado,
  COALESCE(SUM(pl.cantidad_disponible), 0) AS stock_disponible,
  COALESCE(SUM(pl.cantidad_disponible * pl.costo_unitario) / NULLIF(SUM(pl.cantidad_disponible), 0), 0) AS costo_promedio_lote
FROM productos p JOIN producto_variantes pv ON pv.producto_id = p.id
LEFT JOIN producto_lotes pl ON pl.producto_id = p.id AND pl.variante_id = pv.id AND pl.cantidad_disponible > 0
GROUP BY p.id, p.nombre, pv.id, pv.presentacion, pl.estado;

CREATE OR REPLACE VIEW v_valor_inventario WITH (security_invoker = on) AS
SELECT 'insumo'::TEXT AS tipo, i.id AS item_id, i.nombre, i.codigo,
  COALESCE(SUM(il.cantidad_disponible), 0) AS stock_total,
  i.costo_promedio AS costo_unitario,
  COALESCE(SUM(il.cantidad_disponible), 0) * i.costo_promedio AS valor_total
FROM insumos i LEFT JOIN insumo_lotes il ON il.insumo_id = i.id AND il.cantidad_disponible > 0
WHERE i.is_active = true GROUP BY i.id, i.nombre, i.codigo, i.costo_promedio
UNION ALL
SELECT 'producto_terminado'::TEXT AS tipo, pv.id AS item_id,
  p.nombre || ' - ' || pv.presentacion AS nombre, NULL AS codigo,
  COALESCE(SUM(pl.cantidad_disponible), 0) AS stock_total,
  COALESCE(SUM(pl.cantidad_disponible * pl.costo_unitario) / NULLIF(SUM(pl.cantidad_disponible), 0), 0) AS costo_unitario,
  COALESCE(SUM(pl.cantidad_disponible * pl.costo_unitario), 0) AS valor_total
FROM productos p JOIN producto_variantes pv ON pv.producto_id = p.id
LEFT JOIN producto_lotes pl ON pl.producto_id = p.id AND pl.variante_id = pv.id AND pl.cantidad_disponible > 0
GROUP BY pv.id, p.nombre, pv.presentacion;

CREATE OR REPLACE VIEW v_componentes_venta WITH (security_invoker = on) AS
SELECT dp.id AS detalle_pedido_id, dp.pedido_id,
  dp.producto_id AS componente_producto_id, dp.variante_id AS componente_variante_id,
  dp.cantidad AS cantidad_componente,
  CASE WHEN dp.es_promo THEN 'promo_regalo' ELSE 'producto' END AS tipo_componente
FROM detalle_pedido dp;

CREATE OR REPLACE VIEW v_demanda_comprometida WITH (security_invoker = on) AS
SELECT dp.producto_id, dp.variante_id,
  SUM(dp.cantidad::NUMERIC - COALESCE(dp.cantidad_entregada, 0)) AS cantidad_pendiente
FROM detalle_pedido dp JOIN pedidos p ON p.id = dp.pedido_id
WHERE p.estado NOT IN ('despachado'::estado_pedido, 'devolucion'::estado_pedido)
  AND dp.cantidad::NUMERIC > COALESCE(dp.cantidad_entregada, 0)
GROUP BY dp.producto_id, dp.variante_id;

CREATE OR REPLACE VIEW v_compras_producto_periodo WITH (security_invoker = on) AS
SELECT ii.insumo_id, i.codigo AS insumo_codigo, i.nombre AS insumo_nombre, i.unidad_medida,
  ing.fecha, ing.proveedor, ii.cantidad, ii.precio_compra, ii.precio_unitario, ii.codigo_lote, ii.fecha_vencimiento
FROM ingreso_items ii JOIN ingresos ing ON ing.id = ii.ingreso_id JOIN insumos i ON i.id = ii.insumo_id;

CREATE OR REPLACE VIEW v_compras_anual_producto WITH (security_invoker = on) AS
SELECT ii.insumo_id, i.codigo AS insumo_codigo, i.nombre AS insumo_nombre, i.unidad_medida,
  EXTRACT(YEAR FROM ing.fecha)::INTEGER AS anio, EXTRACT(MONTH FROM ing.fecha)::INTEGER AS mes,
  SUM(ii.cantidad) AS total_cantidad, SUM(ii.precio_compra) AS total_valor,
  AVG(ii.precio_unitario) AS precio_promedio, MIN(ii.precio_unitario) AS precio_minimo,
  MAX(ii.precio_unitario) AS precio_maximo
FROM ingreso_items ii JOIN ingresos ing ON ing.id = ii.ingreso_id JOIN insumos i ON i.id = ii.insumo_id
GROUP BY ii.insumo_id, i.codigo, i.nombre, i.unidad_medida,
  EXTRACT(YEAR FROM ing.fecha), EXTRACT(MONTH FROM ing.fecha);

CREATE OR REPLACE VIEW v_trazabilidad_lote WITH (security_invoker = on) AS
SELECT il.id AS insumo_lote_id, il.codigo_lote, il.insumo_id, ins.nombre AS insumo_nombre,
  il.fecha_ingreso, il.fecha_vencimiento, il.cantidad_inicial, il.cantidad_disponible,
  pc.orden_produccion_id, op.numero AS numero_op,
  pl.id AS producto_lote_id, pl.codigo_lote AS codigo_lote_pt, pl.producto_id, pl.variante_id
FROM insumo_lotes il JOIN insumos ins ON ins.id = il.insumo_id
LEFT JOIN produccion_consumo pc ON pc.insumo_lote_id = il.id
LEFT JOIN ordenes_produccion op ON op.id = pc.orden_produccion_id
LEFT JOIN producto_lotes pl ON pl.orden_produccion_id = op.id;
