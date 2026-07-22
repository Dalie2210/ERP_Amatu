-- ============================================================================
-- Selección múltiple de mascotas por pedido.
-- ----------------------------------------------------------------------------
-- pedidos.mascota_id era una FK escalar (1 pedido = 1 mascota). Se reemplaza
-- por una tabla puente pedido_mascotas (N mascotas por pedido), ya que
-- detalle_pedido no tiene mascota_id (la mascota es un dato del pedido
-- completo, no por línea de producto).
-- ============================================================================

BEGIN;

CREATE TABLE public.pedido_mascotas (
  pedido_id  uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  mascota_id uuid NOT NULL REFERENCES public.mascotas(id),
  PRIMARY KEY (pedido_id, mascota_id)
);

CREATE INDEX idx_pedido_mascotas_mascota_id ON public.pedido_mascotas (mascota_id);

-- Backfill de la relación existente antes de retirar la columna vieja.
INSERT INTO public.pedido_mascotas (pedido_id, mascota_id)
SELECT id, mascota_id FROM public.pedidos WHERE mascota_id IS NOT NULL;

ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_mascota_id_fkey;
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS mascota_id;

-- ----------------------------------------------------------------------------
-- RLS — mismo patrón que detalle_pedido: visible/insertable si el pedido
-- padre es visible/propio para el usuario.
-- ----------------------------------------------------------------------------
ALTER TABLE public.pedido_mascotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY pedido_mascotas_select_auth ON public.pedido_mascotas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_mascotas.pedido_id
        AND (
          (fn_get_user_role() = ANY (ARRAY['admin'::user_role, 'contable'::user_role]))
          OR ((fn_get_user_role() = 'logistica'::user_role) AND (p.estado_pago = 'confirmado'::estado_pago))
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    )
  );

CREATE POLICY pedido_mascotas_insert_ventas ON public.pedido_mascotas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_mascotas.pedido_id
        AND (
          (fn_get_user_role() = 'admin'::user_role)
          OR ((fn_get_user_role() = 'vendedor'::user_role) AND (p.vendedor_id = (SELECT auth.uid())))
        )
    )
  );

COMMIT;
