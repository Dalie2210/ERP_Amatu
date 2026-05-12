"use client"

import { ProductSearchBox } from "@/components/ventas/ProductSearchBox"
import { CartPanel } from "@/components/ventas/CartPanel"
import { ClientSelector } from "@/components/ventas/ClientSelector"
import { OrderOptionsPanel } from "@/components/ventas/OrderOptionsPanel"
import { OrderSummaryCard } from "@/components/ventas/OrderSummaryCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag } from "lucide-react"

export default function NuevaVentaPage() {
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

          {/* Product search */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Agregar Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSearchBox />
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
