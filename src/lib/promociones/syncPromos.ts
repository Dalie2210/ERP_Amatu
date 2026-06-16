import type { CartItem, Promocion } from "@/types"

/**
 * Calcula los ítems de promoción que deben estar en el carrito dado el estado
 * actual de los ítems reales. Función pura e idempotente.
 *
 * El caller es responsable de hacer: [...realItems, ...syncPromos(realItems, promos)]
 */
export function syncPromos(
  realItems: CartItem[],
  promociones: Promocion[]
): CartItem[] {
  const promoItems: CartItem[] = []
  const activePromos = promociones.filter((p) => p.isActive)

  for (const promo of activePromos) {
    if (promo.tipo === "paga_x_lleva_mas") {
      if (!promo.productoId || !promo.pagaX || !promo.llevaExtra) continue

      const triggerItem = realItems.find(
        (i) =>
          i.productoId === promo.productoId &&
          (!promo.varianteId || i.varianteId === promo.varianteId)
      )
      if (!triggerItem) continue

      const freeQty =
        Math.floor(triggerItem.cantidad / promo.pagaX) * promo.llevaExtra
      if (freeQty <= 0) continue

      promoItems.push({
        productoId: promo.productoId,
        varianteId: promo.varianteId,
        sku: promo.productoSku ?? triggerItem.sku,
        nombre: `${promo.productoNombre ?? triggerItem.nombre}${promo.productoPresentacion ? ` - ${promo.productoPresentacion}` : ""}`,
        presentacion: promo.productoPresentacion ?? triggerItem.presentacion,
        precioUnitario: 0,
        cantidad: freeQty,
        subtotal: 0,
        esMagistral: false,
        aplicaDescuento: false,
        categoria: promo.productoCategoria ?? triggerItem.categoria,
        esPromo: true,
        promoId: promo.id,
      })
    }

    if (promo.tipo === "producto_gratis") {
      if (!promo.triggerProductoId || !promo.regaloProductoId) continue

      const hasTrigger = realItems.some(
        (i) =>
          i.productoId === promo.triggerProductoId &&
          (!promo.triggerVarianteId || i.varianteId === promo.triggerVarianteId)
      )
      if (!hasTrigger) continue

      const qty = promo.regaloCantidad ?? 1

      promoItems.push({
        productoId: promo.regaloProductoId,
        varianteId: promo.regaloVarianteId,
        sku: promo.regaloSku ?? "",
        nombre: promo.regaloNombre ?? "Producto regalo",
        presentacion: promo.regaloPresentacion,
        precioUnitario: 0,
        cantidad: qty,
        subtotal: 0,
        esMagistral: false,
        aplicaDescuento: false,
        categoria: promo.regaloCategoria ?? "otros",
        esPromo: true,
        promoId: promo.id,
      })
    }
  }

  return promoItems
}
