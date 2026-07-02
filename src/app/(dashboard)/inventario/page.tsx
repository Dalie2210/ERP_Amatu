"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DollarSign, AlertTriangle, CalendarClock, PackageCheck,
  ArrowDownToLine, Warehouse, FlaskConical, BarChart2, ScanBarcode, Calculator, ChevronRight,
} from "lucide-react"
import type { VValorInventario, VStockInsumo, VStockProducto } from "@/types"

const QUICK_LINKS = [
  { label: "Registrar Ingreso", href: "/inventario/ingresos/nuevo", icon: ArrowDownToLine },
  { label: "Insumos", href: "/inventario/insumos", icon: Warehouse },
  { label: "Producción", href: "/inventario/produccion", icon: FlaskConical },
  { label: "Reporte de Compras", href: "/inventario/reportes/compras", icon: BarChart2 },
  { label: "Trazabilidad", href: "/inventario/trazabilidad", icon: ScanBarcode },
  { label: "Explosión de Materiales", href: "/inventario/explosion", icon: Calculator },
]

export default function InventarioDashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [valorInventario, setValorInventario] = useState(0)
  const [insumosBajoMinimo, setInsumosBajoMinimo] = useState(0)
  const [lotesPorVencer, setLotesPorVencer] = useState(0)
  const [ptPorEstado, setPtPorEstado] = useState({ producido: 0, empacado: 0, despachado: 0 })

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      const [valorRes, stockInsumosRes, stockProductosRes] = await Promise.all([
        supabase.from("v_valor_inventario").select("*"),
        supabase.from("v_stock_insumos").select("*"),
        supabase.from("v_stock_productos").select("*"),
      ])

      const valorTotal = ((valorRes.data ?? []) as VValorInventario[]).reduce((s, r) => s + r.valor_total, 0)
      setValorInventario(valorTotal)

      const insumos = (stockInsumosRes.data ?? []) as VStockInsumo[]
      setInsumosBajoMinimo(insumos.filter((i) => i.bajo_minimo).length)
      setLotesPorVencer(insumos.reduce((s, i) => s + i.lotes_por_vencer, 0))

      const productos = (stockProductosRes.data ?? []) as VStockProducto[]
      const porEstado = { producido: 0, empacado: 0, despachado: 0 }
      for (const p of productos) {
        if (p.estado === "producido") porEstado.producido += p.stock_disponible
        else if (p.estado === "empacado") porEstado.empacado += p.stock_disponible
        else if (p.estado === "despachado") porEstado.despachado += p.stock_disponible
      }
      setPtPorEstado(porEstado)

      setIsLoading(false)
    }
    fetchAll()
  }, [supabase])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard de Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Valor de inventario, alertas de stock y estado de producción en tiempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total de Inventario</CardTitle>
            <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold font-heading">
                ${valorInventario.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Insumos + producto terminado</p>
          </CardContent>
        </Card>

        <Link href="/inventario/insumos?filtro=bajo_minimo">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Insumos Bajo Mínimo</CardTitle>
              <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-heading">{insumosBajoMinimo}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Ver lista filtrada →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventario/insumos?filtro=por_vencer">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lotes por Vencer (≤30 días)</CardTitle>
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-heading">{lotesPorVencer}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Ver lista filtrada →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventario/productos">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Producto Terminado</CardTitle>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-full" /> : (
                <div className="flex items-center gap-3 text-sm">
                  <span><span className="font-bold">{ptPorEstado.producido.toLocaleString("es-CO")}</span> producido</span>
                  <span className="text-muted-foreground">·</span>
                  <span><span className="font-bold">{ptPorEstado.empacado.toLocaleString("es-CO")}</span> empacado</span>
                  <span className="text-muted-foreground">·</span>
                  <span><span className="font-bold">{ptPorEstado.despachado.toLocaleString("es-CO")}</span> desp.</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Por estado →</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((l) => (
              <Button
                key={l.href}
                variant="outline"
                className="justify-between h-auto py-3"
                render={<Link href={l.href} />}
                nativeButton={false}
              >
                <span className="flex items-center gap-2">
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
