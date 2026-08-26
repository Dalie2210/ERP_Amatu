"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { History, ChevronLeft, ChevronRight } from "lucide-react"
import type { MotivoDesperdicio } from "@/types"
import { MOTIVO_DESPERDICIO_LABELS } from "@/lib/constants/labels"
import { formatKg } from "./utils"

const PAGE_SIZE = 20

interface Row {
  id: string
  fecha: string
  cantidad_kg: number
  temperatura_c: number | null
  proveedor: string | null
  codigo_lote: string | null
  motivo: MotivoDesperdicio
  razon_dano: string
  accion_correctiva: string | null
  created_at: string
  insumos: { nombre: string; codigo: string | null; unidad_medida: string } | null
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
  users: { full_name: string } | null
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function DesperdicioHistorialPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [motivoFilter, setMotivoFilter] = useState<MotivoDesperdicio | "all">("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const fetchRows = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("desperdicios")
      .select(
        `id, fecha, cantidad_kg, temperatura_c, proveedor, codigo_lote, motivo,
         razon_dano, accion_correctiva, created_at,
         insumos(nombre, codigo, unidad_medida), productos(nombre),
         producto_variantes(presentacion),
         users!desperdicios_created_by_fkey(full_name)`,
        { count: "exact" }
      )
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (motivoFilter !== "all") query = query.eq("motivo", motivoFilter)
    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)

    const { data, count, error } = await query
    if (error) {
      toast.error("No se pudo cargar el histórico de desperdicio")
      console.error(error)
    } else {
      setRows((data ?? []) as unknown as Row[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, motivoFilter, fechaDesde, fechaHasta, page])

  useEffect(() => { void fetchRows() }, [fetchRows])

  const totalKgPagina = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.cantidad_kg), 0),
    [rows]
  )

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select
              value={motivoFilter}
              onValueChange={(v) => { setMotivoFilter((v as MotivoDesperdicio | "all") ?? "all"); setPage(0) }}
            >
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue>
                  {motivoFilter === "all" ? "Todos los motivos" : MOTIVO_DESPERDICIO_LABELS[motivoFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los motivos</SelectItem>
                {Object.entries(MOTIVO_DESPERDICIO_LABELS).map(([value, label]) => (
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
              <p className="text-lg font-medium">Sin desperdicio registrado</p>
              <p className="text-sm">Lo que se guarde desde la pestaña Registro queda aquí.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad (kg)</TableHead>
                      <TableHead className="text-right">Temp. (°C)</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Razones por qué se dañó</TableHead>
                      <TableHead>Acción correctiva</TableHead>
                      <TableHead>Registró</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const nombre = r.insumos?.nombre ?? r.productos?.nombre ?? "—"
                      const sufijo = r.producto_variantes?.presentacion ?? r.insumos?.unidad_medida
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {nombre}
                            {sufijo && <span className="text-muted-foreground"> — {sufijo}</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatKg(Number(r.cantidad_kg))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {r.temperatura_c === null ? "—" : Number(r.temperatura_c)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.proveedor ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{r.codigo_lote ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-[10px] h-5">
                              {MOTIVO_DESPERDICIO_LABELS[r.motivo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[280px] truncate" title={r.razon_dano}>
                            {r.razon_dano}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate" title={r.accion_correctiva ?? ""}>
                            {r.accion_correctiva ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.users?.full_name ?? "—"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {totalPages > 1
                    ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`
                    : `${totalCount} ${totalCount === 1 ? "registro" : "registros"}`}
                  {" · "}
                  <span className="tabular-nums">{formatKg(totalKgPagina)} kg en esta página</span>
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Siguiente<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
