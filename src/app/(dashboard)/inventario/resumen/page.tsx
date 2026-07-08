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
import { LayoutList } from "lucide-react"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"

interface ResumenRow {
  item_id: string
  tipo_item: string
  nombre: string
  presentacion: string
  inventario_inicial: number
  entradas: number
  salidas: number
  total_teorico: number
  conteo: number | null
  diferencia: number | null
}

const firstOfMonthISO = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const todayISO = () => new Date().toISOString().slice(0, 10)

const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 })

export default function ResumenInventarioPage() {
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

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Resumen de Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Inventario inicial, entradas, salidas, total teórico, conteo y diferencia por período.
        </p>
      </div>

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
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-primary" />
            Resumen — {new Date(desde).toLocaleDateString("es-CO")} a {new Date(hasta).toLocaleDateString("es-CO")}
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
                  <TableHead className="text-right">Conteo</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
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
                    <TableCell className="text-right">{r.conteo === null ? "—" : fmt(r.conteo)}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.diferencia === null ? "text-muted-foreground" : r.diferencia === 0 ? "text-muted-foreground" : r.diferencia > 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {r.diferencia === null ? "—" : `${r.diferencia > 0 ? "+" : ""}${fmt(r.diferencia)}`}
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
