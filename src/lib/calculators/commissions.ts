/**
 * Commission calculation engine for Amatu ERP
 *
 * Rules:
 * - Venta #1 = 0% (except referidos → comisiona como #2)
 * - Ventas #2–#6: % depends on vendor's Meta Ads close rate for the month
 * - Venta #7+ = 0% (fidelized client)
 * - Distributor sales = 0% commission
 * - Base = (order total - shipping) × 0.95 (minus 5% IVA)
 * - Commission is blocked until payment is confirmed
 *
 * Full implementation in Sprint 6.
 */

import type { CalculoComision, ConfigComision, FuenteCliente } from "@/types";

/**
 * Determines the commission percentage for a given order.
 */
export function calcularComision(
  numeroVentaCliente: number,
  fuente: FuenteCliente,
  totalSinEnvio: number,
  pctCierreMeta: number,
  configComisiones: ConfigComision[],
  esDistribuidor: boolean = false
): CalculoComision {
  const pedidoId = ""; // Will be set by caller
  const baseCalculo = Math.round(totalSinEnvio * 0.95); // -5% IVA

  // No commission for distributors
  if (esDistribuidor) {
    return {
      pedidoId,
      numeroVentaCliente,
      baseCalculo,
      pctComision: 0,
      montoComision: 0,
      aplicaComision: false,
      razonNoComision: "Venta de distribuidor",
    };
  }

  // No commission for venta #7+
  if (numeroVentaCliente >= 7) {
    return {
      pedidoId,
      numeroVentaCliente,
      baseCalculo,
      pctComision: 0,
      montoComision: 0,
      aplicaComision: false,
      razonNoComision: "Cliente fidelizado (venta #7+)",
    };
  }

  // Venta #1 = 0% unless source is "referido"
  const esReferido = fuente.startsWith("referido");
  let ventaEfectiva = numeroVentaCliente;

  if (numeroVentaCliente === 1 && !esReferido) {
    return {
      pedidoId,
      numeroVentaCliente,
      baseCalculo,
      pctComision: 0,
      montoComision: 0,
      aplicaComision: false,
      razonNoComision: "Primera venta del cliente",
    };
  }

  // If referido on venta #1, treat as venta #2
  if (numeroVentaCliente === 1 && esReferido) {
    ventaEfectiva = 2;
  }

  // Find the matching config row based on % cierre
  const config = configComisiones
    .filter((c) => pctCierreMeta >= c.cierreMin && pctCierreMeta <= c.cierreMax)
    .at(0);

  if (!config) {
    return {
      pedidoId,
      numeroVentaCliente,
      baseCalculo,
      pctComision: 0,
      montoComision: 0,
      aplicaComision: false,
      razonNoComision: "Sin rango de cierre configurado",
    };
  }

  // Map venta # to the corresponding percentage
  const pctMap: Record<number, number> = {
    2: config.venta2Pct,
    3: config.venta3Pct,
    4: config.venta4Pct,
    5: config.venta5Pct,
    6: config.venta6Pct,
  };

  const pctComision = pctMap[ventaEfectiva] ?? 0;
  const montoComision = Math.round(baseCalculo * (pctComision / 100));

  return {
    pedidoId,
    numeroVentaCliente,
    baseCalculo,
    pctComision,
    montoComision,
    aplicaComision: pctComision > 0,
    razonNoComision: pctComision === 0 ? "Sin comisión para esta etapa/cierre" : undefined,
  };
}
