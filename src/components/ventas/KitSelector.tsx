"use client"

import { useActiveKits } from "@/hooks/useActiveKits"
import { useCartStore } from "@/stores/cartStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Kit } from "@/types"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

function kitTotal(kit: Kit) {
  return kit.items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0)
}

export function KitSelector() {
  const { kits, isLoading } = useActiveKits()
  const addItem = useCartStore((s) => s.addItem)

  function handleAddKit(kit: Kit) {
    for (const item of kit.items) {
      addItem({
        productoId: item.productoId,
        varianteId: item.varianteId,
        sku: item.sku,
        nombre: item.nombre,
        presentacion: item.presentacion,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.precioUnitario * item.cantidad,
        esMagistral: false,
        aplicaDescuento: item.aplicaDescuento,
        categoria: item.categoria,
      })
    }
    toast.success(`Kit agregado: ${kit.items.length} producto${kit.items.length !== 1 ? "s" : ""}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (kits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Package className="h-10 w-10 opacity-30" />
        <p className="text-sm">No hay kits configurados</p>
        <p className="text-xs text-center">
          Los kits se configuran en Admin → Promociones &amp; Kits
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {kits.map((kit) => (
        <div
          key={kit.id}
          className="border rounded-lg p-4 space-y-3 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm">{kit.nombre}</span>
              </div>
              {kit.descripcion && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {kit.descripcion}
                </p>
              )}
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => handleAddKit(kit)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </div>

          <div className="space-y-1">
            {kit.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span className="truncate flex-1">
                  <span className="font-medium text-foreground/80">{item.cantidad}x</span>{" "}
                  {item.nombre}
                  {item.presentacion ? ` - ${item.presentacion}` : ""}
                </span>
                <span className="shrink-0 ml-2">{fmt(item.precioUnitario * item.cantidad)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 border-t">
            <Badge variant="secondary" className="text-[10px]">
              {kit.items.length} producto{kit.items.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-sm font-semibold text-primary">
              {fmt(kitTotal(kit))}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
