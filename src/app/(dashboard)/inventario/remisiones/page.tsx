"use client"

import { Fragment, useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Truck, ChevronRight, ChevronLeft, PackageCheck } from "lucide-react"

const PAGE_SIZE = 20

interface RemisionItemRow {
  id: string
  cantidad_entregada: number
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
  detalle_pedido: { cantidad: number; cantidad_entregada: number | null } | null
}

interface RemisionRow {
  id: string
  numero: string | null
  fecha: string
  created_at: string
  pedidos: { numero_pedido: string } | null
  remision_items: RemisionItemRow[]
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-5 w-[80px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function RemisionesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [remisiones, setRemisiones] = useState<RemisionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const fetchRemisiones = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await supabase
      .from("remisiones")
      .select(`
        id, numero, fecha, created_at,
        pedidos(numero_pedido),
        remision_items(
          id, cantidad_entregada,
          productos(nombre),
          producto_variantes(presentacion),
          detalle_pedido(cantidad, cantidad_entregada)
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (!error && data) {
      setRemisiones(data as unknown as RemisionRow[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, page])

  useEffect(() => { fetchRemisiones() }, [fetchRemisiones])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Remisiones / Entregas</h1>
        <p className="text-muted-foreground mt-1">
          Entregas parciales o totales generadas al despachar pedidos.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : remisiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Truck className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay remisiones aún</p>
              <p className="text-sm">Se generan automáticamente al despachar una ruta.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Remisión</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ítems</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remisiones.map((r) => {
                    const items = r.remision_items ?? []
                    const completos = items.filter((i) => {
                      const d = i.detalle_pedido
                      return d && (d.cantidad_entregada ?? 0) >= d.cantidad
                    }).length
                    const estado = items.length > 0 && completos === items.length ? "completo" : "parcial"
                    const isExpanded = expandedId === r.id
                    return (
                      <Fragment key={r.id}>
                        <TableRow className="group">
                          <TableCell className="font-mono text-sm">{r.numero ?? "—"}</TableCell>
                          <TableCell className="font-medium">{r.pedidos?.numero_pedido ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(r.fecha).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{items.length}</TableCell>
                          <TableCell>
                            {estado === "completo" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
                                <PackageCheck className="h-3 w-3" />Completo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">
                                Parcial
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                              Ver ítems <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30">
                              <div className="py-2 space-y-1.5">
                                {items.map((i) => (
                                  <div key={i.id} className="flex justify-between text-sm px-2">
                                    <span>
                                      {i.productos?.nombre ?? "—"}
                                      {i.producto_variantes?.presentacion && ` — ${i.producto_variantes.presentacion}`}
                                    </span>
                                    <span className="font-medium">{i.cantidad_entregada.toLocaleString("es-CO")}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
