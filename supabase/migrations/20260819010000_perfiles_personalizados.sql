-- ============================================================
-- MIGRACIÓN: ERP-ADM-01 — Perfiles personalizados
-- ------------------------------------------------------------
-- Tabla de permisos por-usuario-y-sección para el rol 'personalizado'
-- (agregado en 20260819000000_personalizado_rol.sql). Los 4 roles fijos
-- (admin, vendedor, logistica, jefe_produccion) no consultan esta tabla —
-- siguen usando sus checks de rol estáticos existentes sin cambio alguno.
--
-- Alcance deliberado (decisión de producto): el enforcement granular vive en
-- la capa de aplicación (guards de servidor + UI), NO en RLS de las ~205
-- políticas existentes. Como 'personalizado' nunca aparece en esos arrays de
-- rol, un usuario con este rol ya queda sin acceso RLS a cualquier tabla por
-- defecto — es un "deny by default" gratuito. Las escrituras que sí se
-- habiliten para 'personalizado' deben enrutarse por funciones SECURITY
-- DEFINER (fn_despachar_ruta, fn_registrar_conteo, etc.), no por escritura
-- directa a tabla desde el cliente.
-- ============================================================

CREATE TYPE app_seccion AS ENUM (
  'ventas', 'catalogo', 'clientes',
  'comisiones', 'aliados',
  'logistica_tablero', 'logistica_rutas', 'logistica_mensajeros', 'logistica_liquidacion',
  'inventario_dashboard', 'inventario_explosion', 'inventario_ingresos', 'inventario_insumos',
  'inventario_recetas', 'inventario_produccion', 'inventario_productos', 'inventario_remisiones',
  'inventario_conteo',
  'admin'
);

CREATE TABLE user_permisos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seccion      app_seccion NOT NULL,
  puede_ver    BOOLEAN NOT NULL DEFAULT false,
  puede_editar BOOLEAN NOT NULL DEFAULT false,
  updated_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, seccion),
  CHECK (puede_editar = false OR puede_ver = true)
);

CREATE INDEX idx_user_permisos_user_id ON user_permisos(user_id);

ALTER TABLE user_permisos ENABLE ROW LEVEL SECURITY;

-- El propio usuario lee sus permisos (usado por /api/me/permisos para armar
-- el sidebar y los guards en el cliente); admin lee y escribe todo.
CREATE POLICY "user_permisos_select_own_or_admin" ON user_permisos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR fn_get_user_role() = 'admin'::user_role);

CREATE POLICY "user_permisos_write_admin" ON user_permisos
  FOR ALL TO authenticated
  USING (fn_get_user_role() = 'admin'::user_role)
  WITH CHECK (fn_get_user_role() = 'admin'::user_role);
