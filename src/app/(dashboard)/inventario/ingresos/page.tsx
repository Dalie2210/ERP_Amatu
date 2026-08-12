"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ArrowDownToLine, ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Ingreso } from "@/types"
import { TIPO_INSUMO_LABELS } from "@/lib/constants/labels"
import { AnularIngresoDialog } from "@/components/inventario/AnularIngresoDialog"

const PAGE_SIZE = 20

type IngresoRow = Ingreso & { ingreso_items: { id: string }[] }

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[160px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[100px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function IngresosPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()
  const [ingresos, setIngresos] = useState<IngresoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const canWrite = role === "admin" || role === "logistica"

  const fetchIngresos = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error, count } = await supabase
      .from("ingresos")
      .select("*, ingreso_items(id)", { count: "exact" })
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (!error && data) {
      setIngresos(data as IngresoRow[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, page])

  useEffect(() => { fetchIngresos() }, [fetchIngresos])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Ingresos de Compra</h1>
          <p className="text-muted-foreground mt-1">
            Registro de compras de materia prima, producto seco, aseo y empaque.
          </p>
        </div>
        {canWrite && (
          <Link href="/inventario/ingresos/nuevo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Ingreso
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : ingresos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <ArrowDownToLine className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay ingresos registrados</p>
              <p className="text-sm">Registra tu primera compra de insumos.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-center"># Ítems</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingresos.map((ing) => (
                    <TableRow key={ing.id} className={ing.anulado ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {ing.numero ?? "—"}
                          {ing.anulado && <Badge variant="destructive" className="font-normal">Anulado</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ing.fecha).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {TIPO_INSUMO_LABELS[ing.tipo_ingreso]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ing.proveedor ?? "—"}</TableCell>
                      <TableCell className="text-center">{ing.ingreso_items?.length ?? 0}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${ing.total_costo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/inventario/ingresos/${ing.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalle">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {canWrite && !ing.anulado && (
                            <>
                              <Link href={`/inventario/ingresos/${ing.id}/editar`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <AnularIngresoDialog
                                ingresoId={ing.id}
                                numero={ing.numero}
                                onAnulado={fetchIngresos}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Anular / Eliminar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount} ingresos
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
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
