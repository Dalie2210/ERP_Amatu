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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart2 } from "lucide-react"
import type { Insumo, VCompraProductoPeriodo, VCompraAnualProducto } from "@/types"
import {
  ChartFrame, SimpleBarChart, SimpleLineChart, CHART_COLORS, type BarDatum,
} from "./InvChart"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function firstDayOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const money = (v: number) => `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`

interface ComprasPanelProps {
  initialSub?: "periodo" | "anual"
}

export function ComprasPanel({ initialSub = "periodo" }: ComprasPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [sub, setSub] = useState<"periodo" | "anual">(initialSub)
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [insumoId, setInsumoId] = useState<string>("")

  useEffect(() => {
    const fetchInsumos = async () => {
      const { data } = await supabase.from("insumos").select("*").eq("is_active", true).order("nombre")
      setInsumos(data ?? [])
      if (data && data.length > 0) setInsumoId((prev) => prev || data[0].id)
    }
    fetchInsumos()
  }, [supabase])

  const unidad = insumos.find((i) => i.id === insumoId)?.unidad_medida ?? ""

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <Tabs value={sub} onValueChange={(v) => setSub((v as "periodo" | "anual") ?? "periodo")}>
          <TabsList>
            <TabsTrigger value="periodo">Por período</TabsTrigger>
            <TabsTrigger value="anual">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full sm:w-[280px]">
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
      </div>

      {sub === "periodo"
        ? <PeriodoView supabase={supabase} insumoId={insumoId} unidad={unidad} />
        : <AnualView supabase={supabase} insumoId={insumoId} unidad={unidad} />}
    </div>
  )
}

/* ---------------- Por período ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PeriodoView({ supabase, insumoId, unidad }: { supabase: any; insumoId: string; unidad: string }) {
  const [fechaDesde, setFechaDesde] = useState(firstDayOfMonth())
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<VCompraProductoPeriodo[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
    if (rows.length === 0) return { promedio: 0, minimo: 0, maximo: 0, unidades: 0, valorTotal: 0 }
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

  // Price per purchase over time (oldest → newest), single-series line.
  const precioSerie: BarDatum[] = useMemo(() =>
    [...rows]
      .filter((r) => (r.precio_unitario ?? 0) > 0)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((r) => ({
        label: new Date(r.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
        value: r.precio_unitario ?? 0,
      })),
  [rows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
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

      <ChartFrame
        title="Evolución del precio unitario"
        description="Precio por unidad en cada compra del período"
        isEmpty={!isLoading && precioSerie.length === 0}
        emptyLabel="Sin compras en el período"
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <SimpleLineChart data={precioSerie} valueFormatter={money} />
        )}
      </ChartFrame>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Desglose por Compra</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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

/* ---------------- Anual ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnualView({ supabase, insumoId, unidad }: { supabase: any; insumoId: string; unidad: string }) {
  const currentYear = new Date().getFullYear()
  const [anio, setAnio] = useState<number>(currentYear)
  const [rows, setRows] = useState<VCompraAnualProducto[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  const precioMensual: BarDatum[] = useMemo(() =>
    MESES.map((m, idx) => ({ label: m, value: byMes.get(idx + 1)?.precio_promedio ?? 0 }))
      .filter((d) => d.value > 0),
  [byMes])

  const valorMensual: BarDatum[] = useMemo(() =>
    MESES.map((m, idx) => ({ label: m, value: byMes.get(idx + 1)?.total_valor ?? 0 })),
  [byMes])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const hasData = rows.length > 0

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          title={`Precio promedio mes a mes — ${anio}`}
          description="Precio promedio de compra por mes"
          isEmpty={!isLoading && precioMensual.length === 0}
          emptyLabel={`Sin compras registradas en ${anio}`}
        >
          {isLoading ? <Skeleton className="h-full w-full" /> : <SimpleLineChart data={precioMensual} valueFormatter={money} />}
        </ChartFrame>
        <ChartFrame
          title={`Valor comprado mes a mes — ${anio}`}
          description="Valor total de compras por mes"
          isEmpty={!isLoading && !hasData}
          emptyLabel={`Sin compras registradas en ${anio}`}
        >
          {isLoading ? <Skeleton className="h-full w-full" /> : <SimpleBarChart data={valorMensual} color={CHART_COLORS.aqua} valueFormatter={money} />}
        </ChartFrame>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Detalle Mensual — {anio}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
