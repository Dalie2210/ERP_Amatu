-- ============================================================
-- MIGRACIÓN: Desglose de presentaciones editable en la hoja de mezcla
--
-- Contexto: MezclaPanel mostraba las presentaciones (300/500/1200g) de cada
-- dieta como badges de solo lectura, calculados de cantidad_planificada. Al
-- ajustar el "Nº de mezclas (final)" ese desglose no cambiaba, dejando al
-- equipo de producción sin saber cuántas unidades de cada presentación
-- empacar con el número real de mezclas.
--
-- Esta migración agrega orden_mezcla.desglose_presentaciones (JSONB): snapshot
-- editable de [{ presentacion, gramaje, unidades_planificadas, unidades }] por
-- dieta. El frontend lo sugiere automáticamente (escalado proporcional al
-- mix planificado) cada vez que cambia el nº de mezclas final, y el usuario
-- puede sobreescribir las unidades por presentación a mano antes de guardar.
-- ============================================================

ALTER TABLE orden_mezcla
  ADD COLUMN desglose_presentaciones JSONB;

COMMENT ON COLUMN orden_mezcla.desglose_presentaciones IS
  'Snapshot editable de unidades por presentación para esta dieta: [{presentacion, gramaje, unidades_planificadas, unidades}]. Se re-sugiere (escalado proporcional) al cambiar num_mezclas; el equipo de producción puede ajustar unidades a mano.';
