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
import type { EstadoDonacion } from "@/types"
import {
  ESTADO_DONACION_LABELS, ESTADO_DONACION_STYLES, ORIGEN_DONACION_LABELS,
} from "@/lib/constants/labels"
import { DONACION_SELECT, formatCOP, resumenDonacion, type DonacionRow } from "./utils"

const PAGE_SIZE = 20

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function DonacionesHistorialPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<DonacionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState<EstadoDonacion | "all">("all")
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
      .from("donaciones")
      .select(DONACION_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (estadoFilter !== "all") query = query.eq("estado", estadoFilter)
    if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`)
    if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`)

    const { data, count, error } = await query
    if (error) {
      toast.error("No se pudo cargar el histórico de donaciones")
      console.error(error)
    } else {
      setRows((data ?? []) as unknown as DonacionRow[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, estadoFilter, fechaDesde, fechaHasta, page])

  useEffect(() => { void fetchRows() }, [fetchRows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select
              value={estadoFilter}
              onValueChange={(v) => { setEstadoFilter((v as EstadoDonacion | "all") ?? "all"); setPage(0) }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue>
                  {estadoFilter === "all" ? "Todos los estados" : ESTADO_DONACION_LABELS[estadoFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(ESTADO_DONACION_LABELS).map(([value, label]) => (
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
              <p className="text-lg font-medium">Sin donaciones registradas</p>
              <p className="text-sm">Aquí quedan las donaciones de órdenes de venta y de lotes de stock.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Producto / dieta</TableHead>
                      <TableHead>Destinatario</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Valor comercial</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registró</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(d.created_at).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-[10px] h-5">
                            {ORIGEN_DONACION_LABELS[d.origen]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[280px] truncate" title={resumenDonacion(d)}>
                          {resumenDonacion(d)}
                        </TableCell>
                        <TableCell className="text-sm">{d.destinatario}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate" title={d.motivo}>
                          {d.motivo}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCOP(Number(d.valor_comercial))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${ESTADO_DONACION_STYLES[d.estado]}`}
                            title={d.estado === "rechazada" ? d.motivo_rechazo ?? "" : undefined}
                          >
                            {ESTADO_DONACION_LABELS[d.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.users?.full_name ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
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
