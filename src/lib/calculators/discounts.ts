/**
 * Discount calculation engine for Amatu ERP
 *
 * Rules (2026):
 * - Discounts apply ONLY to food items (dietas), not snacks or accessories
 * - Discount tiers are based on total food subtotal (before discount)
 * - Shipping discount of $7,000 applies when food subtotal > $280,000
 * - Distributor clients get a separate % discount from their client config
 *
 * This module will be fully implemented in Sprint 5.
 */

import type { CalculoDescuento, ReglaDescuento } from "@/types";

/**
 * Calculates discounts for an order based on the discount rules table.
 */
export function calcularDescuentos(
  subtotalAlimento: number,
  subtotalSnacks: number,
  subtotalOtros: number,
  tarifaEnvioBase: number,
  reglas: ReglaDescuento[],
  esDistribuidor: boolean = false,
  pctDescuentoDistribuidor: number = 0
): CalculoDescuento {
  // Sort rules by monto_minimo descending to find the highest applicable tier
  const reglasOrdenadas = [...reglas]
    .filter((r) => subtotalAlimento >= r.montoMinimo)
    .sort((a, b) => b.montoMinimo - a.montoMinimo);

  const reglaAplicada = reglasOrdenadas[0] || null;

  // Calculate food discount
  let pctDescuentoCompra = reglaAplicada?.pctDescuentoCompra ?? 0;

  // Distributor discount overrides standard discount if higher
  if (esDistribuidor && pctDescuentoDistribuidor > pctDescuentoCompra) {
    pctDescuentoCompra = pctDescuentoDistribuidor;
  }

  const montoDescuentoCompra = Math.round(subtotalAlimento * (pctDescuentoCompra / 100));

  // Calculate shipping discount
  const descuentoEnvio = reglaAplicada?.descuentoEnvioFijo ?? 0;
  const totalEnvioCobrado = Math.max(0, tarifaEnvioBase - descuentoEnvio);

  // Calculate total
  const total =
    subtotalAlimento -
    montoDescuentoCompra +
    subtotalSnacks +
    subtotalOtros +
    totalEnvioCobrado;

  return {
    subtotalAlimento,
    subtotalSnacks,
    subtotalOtros,
    reglaAplicada,
    montoDescuentoCompra,
    pctDescuentoCompra,
    tarifaEnvioBase,
    descuentoEnvio,
    totalEnvioCobrado,
    total,
  };
}
