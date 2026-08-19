// Lógica pura de recetas: conversión crudo↔cocido y base de la receta.
//
// La fórmula unificada del proyecto es
//     crudo = cocido / (rendimiento_pct/100) / (1 - merma_pct/100)
// donde `merma_pct` modela pérdida de masa (limpieza/trim) y `rendimiento_pct`
// modela el cambio de masa al cocinar (100 = sin cambio, 200 = el peso se
// duplica, p. ej. lentejas que absorben agua).
//
// Este archivo es el gemelo TypeScript de las funciones SQL del mismo nombre
// (fn_crudo_desde_cocido, fn_porciones_base). Ambas caras deben dar el mismo
// número: `receta.test.ts` fija el vector de valores que lo documenta.

/**
 * Decimales de gramo a los que se redondea cada cantidad al construir la firma
 * de una receta. Sobre una base normalizada de 1.200 g, 0,1 g es ~0,01 % en
 * ingredientes de decenas/cientos de gramos: absorbe el ruido de coma flotante
 * de la reescala a base 1200 sin llegar a fusionar recetas realmente distintas.
 */
export const FIRMA_DECIMALES = 1;

/** Tolerancia por defecto (g) al decidir si un total cuadra a un múltiplo. */
export const TOLERANCIA_G = 1;

export interface FactoresInsumo {
  merma_pct: number;
  rendimiento_pct: number;
}

/**
 * Convierte una cantidad en peso cocido a su equivalente en crudo.
 * Devuelve `null` si los factores del insumo son inválidos (rendimiento ≤ 0 o
 * merma ≥ 100): con esos valores la fórmula divide por cero o cambia de signo,
 * y un `null` visible es preferible a un número silenciosamente absurdo.
 */
export function crudoDesdeCocido(
  cocido: number,
  insumo: FactoresInsumo
): number | null {
  if (!Number.isFinite(cocido)) return null;
  const factorRendimiento = insumo.rendimiento_pct / 100;
  const factorMerma = 1 - insumo.merma_pct / 100;
  if (factorRendimiento <= 0 || factorMerma <= 0) return null;
  return cocido / factorRendimiento / factorMerma;
}

/**
 * Factor crudo/cocido de un insumo (cuánto crudo hace falta por cada unidad de
 * cocido). Es el número que la hoja de proceso muestra como "factor de
 * conversión". `null` con factores inválidos, igual que `crudoDesdeCocido`.
 */
export function factorConversion(insumo: FactoresInsumo): number | null {
  return crudoDesdeCocido(1, insumo);
}

export type BaseModo = "gramos" | "unidades";

export interface ParamsPorcionesBase {
  /** Cantidad planificada del ítem (unidades de la presentación). */
  cantidad: number;
  /** Gramaje de la presentación en gramos (`producto_variantes.gramaje_g`). */
  gramajeG: number | null;
  /** `recetas.base_gramos`: la base sobre la que están expresados los items. */
  baseGramos: number | null;
  /** `recetas.base_modo`. */
  baseModo: BaseModo;
  /** `recetas.rendimiento` legado, usado como respaldo. */
  rendimiento?: number | null;
}

/**
 * Cuántas veces cabe la base de la receta en lo que se va a producir — el
 * multiplicador que escala cada `receta_items.cantidad`.
 *
 * Con `base_modo = 'gramos'` la receta está expresada por N gramos de masa
 * (tras ERP-PROD-09, N = 1200), así que las porciones salen de los gramos
 * totales: `cantidad × gramaje / base_gramos`. Con `base_modo = 'unidades'` la
 * receta conserva la semántica legada (unidades de PT por corrida) y el gramaje
 * no interviene.
 *
 * Si el gramaje falta (variante sin `gramaje_g` resoluble) se cae al cálculo
 * legado `cantidad / rendimiento` en vez de fallar: es preferible seguir dando
 * el número de siempre a bloquear una orden por un dato de catálogo incompleto.
 * Devuelve `null` cuando no hay ninguna base utilizable.
 */
export function porcionesBase({
  cantidad,
  gramajeG,
  baseGramos,
  baseModo,
  rendimiento,
}: ParamsPorcionesBase): number | null {
  if (!Number.isFinite(cantidad)) return null;

  if (baseModo === "unidades") {
    const base = baseGramos ?? rendimiento ?? null;
    if (base == null || base <= 0) return null;
    return cantidad / base;
  }

  if (gramajeG != null && gramajeG > 0 && baseGramos != null && baseGramos > 0) {
    return (cantidad * gramajeG) / baseGramos;
  }

  // Respaldo legado: la receta vieja ya venía escalada por unidades de PT.
  if (rendimiento != null && rendimiento > 0) return cantidad / rendimiento;
  return null;
}

/**
 * Cantidad de insumo en peso cocido para un número dado de porciones base.
 * `cantidadReceta` es `receta_items.cantidad` (por porción base).
 */
export function cocidoRequerido(cantidadReceta: number, porciones: number): number {
  return cantidadReceta * porciones;
}

export interface ItemFirma {
  insumo_id: string;
  cantidad: number;
}

/**
 * Cadena canónica que identifica el contenido de una receta, para detectar
 * dietas que comparten fórmula y pueden mezclarse juntas (ERP-PROD-05).
 *
 * Es determinista: ordena por `insumo_id` y redondea a `FIRMA_DECIMALES`, de
 * modo que el orden de carga de los ingredientes y el ruido de coma flotante no
 * cambian el resultado. En la base de datos, `recetas.firma` guarda el `md5` de
 * esta misma cadena (`fn_calcular_firma_receta`); aquí se devuelve el texto sin
 * hashear porque comparar cadenas no necesita crypto y hace los tests legibles.
 */
export function cadenaFirmaReceta(
  items: ItemFirma[],
  baseGramos: number,
  baseModo: BaseModo = "gramos"
): string {
  const cuerpo = [...items]
    .sort((a, b) => (a.insumo_id < b.insumo_id ? -1 : a.insumo_id > b.insumo_id ? 1 : 0))
    .map((it) => `${it.insumo_id}:${it.cantidad.toFixed(FIRMA_DECIMALES)}`)
    .join("|");
  return `${baseModo}#${Math.round(baseGramos)}|${cuerpo}`;
}
