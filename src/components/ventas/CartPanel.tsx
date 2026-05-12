"use client"

import { useCartStore } from "@/stores/cartStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Trash2, Minus, Plus, Beaker, PackageOpen } from "lucide-react"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

export function CartPanel() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  const cnt = getItemCount()

  if (items.length === 0) {
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
          {items.map((item, idx) => (
            <div key={`${item.productoId}-${item.varianteId ?? idx}`} className="bg-muted/40 rounded-lg p-3 space-y-2 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.esMagistral && <Beaker className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <span className="text-sm font-medium truncate">{item.nombre}</span>
                  </div>
                  {item.presentacion && <span className="text-xs text-muted-foreground">{item.presentacion}</span>}
                  {item.notasMagistral && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{item.notasMagistral}</p>}
                </div>
                <button onClick={() => removeItem(item.productoId, item.varianteId)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-0.5" title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={item.cantidad <= 1} onClick={() => updateQuantity(item.productoId, item.cantidad - 1, item.varianteId)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input type="number" min={1} value={item.cantidad} onChange={(e) => updateQuantity(item.productoId, Math.max(1, parseInt(e.target.value) || 1), item.varianteId)} className="w-14 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productoId, item.cantidad + 1, item.varianteId)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(item.subtotal)}</p>
                  {item.cantidad > 1 && <p className="text-[10px] text-muted-foreground">{fmt(item.precioUnitario)} c/u</p>}
                </div>
              </div>
              {item.aplicaDescuento && <Badge variant="outline" className="text-[10px] h-5">Aplica dcto</Badge>}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
