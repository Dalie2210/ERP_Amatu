// Lógica de las órdenes de mezcla.
//
// La producción se calibra en porciones estándar de 1.200 g (múltiplo común de
// las presentaciones 1200/500/300). Por dieta se suman los gramos requeridos y
// se dividen entre 1.200 para obtener el nº de mezclas. El redondeo a múltiplo
// de 12 y la división en lotes de ≤58–60 kg (capacidad de la mezcladora) los
// hace la persona manualmente; aquí solo calculamos el número sugerido.

export const PORCION_ESTANDAR_G = 1200;

/**
 * Extrae los gramos de una presentación de texto libre ("1200g" → 1200,
 * "500 g" → 500). Devuelve 0 si no hay número parseable (p. ej. "Única").
 */
export function parseGramaje(presentacion: string | null | undefined): number {
  if (!presentacion) return 0;
  const limpio = presentacion.replace(/[^0-9.]/g, "");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Formatea gramos como "1,2 kg" o "850 g" para lectura rápida. */
export function formatGramaje(gramos: number | null | undefined): string {
  if (gramos == null) return "—";
  if (gramos >= 1000) {
    return `${(gramos / 1000).toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg`;
  }
  return `${gramos.toLocaleString("es-CO", { maximumFractionDigits: 0 })} g`;
}
