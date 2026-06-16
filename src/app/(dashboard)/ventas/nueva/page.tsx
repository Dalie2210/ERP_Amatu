"use client"

import { useEffect, useRef } from "react"
import { ProductSearchBox } from "@/components/ventas/ProductSearchBox"
import { KitSelector } from "@/components/ventas/KitSelector"
import { CartPanel } from "@/components/ventas/CartPanel"
import { ClientSelector } from "@/components/ventas/ClientSelector"
import { OrderOptionsPanel } from "@/components/ventas/OrderOptionsPanel"
import { OrderSummaryCard } from "@/components/ventas/OrderSummaryCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Package } from "lucide-react"
import { useCartStore } from "@/stores/cartStore"
import { useActivePromociones } from "@/hooks/useActivePromociones"
import { syncPromos } from "@/lib/promociones/syncPromos"

export default function NuevaVentaPage() {
  const { items, setItems } = useCartStore()
  const { promociones } = useActivePromociones()

  // Serialize only real items to detect meaningful cart changes
  const realKey = items
    .filter((i) => !i.esPromo)
    .map((i) => `${i.productoId}:${i.varianteId ?? ""}:${i.cantidad}`)
    .join(",")

  const prevKeyRef = useRef<string>("")
  const prevPromosRef = useRef<typeof promociones>([])

  useEffect(() => {
    const promosChanged = prevPromosRef.current !== promociones
    const cartChanged = prevKeyRef.current !== realKey

    if (!promosChanged && !cartChanged) return

    prevKeyRef.current = realKey
    prevPromosRef.current = promociones

    const realItems = items.filter((i) => !i.esPromo)
    const promoItems = syncPromos(realItems, promociones)
    setItems([...realItems, ...promoItems])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realKey, promociones])

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">
          Nueva Venta
        </h1>
        <p className="text-muted-foreground mt-1">
          Arma el pedido del cliente paso a paso.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client selector */}
          <ClientSelector />

          {/* Product search + Kits */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Agregar Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="producto">
                <TabsList className="mb-4">
                  <TabsTrigger value="producto" className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Producto
                  </TabsTrigger>
                  <TabsTrigger value="kits" className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    Kits
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="producto">
                  <ProductSearchBox />
                </TabsContent>
                <TabsContent value="kits">
                  <KitSelector />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Order options */}
          <OrderOptionsPanel />
        </div>

        {/* Right: Cart panel (1 col - sticky) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <CartPanel />
              </CardContent>
            </Card>

            <OrderSummaryCard />
          </div>
        </div>
      </div>
    </div>
  )
}
