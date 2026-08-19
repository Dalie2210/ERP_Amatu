import { describe, it, expect } from "vitest"
import {
  crudoDesdeCocido,
  factorConversion,
  porcionesBase,
  cocidoRequerido,
  cadenaFirmaReceta,
  FIRMA_DECIMALES,
} from "./receta"

describe("crudoDesdeCocido", () => {
  it("es la identidad sin merma ni cambio de rendimiento", () => {
    expect(crudoDesdeCocido(500, { merma_pct: 0, rendimiento_pct: 100 })).toBe(500)
  })

  it("aplica rendimiento y merma en ese orden", () => {
    // 500 / 0,70 / 0,95
    const r = crudoDesdeCocido(500, { merma_pct: 5, rendimiento_pct: 70 })
    expect(r).toBeCloseTo(751.879699, 6)
  })

  it("un insumo que gana masa al cocinar requiere menos crudo", () => {
    // lentejas: duplican peso → 1000 cocido = 500 crudo
    expect(crudoDesdeCocido(1000, { merma_pct: 0, rendimiento_pct: 200 })).toBe(500)
  })

  it("devuelve null con rendimiento_pct = 0 (división por cero)", () => {
    expect(crudoDesdeCocido(500, { merma_pct: 0, rendimiento_pct: 0 })).toBeNull()
  })

  it("devuelve null con merma_pct = 100 (factor cero)", () => {
    expect(crudoDesdeCocido(500, { merma_pct: 100, rendimiento_pct: 100 })).toBeNull()
  })

  it("devuelve null con merma_pct > 100 en vez de un crudo negativo", () => {
    expect(crudoDesdeCocido(500, { merma_pct: 120, rendimiento_pct: 100 })).toBeNull()
  })

  // Vector fijo que documenta la paridad con fn_crudo_desde_cocido en SQL.
  // Si esta tabla cambia, la migración 20260820000000 debe cambiar con ella.
  it("coincide con el vector de referencia del helper SQL", () => {
    const casos: [number, number, number, number | null][] = [
      // cocido, rendimiento_pct, merma_pct, crudo esperado
      [1000, 100, 0, 1000],
      [1000, 100, 20, 1250],
      [1000, 80, 0, 1250],
      [1000, 80, 20, 1562.5],
      [1000, 200, 10, 555.5555555555556],
      [1000, 0, 0, null],
      [1000, 100, 100, null],
    ]
    for (const [cocido, rendimiento_pct, merma_pct, esperado] of casos) {
      const r = crudoDesdeCocido(cocido, { merma_pct, rendimiento_pct })
      if (esperado === null) expect(r).toBeNull()
      else expect(r).toBeCloseTo(esperado, 9)
    }
  })
})

describe("factorConversion", () => {
  it("es el crudo necesario por unidad de cocido", () => {
    expect(factorConversion({ merma_pct: 20, rendimiento_pct: 100 })).toBeCloseTo(1.25, 9)
    expect(factorConversion({ merma_pct: 0, rendimiento_pct: 200 })).toBe(0.5)
  })
})

describe("porcionesBase", () => {
  const base1200 = { baseGramos: 1200, baseModo: "gramos" as const }

  it("una unidad de 1200 g es exactamente una porción base", () => {
    expect(porcionesBase({ cantidad: 1, gramajeG: 1200, ...base1200 })).toBe(1)
  })

  it("deriva las presentaciones pequeñas desde la base, sin receta propia", () => {
    // La promesa de ERP-PROD-09: 500 g y 300 g salen de la base de 1200 g.
    expect(porcionesBase({ cantidad: 1, gramajeG: 500, ...base1200 })).toBeCloseTo(5 / 12, 12)
    expect(porcionesBase({ cantidad: 1, gramajeG: 300, ...base1200 })).toBe(0.25)
  })

  it("escala linealmente con la cantidad", () => {
    expect(porcionesBase({ cantidad: 24, gramajeG: 500, ...base1200 })).toBe(10)
  })

  it("con base_modo 'unidades' ignora el gramaje (semántica legada)", () => {
    const r = porcionesBase({
      cantidad: 20,
      gramajeG: 500,
      baseGramos: 10,
      baseModo: "unidades",
    })
    expect(r).toBe(2)
  })

  it("cae al cálculo legado cuando falta el gramaje de la variante", () => {
    const r = porcionesBase({
      cantidad: 20,
      gramajeG: null,
      baseGramos: 1200,
      baseModo: "gramos",
      rendimiento: 10,
    })
    expect(r).toBe(2)
  })

  it("devuelve null cuando no hay ninguna base utilizable", () => {
    expect(
      porcionesBase({ cantidad: 20, gramajeG: null, baseGramos: 1200, baseModo: "gramos" })
    ).toBeNull()
  })
})

describe("cocidoRequerido", () => {
  it("el requerimiento total es lineal en las porciones", () => {
    // La garantía que ERP-PROD-08 necesita para que el resumen de receta
    // coincida exactamente con la receta base cargada.
    const porUna = cocidoRequerido(350, 1)
    expect(cocidoRequerido(350, 40)).toBeCloseTo(40 * porUna, 9)
  })
})

describe("cadenaFirmaReceta", () => {
  const items = [
    { insumo_id: "b-res", cantidad: 700 },
    { insumo_id: "a-arroz", cantidad: 300 },
    { insumo_id: "c-zanahoria", cantidad: 200 },
  ]

  it("no depende del orden de carga de los ingredientes", () => {
    const a = cadenaFirmaReceta(items, 1200)
    const b = cadenaFirmaReceta([...items].reverse(), 1200)
    expect(a).toBe(b)
  })

  it("absorbe el ruido de redondeo de la reescala a base 1200", () => {
    const conRuido = items.map((it) => ({ ...it, cantidad: it.cantidad + 0.04 }))
    expect(cadenaFirmaReceta(conRuido, 1200)).toBe(cadenaFirmaReceta(items, 1200))
  })

  it("distingue recetas con una diferencia real de ingrediente", () => {
    const distinta = items.map((it) =>
      it.insumo_id === "b-res" ? { ...it, cantidad: 705 } : it
    )
    expect(cadenaFirmaReceta(distinta, 1200)).not.toBe(cadenaFirmaReceta(items, 1200))
  })

  it("distingue recetas con distinta base", () => {
    expect(cadenaFirmaReceta(items, 1200)).not.toBe(cadenaFirmaReceta(items, 600))
  })

  it("redondea a FIRMA_DECIMALES decimales de gramo", () => {
    const firma = cadenaFirmaReceta([{ insumo_id: "x", cantidad: 12.3456 }], 1200)
    expect(firma).toBe(`gramos#1200|x:${(12.3456).toFixed(FIRMA_DECIMALES)}`)
  })
})
