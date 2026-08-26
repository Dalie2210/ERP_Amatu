import { describe, it, expect } from "vitest"
import {
  planMezclas,
  sugerirAjuste,
  evaluarFusiones,
  parseGramaje,
  type ParamsPlanBase,
} from "./mezcla"

// Mezcladora de referencia: porción de 1.200 g, entre 7,2 kg y 58 kg,
// 45 min por corrida. En porciones: pmin = 6, pmax = 48.
const MEZCLADORA: ParamsPlanBase = {
  porcionG: 1200,
  minG: 7200,
  maxG: 58000,
  duracionMezclaMin: 45,
  toleranciaG: 1,
}

describe("planMezclas", () => {
  it("reparte en el menor número de mezclas posible", () => {
    // 147,6 kg = 123 porciones. Con techo de 48 hacen falta 3 mezclas.
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 147_600 })
    expect(p.factible).toBe(true)
    expect(p.porcionesTotales).toBe(123)
    expect(p.numMezclas).toBe(3)
    expect(p.mezclas.map((m) => m.porciones)).toEqual([41, 41, 41])
    expect(p.ajusteG).toBe(0)
    expect(p.tiempoEstimadoMin).toBe(135)
  })

  it("permite mezclas desiguales para no desperdiciar nada", () => {
    // 122 porciones no se divide exacto en 3: 41/41/40 suma exactamente 122.
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 146_400 })
    expect(p.numMezclas).toBe(3)
    expect(p.mezclas.map((m) => m.porciones)).toEqual([41, 41, 40])
    expect(p.mezclas.map((m) => m.gramos)).toEqual([49_200, 49_200, 48_000])
  })

  it("cada mezcla es múltiplo exacto de la porción estándar", () => {
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 146_400 })
    for (const m of p.mezclas) expect(m.gramos % MEZCLADORA.porcionG).toBe(0)
  })

  it("una sola mezcla cuando el total cabe en el tambor", () => {
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 48 * 1200 })
    expect(p.numMezclas).toBe(1)
    expect(p.mezclas[0].porciones).toBe(48)
  })

  it("reporta el faltante cuando no se llega al mínimo", () => {
    // 4,8 kg = 4 porciones; el mínimo son 6.
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 4_800 })
    expect(p.factible).toBe(false)
    expect(p.motivo).toBe("menor_al_minimo")
    expect(p.porcionesFaltantes).toBe(2)
  })

  it("concentra el residuo en ajusteG, sin repartirlo entre las mezclas", () => {
    // 146.900 g no es múltiplo de 1200: 122 porciones = 146.400 → sobran 500 g.
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 146_900 })
    expect(p.porcionesTotales).toBe(122)
    expect(p.ajusteG).toBe(-500)
    const suma = p.mezclas.reduce((a, m) => a + m.gramos, 0)
    expect(suma).toBe(122 * 1200)
  })

  it("redondea hacia arriba solo dentro de la tolerancia", () => {
    // 1 g por debajo de 123 porciones exactas: entra en la tolerancia.
    const dentro = planMezclas({ ...MEZCLADORA, totalGramos: 147_599 })
    expect(dentro.porcionesTotales).toBe(123)
    expect(dentro.ajusteG).toBe(1)

    // Fuera de tolerancia trunca: nunca se inventa producto.
    const fuera = planMezclas({ ...MEZCLADORA, totalGramos: 147_500 })
    expect(fuera.porcionesTotales).toBe(122)
    expect(fuera.ajusteG).toBe(-1100)
  })

  it("rechaza límites imposibles en vez de devolver un plan inválido", () => {
    const p = planMezclas({ ...MEZCLADORA, minG: 50_000, maxG: 10_000, totalGramos: 60_000 })
    expect(p.factible).toBe(false)
    expect(p.motivo).toBe("limites_invalidos")
  })

  it("sin producto no hay plan", () => {
    const p = planMezclas({ ...MEZCLADORA, totalGramos: 0 })
    expect(p.factible).toBe(false)
    expect(p.motivo).toBe("sin_producto")
  })

  // Generador determinista (LCG con semilla fija): sin dependencias externas y
  // reproducible, para poder investigar un fallo concreto.
  function* totalesPseudoaleatorios(n: number) {
    let s = 20260819
    for (let i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) % 2147483648
      yield (s % 200) * 1200 // 0 .. 238.800 g, en porciones exactas
    }
  }

  it("invariantes sobre 200 totales: suma exacta, límites y minimalidad", () => {
    const pmin = Math.ceil(MEZCLADORA.minG / MEZCLADORA.porcionG)
    const pmax = Math.floor(MEZCLADORA.maxG / MEZCLADORA.porcionG)

    for (const total of totalesPseudoaleatorios(200)) {
      const p = planMezclas({ ...MEZCLADORA, totalGramos: total })
      if (!p.factible) continue

      const suma = p.mezclas.reduce((a, m) => a + m.porciones, 0)
      expect(suma).toBe(p.porcionesTotales)
      expect(p.mezclas).toHaveLength(p.numMezclas)

      for (const m of p.mezclas) {
        expect(m.porciones).toBeGreaterThanOrEqual(pmin)
        expect(m.porciones).toBeLessThanOrEqual(pmax)
      }

      // Minimalidad: con una mezcla menos el reparto sería imposible.
      const kMenos = p.numMezclas - 1
      if (kMenos >= 1) {
        const cabe = kMenos * pmin <= p.porcionesTotales && p.porcionesTotales <= kMenos * pmax
        expect(cabe).toBe(false)
      }
    }
  })
})

describe("sugerirAjuste", () => {
  const PRESENTACIONES = [
    { presentacion: "1200g", gramajeG: 1200 },
    { presentacion: "500g", gramajeG: 500 },
    { presentacion: "300g", gramajeG: 300 },
  ]

  it("resuelve el caso del negocio: 1.900 g = 2×500 + 3×300", () => {
    const [mejor] = sugerirAjuste({ ajusteG: 1900, presentaciones: PRESENTACIONES })
    expect(mejor.direccion).toBe("agregar")
    expect(mejor.sobraG).toBe(0)
    expect(mejor.totalG).toBe(1900)
    const porGramaje = Object.fromEntries(mejor.unidades.map((u) => [u.gramajeG, u.n]))
    expect(porGramaje).toEqual({ 500: 2, 300: 3 })
  })

  it("prefiere pocas piezas grandes cuando hay varias combinaciones exactas", () => {
    // 1200 se puede lograr con 1×1200, o con 4×300, o 300+300+... 1×1200 gana.
    const [mejor] = sugerirAjuste({ ajusteG: 1200, presentaciones: PRESENTACIONES })
    expect(mejor.unidades).toEqual([{ presentacion: "1200g", gramajeG: 1200, n: 1 }])
  })

  it("cuando no hay combinación exacta ofrece la más cercana", () => {
    // Con 300/500/1200 (mcd 100) no se puede sumar 100 g exactos.
    const [mejor] = sugerirAjuste({ ajusteG: 100, presentaciones: PRESENTACIONES })
    expect(mejor.sobraG).not.toBe(0)
    expect(Math.abs(mejor.sobraG)).toBe(200) // el alcanzable más próximo es 300
    expect(mejor.totalG).toBe(300)
  })

  it("al quitar respeta lo que hay planificado", () => {
    // Se necesitan quitar 900 g, pero solo hay 1 unidad de 300 g planificada:
    // 3×300 sería imposible, así que no puede aparecer.
    const sugerencias = sugerirAjuste({
      ajusteG: -900,
      presentaciones: [
        { presentacion: "500g", gramajeG: 500, maxUnidades: 4 },
        { presentacion: "300g", gramajeG: 300, maxUnidades: 1 },
      ],
    })
    expect(sugerencias.length).toBeGreaterThan(0)
    expect(sugerencias[0].direccion).toBe("quitar")
    for (const s of sugerencias) {
      const trescientos = s.unidades.find((u) => u.gramajeG === 300)
      expect(trescientos?.n ?? 0).toBeLessThanOrEqual(1)
    }
  })

  it("ignora presentaciones sin stock que quitar", () => {
    const sugerencias = sugerirAjuste({
      ajusteG: -1000,
      presentaciones: [{ presentacion: "500g", gramajeG: 500, maxUnidades: 0 }],
    })
    expect(sugerencias).toEqual([])
  })

  it("sin residuo no sugiere nada", () => {
    expect(sugerirAjuste({ ajusteG: 0, presentaciones: PRESENTACIONES })).toEqual([])
  })

  it("es determinista entre llamadas idénticas", () => {
    const a = sugerirAjuste({ ajusteG: 1900, presentaciones: PRESENTACIONES })
    const b = sugerirAjuste({ ajusteG: 1900, presentaciones: PRESENTACIONES })
    expect(a).toEqual(b)
  })

  it("el texto es legible para planta", () => {
    const [mejor] = sugerirAjuste({ ajusteG: 1900, presentaciones: PRESENTACIONES })
    expect(mejor.texto).toBe("2 × 500 g + 3 × 300 g")
  })
})

describe("evaluarFusiones", () => {
  it("propone combinar dos dietas que no alcanzan el mínimo por separado", () => {
    // 4 y 4 porciones: ninguna llega a 6, pero juntas son 8.
    const [ev] = evaluarFusiones(
      [
        { productoId: "mid-power-res", totalGramos: 4_800, firma: "abc" },
        { productoId: "ternera", totalGramos: 4_800, firma: "abc" },
      ],
      MEZCLADORA
    )
    expect(ev.conviene).toBe(true)
    expect(ev.planFusionado.factible).toBe(true)
    expect(ev.planFusionado.numMezclas).toBe(1)
    expect(ev.productoIds).toEqual(["mid-power-res", "ternera"])
  })

  it("propone combinar cuando ahorra mezclas sin empeorar el desperdicio", () => {
    // 30 + 30 porciones: por separado son 2 mezclas; juntas 60 porciones no
    // caben en una (techo 48), así que siguen siendo 2 → no conviene.
    const [sinAhorro] = evaluarFusiones(
      [
        { productoId: "a", totalGramos: 36_000, firma: "x" },
        { productoId: "b", totalGramos: 36_000, firma: "x" },
      ],
      MEZCLADORA
    )
    expect(sinAhorro.mezclasAhorradas).toBe(0)
    expect(sinAhorro.conviene).toBe(false)

    // 20 + 20 porciones: 2 mezclas por separado, 1 juntas.
    const [conAhorro] = evaluarFusiones(
      [
        { productoId: "a", totalGramos: 24_000, firma: "y" },
        { productoId: "b", totalGramos: 24_000, firma: "y" },
      ],
      MEZCLADORA
    )
    expect(conAhorro.mezclasAhorradas).toBe(1)
    expect(conAhorro.conviene).toBe(true)
    expect(conAhorro.motivo).toContain("45 min")
  })

  it("no agrupa dietas con recetas distintas", () => {
    const evs = evaluarFusiones(
      [
        { productoId: "a", totalGramos: 4_800, firma: "abc" },
        { productoId: "b", totalGramos: 4_800, firma: "def" },
      ],
      MEZCLADORA
    )
    expect(evs).toEqual([])
  })

  it("ignora dietas sin receta resuelta", () => {
    const evs = evaluarFusiones(
      [
        { productoId: "a", totalGramos: 4_800, firma: null },
        { productoId: "b", totalGramos: 4_800, firma: null },
      ],
      MEZCLADORA
    )
    expect(evs).toEqual([])
  })
})

describe("parseGramaje", () => {
  it("sigue sirviendo de respaldo para presentaciones sin gramaje numérico", () => {
    expect(parseGramaje("1200g")).toBe(1200)
    expect(parseGramaje("500 g")).toBe(500)
    expect(parseGramaje("Única")).toBe(0)
  })
})
