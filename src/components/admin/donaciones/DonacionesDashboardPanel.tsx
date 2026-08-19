"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartFrame, SimpleBarChart, CHART_COLORS, type BarDatum,
} from "@/components/inventario/dashboard/InvChart"
import { DONACION_SELECT, formatCOP, type DonacionRow } from "./utils"

function primerDiaDelAno(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

/**
 * ERP-DON-04: cuánto se donó en un rango — por producto/dieta, por motivo y
 * por destinatario. Solo cuenta lo aprobado: lo pendiente o rechazado no salió
 * de la bodega.
 */
export function DonacionesDashboardPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [fechaDesde, setFechaDesde] = useState(primerDiaDelAno())
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<DonacionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRows = useCallback(async () => {
    setIsLoading(true)
    let query = supabase
      .from("donaciones")
      .select(DONACION_SELECT)
      .eq("estado", "aprobada")
    if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`)
    if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`)

    const { data, error } = await query
    if (error) {
      toast.error("No se pudo cargar el dashboard de donaciones")
      console.error(error)
    } else {
      setRows((data ?? []) as unknown as DonacionRow[])
    }
    setIsLoading(false)
  }, [supabase, fechaDesde, fechaHasta])

  useEffect(() => { void fetchRows() }, [fetchRows])

  const { totalValor, totalUnidades, porProducto, porDestinatario } = useMemo(() => {
    const productos = new Map<string, number>()
    const destinatarios = new Map<string, number>()
    let unidades = 0
    let valor = 0

    for (const d of rows) {
      valor += Number(d.valor_comercial)
      destinatarios.set(d.destinatario, (destinatarios.get(d.destinatario) ?? 0) + Number(d.valor_comercial))

      if (d.origen === "lote_pt") {
        const nombre = d.producto_lotes?.productos?.nombre ?? "—"
        const n = Number(d.cantidad ?? 0)
        unidades += n
        productos.set(nombre, (productos.get(nombre) ?? 0) + n)
      } else {
        for (const l of d.pedidos?.detalle_pedido ?? []) {
          unidades += Number(l.cantidad)
          productos.set(l.nombre_snapshot, (productos.get(l.nombre_snapshot) ?? 0) + Number(l.cantidad))
        }
      }
    }

    const top = (m: Map<string, number>) =>
      [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map<BarDatum>(([label, value]) => ({ label, value }))

    return {
      totalValor: valor,
      totalUnidades: unidades,
      porProducto: top(productos),
      porDestinatario: top(destinatarios),
    }
  }, [rows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label className="text-sm">Desde</Label>
              <Input type="date" className="w-full sm:w-[160px]" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Hasta</Label>
              <Input type="date" className="w-full sm:w-[160px]" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Donaciones aprobadas" value={rows.length.toLocaleString("es-CO")} hint="En el rango seleccionado" />
            <KpiCard label="Unidades donadas" value={totalUnidades.toLocaleString("es-CO")} />
            <KpiCard label="Valor comercial" value={formatCOP(totalValor)} hint="Lo que se habría cobrado" />
          </div>

          <ChartFrame
            title="Producto / dieta más donado"
            description="Unidades donadas en el rango, de mayor a menor."
            height={340}
            isEmpty={porProducto.length === 0}
          >
            <SimpleBarChart data={porProducto} horizontal color={CHART_COLORS.aqua} showLabels />
          </ChartFrame>

          <ChartFrame
            title="Destinatarios"
            description="Valor comercial donado a cada destinatario."
            height={340}
            isEmpty={porDestinatario.length === 0}
          >
            <SimpleBarChart
              data={porDestinatario}
              horizontal
              color={CHART_COLORS.violet}
              valueFormatter={formatCOP}
            />
          </ChartFrame>
        </>
      )}
    </div>
  )
}
