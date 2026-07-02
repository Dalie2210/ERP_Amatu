"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BarChart2 } from "lucide-react"
import type { Insumo, VCompraAnualProducto } from "@/types"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default function ReporteAnualPage() {
  const supabase = useMemo(() => createClient(), [])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [insumoId, setInsumoId] = useState<string>("")
  const currentYear = new Date().getFullYear()
  const [anio, setAnio] = useState<number>(currentYear)
  const [rows, setRows] = useState<VCompraAnualProducto[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchInsumos = async () => {
      const { data } = await supabase.from("insumos").select("*").eq("is_active", true).order("nombre")
      setInsumos(data ?? [])
      if (data && data.length > 0) setInsumoId((prev) => prev || data[0].id)
    }
    fetchInsumos()
  }, [supabase])

  const fetchAnual = useCallback(async () => {
    if (!insumoId) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from("v_compras_anual_producto")
      .select("*")
      .eq("insumo_id", insumoId)
      .eq("anio", anio)
    if (!error) setRows((data ?? []) as VCompraAnualProducto[])
    setIsLoading(false)
  }, [supabase, insumoId, anio])

  useEffect(() => { fetchAnual() }, [fetchAnual])

  const byMes = useMemo(() => {
    const map = new Map<number, VCompraAnualProducto>()
    for (const r of rows) map.set(r.mes, r)
    return map
  }, [rows])

  const totales = useMemo(() => {
    const totalCantidad = rows.reduce((s, r) => s + r.total_cantidad, 0)
    const totalValor = rows.reduce((s, r) => s + r.total_valor, 0)
    const precios = rows.map((r) => r.precio_promedio).filter((p) => p > 0)
    const promedioAnual = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0
    return { totalCantidad, totalValor, promedioAnual }
  }, [rows])

  const unidad = insumos.find((i) => i.id === insumoId)?.unidad_medida ?? ""
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Reporte Anual de Compras</h1>
        <p className="text-muted-foreground mt-1">
          Resumen mes a mes de precio promedio, cantidad y valor comprado por insumo.
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
              <Label>Año</Label>
              <Select value={String(anio)} onValueChange={(v) => v && setAnio(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue>{anio}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Comprado</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold font-heading">
            {totales.totalCantidad.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {unidad}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold font-heading">
            ${totales.totalValor.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Precio Promedio Anual</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold font-heading">
            ${totales.promedioAnual.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Detalle Mensual — {anio}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <BarChart2 className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sin compras registradas en {anio}</p>
              <p className="text-sm">Ajusta el insumo o el año seleccionado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Métrica</TableHead>
                  {MESES.map((m) => (
                    <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">Cantidad ({unidad})</TableCell>
                  {MESES.map((_, idx) => {
                    const r = byMes.get(idx + 1)
                    return (
                      <TableCell key={idx} className="text-right">
                        {r ? r.total_cantidad.toLocaleString("es-CO", { maximumFractionDigits: 1 }) : "—"}
                      </TableCell>
                    )
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">Precio Promedio</TableCell>
                  {MESES.map((_, idx) => {
                    const r = byMes.get(idx + 1)
                    return (
                      <TableCell key={idx} className="text-right">
                        {r ? `$${r.precio_promedio.toLocaleString("es-CO", { maximumFractionDigits: 0 })}` : "—"}
                      </TableCell>
                    )
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">Valor Total</TableCell>
                  {MESES.map((_, idx) => {
                    const r = byMes.get(idx + 1)
                    return (
                      <TableCell key={idx} className="text-right">
                        {r ? `$${r.total_valor.toLocaleString("es-CO", { maximumFractionDigits: 0 })}` : "—"}
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
