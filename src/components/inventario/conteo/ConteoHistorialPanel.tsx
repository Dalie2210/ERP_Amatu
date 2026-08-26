"use client"

import { Fragment, useEffect, useState, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { History, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from "lucide-react"
import type { CategoriaConteo, EstadoConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS, ESTADO_CONTEO_LABELS, ESTADO_CONTEO_STYLES } from "@/lib/constants/labels"
import { formatCantidad } from "./utils"

const PAGE_SIZE = 20

interface SesionRow {
  id: string
  fecha: string
  categoria: CategoriaConteo
  notas: string | null
  created_at: string
  estado: EstadoConteo
  motivo_rechazo: string | null
  users: { full_name: string } | null
  conteo_items: { count: number }[]
}

interface DetalleRow {
  id: string
  cantidad_sistema: number
  cantidad_contada: number
  diferencia: number
  insumos: { nombre: string; codigo: string | null; unidad_medida: string } | null
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function ConteoHistorialPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<SesionRow[]>([])
  const [difCounts, setDifCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaConteo | "all">("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<DetalleRow[]>([])
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false)

  const fetchSesiones = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("conteos_inventario")
      .select(
        "id, fecha, categoria, notas, created_at, estado, motivo_rechazo, users!conteos_inventario_created_by_fkey(full_name), conteo_items(count)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to)

    if (categoriaFilter !== "all") query = query.eq("categoria", categoriaFilter)
    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)

    const { data, count, error } = await query
    if (error) {
      toast.error("No se pudo cargar el histórico de conteos")
      console.error(error)
    }
    if (!error && data) {
      const sesiones = data as unknown as SesionRow[]
      setRows(sesiones)
      setTotalCount(count ?? 0)

      // "Con diferencia" es un agregado filtrado que PostgREST no expone en el
      // embed, así que se resuelve con una consulta aparte sobre la página visible.
      const ids = sesiones.map((s) => s.id)
      if (ids.length > 0) {
        const { data: difs } = await supabase
          .from("conteo_items")
          .select("conteo_id")
          .in("conteo_id", ids)
          .neq("diferencia", 0)
        const counts: Record<string, number> = {}
        for (const d of (difs ?? []) as { conteo_id: string }[]) {
          counts[d.conteo_id] = (counts[d.conteo_id] ?? 0) + 1
        }
        setDifCounts(counts)
      } else {
        setDifCounts({})
      }
    }
    setIsLoading(false)
  }, [supabase, categoriaFilter, fechaDesde, fechaHasta, page])

  useEffect(() => { void fetchSesiones() }, [fetchSesiones])

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setDetalle([])
      return
    }
    setExpandedId(id)
    setDetalle([])
    setIsLoadingDetalle(true)
    const { data } = await supabase
      .from("conteo_items")
      .select(`
        id, cantidad_sistema, cantidad_contada, diferencia,
        insumos(nombre, codigo, unidad_medida), productos(nombre), producto_variantes(presentacion)
      `)
      .eq("conteo_id", id)
    setDetalle((data ?? []) as unknown as DetalleRow[])
    setIsLoadingDetalle(false)
  }, [supabase, expandedId])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select
              value={categoriaFilter}
              onValueChange={(v) => { setCategoriaFilter((v as CategoriaConteo | "all") ?? "all"); setPage(0) }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue>
                  {categoriaFilter === "all" ? "Todas las categorías" : CATEGORIA_CONTEO_LABELS[categoriaFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORIA_CONTEO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-full sm:w-[160px]" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPage(0) }} />
            <Input type="date" className="w-full sm:w-[160px]" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPage(0) }} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <History className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sin conteos registrados</p>
              <p className="text-sm">Cada guardado masivo desde la pestaña Conteo queda aquí.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Ítems</TableHead>
                      <TableHead className="text-right">Con diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => {
                      const totalItems = s.conteo_items?.[0]?.count ?? 0
                      const conDif = difCounts[s.id] ?? 0
                      const abierto = expandedId === s.id
                      const colSpan = 8
                      return (
                        <Fragment key={s.id}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => void toggleExpand(s.id)}
                          >
                            <TableCell>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${abierto ? "" : "-rotate-90"}`} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {new Date(s.created_at).toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-sm">{CATEGORIA_CONTEO_LABELS[s.categoria]}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{s.users?.full_name ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{totalItems}</TableCell>
                            <TableCell className="text-right">
                              {conDif > 0
                                ? <Badge variant="secondary">{conDif}</Badge>
                                : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] h-5 ${ESTADO_CONTEO_STYLES[s.estado]}`}>
                                {ESTADO_CONTEO_LABELS[s.estado]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate" title={s.notas ?? ""}>
                              {s.notas ?? "—"}
                            </TableCell>
                          </TableRow>

                          {abierto && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={colSpan} className="bg-muted/30 p-0">
                                {s.estado === "rechazado" && s.motivo_rechazo && (
                                  <p className="px-6 pt-4 text-sm text-destructive">
                                    <span className="font-medium">Motivo de rechazo:</span> {s.motivo_rechazo}
                                  </p>
                                )}
                                {isLoadingDetalle ? (
                                  <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />Cargando detalle...
                                  </div>
                                ) : detalle.length === 0 ? (
                                  <p className="p-6 text-sm text-muted-foreground">Sin ítems.</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-muted-foreground">
                                        <th className="px-6 py-2 font-medium">Ítem</th>
                                        <th className="px-3 py-2 font-medium text-right">Sistema</th>
                                        <th className="px-3 py-2 font-medium text-right">Contado</th>
                                        <th className="px-6 py-2 font-medium text-right">Diferencia</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detalle.map((d) => {
                                        const nombre = d.insumos?.nombre ?? d.productos?.nombre ?? "—"
                                        const sufijo = d.producto_variantes?.presentacion ?? d.insumos?.unidad_medida
                                        return (
                                          <tr key={d.id} className="border-t border-border/50">
                                            <td className="px-6 py-2">
                                              {d.insumos?.codigo && (
                                                <span className="font-mono text-xs text-muted-foreground mr-2">{d.insumos.codigo}</span>
                                              )}
                                              {nombre}
                                              {sufijo && <span className="text-muted-foreground"> — {sufijo}</span>}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                              {formatCantidad(Number(d.cantidad_sistema))}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                              {formatCantidad(Number(d.cantidad_contada))}
                                            </td>
                                            <td className="px-6 py-2 text-right tabular-nums font-semibold">
                                              {Number(d.diferencia) === 0 ? (
                                                <span className="text-muted-foreground font-normal">0</span>
                                              ) : (
                                                <span className={Number(d.diferencia) > 0 ? "text-emerald-600" : "text-destructive"}>
                                                  {Number(d.diferencia) > 0 ? "+" : ""}{formatCantidad(Number(d.diferencia))}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

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
