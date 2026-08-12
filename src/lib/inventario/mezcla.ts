// Lógica de las órdenes de mezcla.
//
// La producción se calibra en porciones estándar de 1.200 g (múltiplo común de
// las presentaciones 1200/500/300). Por dieta se suman los gramos requeridos y
// se dividen entre 1.200 para obtener el nº de mezclas. El redondeo a múltiplo
// de 12 y la división en lotes de ≤58–60 kg (capacidad de la mezcladora) los
// hace la persona manualmente; aquí solo calculamos el número sugerido.

import type { DesglosePresentacion } from "@/types";

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

/**
 * Sugiere el desglose de unidades por presentación (300/500/1200g) de una
 * dieta a partir del mix planificado (de los ítems de la orden) y el nº de
 * mezclas final. Escala el mix planificado proporcionalmente al nuevo total
 * (num_mezclas × porcion_estandar) y redondea al entero más cercano por
 * presentación — el redondeo puede dejar un pequeño sobrante/faltante en kg
 * frente al total exacto, que se muestra aparte (ver `sumaKgDesglose`).
 * Si num_mezclas es null, no hay nada que escalar: usa el mix planificado tal cual.
 */
export function sugerirDesglose(
  porciones: { presentacion: string; cantidad: number }[],
  numMezclas: number | null,
  porcionEstandar: number = PORCION_ESTANDAR_G
): DesglosePresentacion[] {
  const conGramaje = porciones.map((p) => ({ ...p, gramaje: parseGramaje(p.presentacion) }));
  const totalPlanificado = conGramaje.reduce((acc, p) => acc + p.cantidad * p.gramaje, 0);
  const targetGramos = numMezclas != null ? numMezclas * porcionEstandar : totalPlanificado;
  const factor = totalPlanificado > 0 ? targetGramos / totalPlanificado : 1;

  return conGramaje.map((p) => ({
    presentacion: p.presentacion,
    gramaje: p.gramaje,
    unidades_planificadas: p.cantidad,
    unidades: Math.round(p.cantidad * factor),
  }));
}

/** Suma en kg de un desglose (unidades × gramaje de cada presentación). */
export function sumaKgDesglose(desglose: DesglosePresentacion[]): number {
  return desglose.reduce((acc, d) => acc + d.unidades * d.gramaje, 0) / 1000;
}
