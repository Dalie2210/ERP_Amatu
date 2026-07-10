import { describe, it, expect } from "vitest"
import { getPeriodoMes } from "./commissions"

// Regla 25-a-25: fechas en/después del día 25 pertenecen al período del MES
// SIGUIENTE. Se usa mediodía para evitar cruces de día por zona horaria.
describe("getPeriodoMes", () => {
  it("antes del 25 → mes actual", () => {
    expect(getPeriodoMes(new Date("2026-07-10T12:00:00-05:00"))).toBe("2026-07")
  })

  it("el día 24 sigue siendo el mes actual", () => {
    expect(getPeriodoMes(new Date("2026-07-24T12:00:00-05:00"))).toBe("2026-07")
  })

  it("el día 25 pasa al mes siguiente", () => {
    expect(getPeriodoMes(new Date("2026-07-25T12:00:00-05:00"))).toBe("2026-08")
  })

  it("cruza de año en diciembre", () => {
    expect(getPeriodoMes(new Date("2026-12-26T12:00:00-05:00"))).toBe("2027-01")
  })
})
