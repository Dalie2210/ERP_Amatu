// Lógica de las órdenes de mezcla.
//
// La producción se calibra en porciones estándar de 1.200 g (múltiplo común de
// las presentaciones 1200/500/300). Por dieta se suman los gramos requeridos y
// se dividen entre la porción estándar para obtener el nº de mezclas.
//
// `planMezclas` resuelve la división en mezclas físicas (ERP-PROD-04) y
// `sugerirAjuste` propone cómo cuadrar el residuo (ERP-PROD-06). Los límites de
// tamaño de mezcla NO se deciden aquí: entran como parámetro desde
// `config_produccion`, porque dependen del equipo físico de la planta.

import type { DesglosePresentacion } from "@/types";

/**
 * Porción estándar de producción, en gramos.
 *
 * Es un default de último recurso, no la verdad del sistema: la porción real
 * vive en `config_produccion.porcion_estandar_g` y se pasa como parámetro. Solo
 * se usa para inicializar formularios y como respaldo si la configuración aún
 * no ha cargado.
 */
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

// ============================================================
// ERP-PROD-04 — División de una dieta en mezclas físicas
// ============================================================

export interface ParamsPlanBase {
  /** Porción estándar en gramos (`config_produccion.porcion_estandar_g`). */
  porcionG: number;
  /** Mínimo de mezcla en gramos. */
  minG: number;
  /** Máximo de mezcla en gramos (capacidad del tambor). */
  maxG: number;
  /** Minutos por mezcla; solo se usa para estimar el costo operativo. */
  duracionMezclaMin?: number;
  /** Residuo tolerado al redondear el total a porciones enteras. */
  toleranciaG?: number;
}

export interface ParamsPlan extends ParamsPlanBase {
  totalGramos: number;
}

export interface MezclaPlan {
  porciones: number;
  gramos: number;
}

export type MotivoPlanInfactible =
  | "menor_al_minimo"
  | "sin_particion_factible"
  | "limites_invalidos"
  | "sin_producto";

export interface PlanMezclas {
  /** Total llevado a porciones enteras. */
  porcionesTotales: number;
  numMezclas: number;
  /** Tamaños de cada mezcla, de mayor a menor. Su suma es exactamente `porcionesTotales`. */
  mezclas: MezclaPlan[];
  factible: boolean;
  motivo?: MotivoPlanInfactible;
  /**
   * Gramos que faltan (+) o sobran (−) para que el total sea múltiplo exacto de
   * la porción. Es el único desperdicio del plan y la entrada de ERP-PROD-06.
   */
  ajusteG: number;
  /** Solo con motivo `menor_al_minimo`: cuántas porciones faltan para llegar. */
  porcionesFaltantes?: number;
  tiempoEstimadoMin: number;
}

function planInfactible(
  motivo: MotivoPlanInfactible,
  extra: Partial<PlanMezclas> = {}
): PlanMezclas {
  return {
    porcionesTotales: 0,
    numMezclas: 0,
    mezclas: [],
    factible: false,
    motivo,
    ajusteG: 0,
    tiempoEstimadoMin: 0,
    ...extra,
  };
}

/**
 * Divide el total requerido de una dieta en el menor número posible de mezclas
 * físicas, minimizando el desperdicio (ERP-PROD-04).
 *
 * Los dos objetivos del negocio son (a) usar pocas mezclas, porque cada una
 * cuesta ~45 min de planta, y (b) desperdiciar poco. Se resuelven por separado:
 *
 *  · El trabajo se hace en PORCIONES ENTERAS, no en gramos. Así cada mezcla es
 *    múltiplo exacto de la porción por construcción, sin depender de que no se
 *    acumule error de coma flotante.
 *  · Las mezclas NO tienen que ser iguales entre sí: repartir 122 porciones en
 *    41/41/40 desperdicia cero, mientras que exigirlas iguales obligaría a
 *    redondear. El reparto `base` / `base+1` da desperdicio interno CERO
 *    siempre, así que todo el residuo queda concentrado en `ajusteG` — que es
 *    justo lo que `sugerirAjuste` sabe corregir.
 */
export function planMezclas({
  totalGramos,
  porcionG,
  minG,
  maxG,
  duracionMezclaMin = 0,
  toleranciaG = 1,
}: ParamsPlan): PlanMezclas {
  if (!(porcionG > 0) || !(minG > 0) || !(maxG >= minG)) {
    return planInfactible("limites_invalidos");
  }

  // 1. Total a porciones enteras. Se redondea al más cercano solo si el residuo
  //    cabe en la tolerancia; si no, se trunca hacia abajo: es preferible
  //    planificar de menos a inventar producto que no existe.
  const pExacto = totalGramos / porcionG;
  const cercano = Math.round(pExacto);
  const porcionesTotales =
    Math.abs(pExacto - cercano) * porcionG <= toleranciaG ? cercano : Math.floor(pExacto);
  const ajusteG = porcionesTotales * porcionG - totalGramos;

  if (porcionesTotales <= 0) return planInfactible("sin_producto", { ajusteG });

  // 2. Límites expresados en porciones.
  const pmin = Math.ceil(minG / porcionG);
  const pmax = Math.floor(maxG / porcionG);
  if (pmax < 1) return planInfactible("limites_invalidos", { ajusteG });

  if (porcionesTotales < pmin) {
    return planInfactible("menor_al_minimo", {
      porcionesTotales,
      ajusteG,
      porcionesFaltantes: pmin - porcionesTotales,
    });
  }

  // 3. Menor k que admita un reparto válido. Arrancar en ceil(P/pmax) ya
  //    garantiza el techo; queda subir hasta que también se cumpla el piso.
  const kInicial = Math.max(1, Math.ceil(porcionesTotales / pmax));
  const kTope = Math.floor(porcionesTotales / pmin);
  let k = -1;
  for (let cand = kInicial; cand <= kTope; cand++) {
    if (cand * pmin <= porcionesTotales) {
      k = cand;
      break;
    }
  }
  if (k < 0) return planInfactible("sin_particion_factible", { porcionesTotales, ajusteG });

  // 4. Reparto lo más parejo posible: `rem` mezclas de base+1 y el resto de
  //    base. La suma es exactamente P, y ambos tamaños caen dentro de
  //    [pmin, pmax] como consecuencia de cómo se eligió k.
  const base = Math.floor(porcionesTotales / k);
  const rem = porcionesTotales % k;
  const mezclas: MezclaPlan[] = [];
  for (let i = 0; i < k; i++) {
    const porciones = i < rem ? base + 1 : base;
    mezclas.push({ porciones, gramos: porciones * porcionG });
  }

  return {
    porcionesTotales,
    numMezclas: k,
    mezclas,
    factible: true,
    ajusteG,
    tiempoEstimadoMin: k * duracionMezclaMin,
  };
}

// ============================================================
// ERP-PROD-06 — Cómo cuadrar el residuo a múltiplo de la porción
// ============================================================

export interface PresentacionAjuste {
  presentacion: string;
  gramajeG: number;
  /** Tope de unidades que se pueden mover; al quitar es lo ya planificado. */
  maxUnidades?: number;
}

export interface ParamsAjuste {
  /** Residuo firmado del plan: > 0 faltan gramos, < 0 sobran. */
  ajusteG: number;
  presentaciones: PresentacionAjuste[];
  maxSugerencias?: number;
}

export interface UnidadAjuste {
  presentacion: string;
  gramajeG: number;
  n: number;
}

export interface SugerenciaAjuste {
  direccion: "agregar" | "quitar";
  unidades: UnidadAjuste[];
  totalG: number;
  /** 0 = la combinación cuadra exacto; si no, cuánto queda sin cubrir. */
  sobraG: number;
  texto: string;
}

function mcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

interface EstadoAjuste {
  unidades: number;
  conteo: number[];
}

/** Orden determinista entre combinaciones que suman lo mismo. */
function comparaEstados(a: EstadoAjuste, b: EstadoAjuste): number {
  // A igual total de gramos, menos unidades implica piezas más grandes: se
  // manipula menos producto en planta.
  if (a.unidades !== b.unidades) return a.unidades - b.unidades;
  for (let i = 0; i < a.conteo.length; i++) {
    if (a.conteo[i] !== b.conteo[i]) return b.conteo[i] - a.conteo[i];
  }
  return 0;
}

/**
 * Propone cómo ajustar el peso de una mezcla para que cuadre a múltiplo exacto
 * de la porción estándar, combinando las presentaciones disponibles
 * (ERP-PROD-06). Ej.: ajustar 1.900 g → "2 × 500 g + 3 × 300 g".
 *
 * Es un problema de cambio de moneda acotado, resuelto con programación
 * dinámica sobre el máximo común divisor de los gramajes (con 300/500/1200 el
 * espacio de búsqueda se divide por 100). Se guardan las mejores combinaciones
 * por cada total alcanzable, y se ordenan primero por exactitud.
 *
 * Al QUITAR, `maxUnidades` debe traer lo que hay planificado de cada
 * presentación: sin ese tope se sugieren retiros imposibles.
 */
export function sugerirAjuste({
  ajusteG,
  presentaciones,
  maxSugerencias = 3,
}: ParamsAjuste): SugerenciaAjuste[] {
  const objetivo = Math.abs(ajusteG);
  if (objetivo === 0) return [];

  const direccion: "agregar" | "quitar" = ajusteG > 0 ? "agregar" : "quitar";

  const disponibles = presentaciones
    .filter((p) => p.gramajeG > 0 && (p.maxUnidades ?? Infinity) > 0)
    .sort((a, b) => b.gramajeG - a.gramajeG);
  if (disponibles.length === 0) return [];

  const g = disponibles.reduce((acc, p) => mcd(acc, p.gramajeG), 0);
  if (g <= 0) return [];

  const pesos = disponibles.map((p) => Math.round(p.gramajeG / g));
  const topes = disponibles.map((p) =>
    p.maxUnidades == null ? Infinity : Math.floor(p.maxUnidades)
  );

  // Se explora un poco más allá del objetivo para poder ofrecer la combinación
  // por encima cuando no existe ninguna exacta ni por debajo.
  const tObjetivo = objetivo / g;
  const tMax = Math.ceil(tObjetivo) + Math.max(...pesos);

  const K = Math.max(1, maxSugerencias);
  const ceros = disponibles.map(() => 0);
  let mejores: (EstadoAjuste[] | null)[] = new Array(tMax + 1).fill(null);
  mejores[0] = [{ unidades: 0, conteo: ceros }];

  for (let i = 0; i < disponibles.length; i++) {
    const w = pesos[i];
    const tope = topes[i];
    const siguiente: (EstadoAjuste[] | null)[] = mejores.map((e) => (e ? [...e] : null));

    for (let t = 0; t <= tMax; t++) {
      const estados = mejores[t];
      if (!estados) continue;
      for (let n = 1; n <= tope; n++) {
        const t2 = t + n * w;
        if (t2 > tMax) break;
        for (const est of estados) {
          const conteo = est.conteo.slice();
          conteo[i] += n;
          const cand: EstadoAjuste = { unidades: est.unidades + n, conteo };
          const lista = siguiente[t2] ?? [];
          if (lista.some((e) => e.conteo.every((c, idx) => c === conteo[idx]))) continue;
          lista.push(cand);
          lista.sort(comparaEstados);
          siguiente[t2] = lista.slice(0, K);
        }
      }
    }
    mejores = siguiente;
  }

  // Ranking final: primero exactitud, luego el orden interno ya calculado.
  const candidatos: { t: number; estado: EstadoAjuste; sobra: number }[] = [];
  for (let t = 1; t <= tMax; t++) {
    const estados = mejores[t];
    if (!estados) continue;
    for (const est of estados) candidatos.push({ t, estado: est, sobra: t * g - objetivo });
  }

  candidatos.sort((a, b) => {
    const da = Math.abs(a.sobra);
    const db = Math.abs(b.sobra);
    if (da !== db) return da - db;
    return comparaEstados(a.estado, b.estado);
  });

  return candidatos.slice(0, maxSugerencias).map(({ t, estado, sobra }) => {
    const unidades: UnidadAjuste[] = disponibles
      .map((p, i) => ({ presentacion: p.presentacion, gramajeG: p.gramajeG, n: estado.conteo[i] }))
      .filter((u) => u.n > 0);
    return {
      direccion,
      unidades,
      totalG: t * g,
      sobraG: sobra,
      texto: unidades.map((u) => `${u.n} × ${formatGramaje(u.gramajeG)}`).join(" + "),
    };
  });
}

// ============================================================
// ERP-PROD-05 — Fusión de dietas que comparten receta
// ============================================================

export interface CandidatoFusion {
  productoId: string;
  totalGramos: number;
  /** `recetas.firma`: dos dietas con la misma firma son la misma fórmula. */
  firma: string | null;
}

export interface EvaluacionFusion {
  firma: string;
  productoIds: string[];
  planIndividual: PlanMezclas[];
  planFusionado: PlanMezclas;
  /** Si el sistema debe proponer la fusión por sí solo. */
  conviene: boolean;
  motivo: string;
  mezclasAhorradas: number;
}

/**
 * Evalúa qué dietas de una orden comparten receta y conviene mezclar juntas
 * (ERP-PROD-05), en vez de hacer varias mezclas pequeñas por separado.
 *
 * Solo se propone la fusión cuando mejora de verdad: o ahorra mezclas sin
 * empeorar el desperdicio, o rescata una dieta que por sí sola no llega al
 * mínimo de la mezcladora. Nunca se agrupa en silencio: la decisión la confirma
 * una persona, porque el empaque sigue siendo por dieta.
 */
export function evaluarFusiones(
  candidatos: CandidatoFusion[],
  params: ParamsPlanBase
): EvaluacionFusion[] {
  const porFirma = new Map<string, CandidatoFusion[]>();
  for (const c of candidatos) {
    if (!c.firma) continue; // sin receta resuelta no hay forma de saber si comparten fórmula
    const lista = porFirma.get(c.firma) ?? [];
    lista.push(c);
    porFirma.set(c.firma, lista);
  }

  const resultado: EvaluacionFusion[] = [];

  for (const [firma, grupo] of porFirma) {
    if (grupo.length < 2) continue;

    const planIndividual = grupo.map((c) =>
      planMezclas({ ...params, totalGramos: c.totalGramos })
    );
    const totalGrupo = grupo.reduce((acc, c) => acc + c.totalGramos, 0);
    const planFusionado = planMezclas({ ...params, totalGramos: totalGrupo });

    const mezclasIndividuales = planIndividual.reduce((acc, p) => acc + p.numMezclas, 0);
    const ajusteIndividual = planIndividual.reduce((acc, p) => acc + Math.abs(p.ajusteG), 0);
    const mezclasAhorradas = mezclasIndividuales - planFusionado.numMezclas;

    const algunaNoAlcanza = planIndividual.some(
      (p) => !p.factible && p.motivo === "menor_al_minimo"
    );

    let conviene = false;
    let motivo: string;

    if (!planFusionado.factible) {
      motivo = "La suma tampoco cuadra en la mezcladora.";
    } else if (algunaNoAlcanza) {
      conviene = true;
      motivo = "Alguna dieta no llega al mínimo de la mezcladora por sí sola.";
    } else if (
      mezclasAhorradas > 0 &&
      Math.abs(planFusionado.ajusteG) <= ajusteIndividual
    ) {
      conviene = true;
      motivo = `Ahorra ${mezclasAhorradas} mezcla${mezclasAhorradas === 1 ? "" : "s"}${
        params.duracionMezclaMin
          ? ` (${mezclasAhorradas * params.duracionMezclaMin} min)`
          : ""
      }.`;
    } else if (mezclasAhorradas > 0) {
      motivo = "Ahorra mezclas pero aumenta el desperdicio: revísalo antes de combinar.";
    } else {
      motivo = "No reduce el número de mezclas.";
    }

    resultado.push({
      firma,
      productoIds: grupo.map((c) => c.productoId),
      planIndividual,
      planFusionado,
      conviene,
      motivo,
      mezclasAhorradas,
    });
  }

  return resultado;
}
