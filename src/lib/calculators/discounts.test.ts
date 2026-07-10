import { describe, it, expect } from "vitest"
import { calcularDescuentos } from "./discounts"
import type { ReglaDescuento } from "@/types"

// Reglas de ejemplo: 10% + $7.000 de envío desde $280.000 de alimento;
// 5% desde $150.000.
const reglas: ReglaDescuento[] = [
  { id: "r1", montoMinimo: 150_000, pctDescuentoCompra: 5, descuentoEnvioFijo: 0 },
  { id: "r2", montoMinimo: 280_000, pctDescuentoCompra: 10, descuentoEnvioFijo: 7_000 },
]

describe("calcularDescuentos", () => {
  it("no aplica descuento por debajo del primer umbral", () => {
    const r = calcularDescuentos(100_000, 0, 0, 12_000, reglas)
    expect(r.pctDescuentoCompra).toBe(0)
    expect(r.montoDescuentoCompra).toBe(0)
    expect(r.reglaAplicada).toBeNull()
    expect(r.total).toBe(112_000) // alimento + envío
  })

  it("toma el tramo más alto aplicable", () => {
    const r = calcularDescuentos(300_000, 0, 0, 12_000, reglas)
    expect(r.pctDescuentoCompra).toBe(10)
    expect(r.montoDescuentoCompra).toBe(30_000)
    expect(r.descuentoEnvio).toBe(7_000)
    expect(r.totalEnvioCobrado).toBe(5_000)
    // 300.000 - 30.000 + 5.000
    expect(r.total).toBe(275_000)
  })

  it("el descuento solo aplica al alimento, no a snacks ni otros", () => {
    const r = calcularDescuentos(300_000, 50_000, 20_000, 0, reglas)
    expect(r.montoDescuentoCompra).toBe(30_000)
    // (300k - 30k) + 50k + 20k
    expect(r.total).toBe(340_000)
  })

  it("el descuento de distribuidor sustituye al estándar si es mayor", () => {
    const r = calcularDescuentos(300_000, 0, 0, 0, reglas, true, 15)
    expect(r.pctDescuentoCompra).toBe(15)
    expect(r.montoDescuentoCompra).toBe(45_000)
  })

  it("mantiene el estándar si el de distribuidor es menor", () => {
    const r = calcularDescuentos(300_000, 0, 0, 0, reglas, true, 3)
    expect(r.pctDescuentoCompra).toBe(10)
  })

  it("el descuento referido vet es acumulativo sobre el alimento ya descontado", () => {
    const r = calcularDescuentos(300_000, 0, 0, 0, reglas, false, 0, 10)
    // base tras 10%: 270.000; 10% de eso = 27.000
    expect(r.montoDescuentoReferidoVet).toBe(27_000)
    expect(r.total).toBe(243_000)
  })

  it("el envío cobrado nunca es negativo", () => {
    const r = calcularDescuentos(300_000, 0, 0, 3_000, reglas)
    expect(r.totalEnvioCobrado).toBe(0)
  })
})
