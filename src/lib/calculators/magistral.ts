/**
 * Magistral diet pricing calculator for Amatu ERP
 *
 * Rules:
 * - Gramaje < 300g → price/gram from the 300g variant
 * - 300g ≤ gramaje < 500g → price/gram from the 500g variant
 * - 500g ≤ gramaje ≤ 1200g → price/gram from the 1200g variant
 * - Formula: (price_per_gram × gramaje) × 1.03 (+3% customization)
 * - Admin can override price in exceptional cases (~1 in 10)
 *
 * Full implementation in Sprint 3.
 */

interface VariantePrecio {
  presentacion: string; // e.g. "300g", "500g", "1200g"
  precioPorGramo: number;
}

/**
 * Determines which variant's price-per-gram to use based on the requested gramaje.
 */
export function determinarTramoMagistral(
  gramaje: number,
  variantes: VariantePrecio[]
): VariantePrecio | null {
  // Sort variants by weight ascending
  const sorted = [...variantes].sort(
    (a, b) => parseInt(a.presentacion) - parseInt(b.presentacion)
  );

  // Find the smallest variant whose weight is >= gramaje
  if (gramaje < 300) return sorted.find((v) => v.presentacion === "300g") ?? null;
  if (gramaje < 500) return sorted.find((v) => v.presentacion === "500g") ?? null;
  return sorted.find((v) => v.presentacion === "1200g") ?? null;
}

/**
 * Calculates the price of a magistral diet.
 */
export function calcularPrecioMagistral(
  gramaje: number,
  precioPorGramo: number,
  sobrecargoPersonalizacion: number = 0.03
): number {
  return Math.round(precioPorGramo * gramaje * (1 + sobrecargoPersonalizacion));
}
