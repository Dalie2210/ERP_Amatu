-- ============================================================================
-- Eliminar integración Kommo (fuera de alcance por ahora)
-- ----------------------------------------------------------------------------
-- Las columnas kommo_* nunca se poblaron y la integración se retiró del código.
-- Se eliminan para dejar el esquema limpio; pueden re-agregarse si vuelve el
-- alcance de CRM/WhatsApp.
-- ============================================================================

ALTER TABLE public.clientes DROP COLUMN IF EXISTS kommo_contact_id;
ALTER TABLE public.pedidos  DROP COLUMN IF EXISTS kommo_lead_id;
