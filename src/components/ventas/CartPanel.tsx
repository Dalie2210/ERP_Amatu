"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cartStore"
import { useActivePromociones } from "@/hooks/useActivePromociones"
import { syncPromos } from "@/lib/promociones/syncPromos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ShoppingCart, Trash2, Minus, Plus, Beaker, PackageOpen, Gift, AlertTriangle } from "lucide-react"
import type { VStockProducto } from "@/types"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

function StockBadge({ disponible, cantidad }: { disponible: number; cantidad: number }) {
  if (disponible <= 0) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 bg-destructive/5 text-destructive gap-1">
        <AlertTriangle className="h-2.5 w-2.5" />Sin stock
      </Badge>
    )
  }
  if (disponible < cantidad) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 border-amber-200 bg-amber-50 text-amber-700 gap-1">
        <AlertTriangle className="h-2.5 w-2.5" />Stock bajo ({disponible})
      </Badge>
    )
  }
  return null
}

export function CartPanel() {
  const supabase = useMemo(() => createClient(), [])
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)
  const disabledPromoIds = useCartStore((s) => s.disabledPromoIds)
  const togglePromoEnabled = useCartStore((s) => s.togglePromoEnabled)
  const { promociones } = useActivePromociones()

  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map())

  const realItems = useMemo(() => items.filter((i) => !i.esPromo), [items])

  // Promos que aplicarían al carrito actual, sin importar si el vendedor las desactivó
  const eligiblePromoItems = useMemo(
    () => syncPromos(realItems, promociones, []),
    [realItems, promociones]
  )

  const varianteIds = useMemo(
    () => [...new Set(items.filter((i) => i.varianteId && !i.esMagistral).map((i) => i.varianteId as string))],
    [items]
  )

  useEffect(() => {
    if (varianteIds.length === 0) {
      setStockMap(new Map())
      return
    }
    supabase
      .from("v_stock_productos")
      .select("variante_id, estado, stock_disponible")
      .in("variante_id", varianteIds)
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as Pick<VStockProducto, "variante_id" | "estado" | "stock_disponible">[]
        const map = new Map<string, number>()
        for (const r of rows) {
          if (r.estado === "despachado") continue
          map.set(r.variante_id, (map.get(r.variante_id) ?? 0) + Number(r.stock_disponible))
        }
        setStockMap(map)
      })
  }, [supabase, varianteIds])

  const cnt = getItemCount()

  if (realItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <PackageOpen className="h-8 w-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">El carrito está vacío</p>
        <p className="text-xs">Busca productos arriba para agregar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Carrito ({cnt})</span>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs" onClick={clearCart}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />Vaciar
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-2">
          {realItems.map((item, idx) => {
            return (
              <div
                key={`${item.productoId}-${item.varianteId ?? ""}-${idx}`}
                className="rounded-lg p-3 space-y-2 group bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.esMagistral && <Beaker className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <span className="text-sm font-medium truncate">{item.nombre}</span>
                    </div>
                    {item.presentacion && <span className="text-xs text-muted-foreground">{item.presentacion}</span>}
                    {item.notasMagistral && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{item.notasMagistral}</p>}
                  </div>
                  <button
                    onClick={() => removeItem(item.productoId, item.varianteId)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={item.cantidad <= 1}
                      onClick={() => updateQuantity(item.productoId, item.cantidad - 1, item.varianteId)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={(e) => updateQuantity(item.productoId, Math.max(1, parseInt(e.target.value) || 1), item.varianteId)}
                      className="w-14 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productoId, item.cantidad + 1, item.varianteId)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(item.subtotal)}</p>
                    {item.cantidad > 1 && <p className="text-[10px] text-muted-foreground">{fmt(item.precioUnitario)} c/u</p>}
                  </div>
                </div>
                {(item.aplicaDescuento || item.varianteId) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.aplicaDescuento && (
                      <Badge variant="outline" className="text-[10px] h-5">Aplica dcto</Badge>
                    )}
                    {item.varianteId && !item.esMagistral && (
                      <StockBadge disponible={stockMap.get(item.varianteId) ?? 0} cantidad={item.cantidad} />
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {eligiblePromoItems.map((item, idx) => {
            const isDisabled = !!item.promoId && disabledPromoIds.includes(item.promoId)
            return (
              <div
                key={`promo-${item.promoId ?? idx}`}
                className={`rounded-lg p-3 space-y-2 ${isDisabled ? "bg-muted/40 border border-dashed" : "bg-emerald-50 border border-emerald-100"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Gift className={`h-3.5 w-3.5 shrink-0 ${isDisabled ? "text-muted-foreground" : "text-emerald-600"}`} />
                      <span className={`text-sm font-medium truncate ${isDisabled ? "text-muted-foreground" : ""}`}>{item.nombre}</span>
                    </div>
                    <span className={`text-xs ${isDisabled ? "text-muted-foreground" : "text-emerald-700 font-medium"}`}>
                      {isDisabled
                        ? "Promoción desactivada para este pedido"
                        : `${item.cantidad} ${item.cantidad === 1 ? "unidad" : "unidades"} gratis`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isDisabled && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] h-5">
                        GRATIS
                      </Badge>
                    )}
                    <Switch
                      checked={!isDisabled}
                      onCheckedChange={() => item.promoId && togglePromoEnabled(item.promoId)}
                      aria-label={isDisabled ? "Activar promoción" : "Desactivar promoción"}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
