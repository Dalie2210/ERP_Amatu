"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BarChart2 } from "lucide-react"
import type { Insumo, VCompraProductoPeriodo } from "@/types"

function firstDayOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function ReporteComprasPage() {
  const supabase = useMemo(() => createClient(), [])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [insumoId, setInsumoId] = useState<string>("")
  const [fechaDesde, setFechaDesde] = useState(firstDayOfMonth())
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<VCompraProductoPeriodo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchInsumos = async () => {
      const { data } = await supabase.from("insumos").select("*").eq("is_active", true).order("nombre")
      setInsumos(data ?? [])
      if (data && data.length > 0) setInsumoId((prev) => prev || data[0].id)
    }
    fetchInsumos()
  }, [supabase])

  const fetchCompras = useCallback(async () => {
    if (!insumoId) return
    setIsLoading(true)
    let query = supabase
      .from("v_compras_producto_periodo")
      .select("*")
      .eq("insumo_id", insumoId)
      .order("fecha", { ascending: false })

    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)

    const { data, error } = await query
    if (!error) setRows((data ?? []) as VCompraProductoPeriodo[])
    setIsLoading(false)
  }, [supabase, insumoId, fechaDesde, fechaHasta])

  useEffect(() => { fetchCompras() }, [fetchCompras])

  const stats = useMemo(() => {
    if (rows.length === 0) {
      return { promedio: 0, minimo: 0, maximo: 0, unidades: 0, valorTotal: 0 }
    }
    const precios = rows.map((r) => r.precio_unitario ?? 0).filter((p) => p > 0)
    const unidades = rows.reduce((sum, r) => sum + r.cantidad, 0)
    const valorTotal = rows.reduce((sum, r) => sum + r.precio_compra, 0)
    return {
      promedio: precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0,
      minimo: precios.length ? Math.min(...precios) : 0,
      maximo: precios.length ? Math.max(...precios) : 0,
      unidades,
      valorTotal,
    }
  }, [rows])

  const unidad = insumos.find((i) => i.id === insumoId)?.unidad_medida ?? ""

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Reporte de Compras</h1>
        <p className="text-muted-foreground mt-1">
          Precio promedio, mínimo, máximo y desglose de compras por insumo y período.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
            <div className="space-y-2 flex-1 min-w-[220px]">
              <Label>Insumo</Label>
              <Select value={insumoId} onValueChange={(v) => v && setInsumoId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar insumo...">
                    {insumos.find((i) => i.id === insumoId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {insumos.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Precio Promedio", value: stats.promedio },
          { label: "Precio Mínimo", value: stats.minimo },
          { label: "Precio Máximo", value: stats.maximo },
          { label: "Unidades Compradas", value: stats.unidades, isUnidad: true },
          { label: "Valor Total", value: stats.valorTotal },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-heading">
                {s.isUnidad
                  ? `${s.value.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${unidad}`
                  : `$${s.value.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Desglose por Compra</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <BarChart2 className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sin compras en el período</p>
              <p className="text-sm">Ajusta el insumo o el rango de fechas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Compra</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead>Vencimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{r.fecha}</TableCell>
                    <TableCell>{r.proveedor ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.codigo_lote}</TableCell>
                    <TableCell className="text-right">{r.cantidad.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {r.unidad_medida}</TableCell>
                    <TableCell className="text-right">${r.precio_compra.toLocaleString("es-CO", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-medium">${(r.precio_unitario ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-muted-foreground">{r.fecha_vencimiento ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
