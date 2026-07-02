"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ListTree, Search, ChevronRight, ChevronLeft } from "lucide-react"
import type { TipoMovimiento } from "@/types"
import { TIPO_MOVIMIENTO_LABELS } from "@/lib/constants/labels"

const PAGE_SIZE = 30

interface MovimientoRow {
  id: string
  tipo: TipoMovimiento
  cantidad: number
  costo_unitario: number
  referencia_tipo: string | null
  referencia_id: string | null
  created_at: string
  insumos: { nombre: string } | null
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
  users: { full_name: string } | null
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[140px]" />
          <Skeleton className="h-5 w-[180px]" />
          <Skeleton className="h-5 w-[80px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function MovimientosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<MovimientoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [tipoFilter, setTipoFilter] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const debouncedSearch = useDebounce(searchQuery, 400)

  const fetchMovimientos = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("movimientos_inventario")
      .select(`
        id, tipo, cantidad, costo_unitario, referencia_tipo, referencia_id, created_at,
        insumos(nombre), productos(nombre), producto_variantes(presentacion), users(full_name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (tipoFilter !== "all") query = query.eq("tipo", tipoFilter)
    if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`)
    if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`)

    const { data, count, error } = await query
    if (!error && data) {
      setRows(data as unknown as MovimientoRow[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, tipoFilter, fechaDesde, fechaHasta, page])

  useEffect(() => { setPage(0) }, [tipoFilter, fechaDesde, fechaHasta, debouncedSearch])
  useEffect(() => { fetchMovimientos() }, [fetchMovimientos])

  const filtered = rows.filter((r) => {
    if (!debouncedSearch.trim()) return true
    const q = debouncedSearch.toLowerCase()
    return (r.insumos?.nombre.toLowerCase().includes(q)) || (r.productos?.nombre.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Movimientos de Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Kardex global: ingresos, consumos, despachos, ajustes y mermas.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo o producto..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todos los tipos">
                  {tipoFilter === "all" ? "Todos los tipos" : TIPO_MOVIMIENTO_LABELS[tipoFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(TIPO_MOVIMIENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-full sm:w-[160px]" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            <Input type="date" className="w-full sm:w-[160px]" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <ListTree className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay movimientos</p>
              <p className="text-sm">Los movimientos se registran automáticamente con cada operación.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Insumo / PT</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const nombre = m.insumos?.nombre ?? m.productos?.nombre ?? "—"
                    const presentacion = m.producto_variantes?.presentacion
                    const positivo = m.cantidad >= 0
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-sm">{TIPO_MOVIMIENTO_LABELS[m.tipo] ?? m.tipo}</TableCell>
                        <TableCell className="font-medium">
                          {nombre}{presentacion && ` — ${presentacion}`}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${positivo ? "text-emerald-600" : "text-destructive"}`}>
                          {positivo ? "+" : ""}{m.cantidad.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${m.costo_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.referencia_tipo ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.users?.full_name ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Siguiente<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
