"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { LayoutList } from "lucide-react"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { ChartFrame, SimpleBarChart, CHART_GOOD, CHART_BAD, type BarDatum } from "./InvChart"

interface ResumenRow {
  item_id: string
  tipo_item: string
  nombre: string
  presentacion: string
  inventario_inicial: number
  entradas: number
  salidas: number
  total_teorico: number
  /** Suma neta de ajustes (ajuste_positivo + ajuste_negativo + merma) registrados en el período. */
  ajustes: number
  /** Cantidad de movimientos de ajuste registrados en el período. */
  num_ajustes: number
}

const firstOfMonthISO = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const todayISO = () => new Date().toISOString().slice(0, 10)

const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 })

export function BalancePanel() {
  const supabase = useMemo(() => createClient(), [])
  const [desde, setDesde] = useState(firstOfMonthISO())
  const [hasta, setHasta] = useState(todayISO())
  const [categoria, setCategoria] = useState<string>("all")
  const [rows, setRows] = useState<ResumenRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchResumen = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase.rpc("fn_resumen_inventario", {
      p_desde: desde,
      p_hasta: hasta,
      p_categoria: categoria === "all" ? null : categoria,
    })
    if (!error && data) setRows(data as ResumenRow[])
    setIsLoading(false)
  }, [supabase, desde, hasta, categoria])

  useEffect(() => { fetchResumen() }, [fetchResumen])

  // Top adjustments: items with the largest net manual corrections in the period —
  // this is the real "difference found" signal now that counting happens via
  // direct ajustes instead of a formal conteo record.
  const topAjustes: BarDatum[] = useMemo(() => {
    return rows
      .filter((r) => r.ajustes !== 0)
      .map((r) => ({
        label: r.presentacion ? `${r.nombre} — ${r.presentacion}` : r.nombre,
        value: r.ajustes,
        color: r.ajustes > 0 ? CHART_GOOD : CHART_BAD,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 8)
      .reverse()
  }, [rows])

  const totalAjustes = useMemo(() => rows.reduce((s, r) => s + r.num_ajustes, 0), [rows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" className="w-[170px]" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" className="w-[170px]" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v ?? "all")}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue>{categoria === "all" ? "Todas las categorías" : CATEGORIA_CONTEO_LABELS[categoria]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(CATEGORIA_CONTEO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isLoading && (
              <Badge variant="outline" className="ml-auto">
                {totalAjustes} {totalAjustes === 1 ? "ajuste registrado" : "ajustes registrados"} en el período
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <ChartFrame
        title="Mayores ajustes registrados"
        description="Ítems con más correcciones manuales (positivas o negativas) en el período"
        isEmpty={!isLoading && topAjustes.length === 0}
        emptyLabel="Sin ajustes registrados en el período"
        height={Math.max(200, topAjustes.length * 34 + 40)}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <SimpleBarChart data={topAjustes} horizontal valueFormatter={fmt} showLabels />
        )}
      </ChartFrame>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-primary" />
            Balance — {new Date(desde).toLocaleDateString("es-CO")} a {new Date(hasta).toLocaleDateString("es-CO")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <LayoutList className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sin datos en el período</p>
              <p className="text-sm">Ajusta el rango de fechas o la categoría.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto / Insumo</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Inv. Inicial</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-right">Total Teórico</TableHead>
                  <TableHead className="text-right">Ajustes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.tipo_item}-${r.item_id}`}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.presentacion}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmt(r.inventario_inicial)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{fmt(r.entradas)}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(r.salidas)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.total_teorico)}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.ajustes === 0 ? "text-muted-foreground" : r.ajustes > 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {r.ajustes === 0 ? "—" : `${r.ajustes > 0 ? "+" : ""}${fmt(r.ajustes)}`}
                    </TableCell>
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
