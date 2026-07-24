"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { NuevaOrdenProduccionDialog } from "@/components/inventario/NuevaOrdenProduccionDialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, FlaskConical, AlertTriangle, Ban, ChevronRight } from "lucide-react"
import type { OrdenProduccionExpanded, EstadoProduccion } from "@/types"
import { ESTADO_PRODUCCION_LABELS } from "@/lib/constants/labels"
import { cn } from "@/lib/utils"

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planificada: "secondary",
  en_proceso: "outline",
  parcial: "outline",
  completada: "default",
  cancelada: "destructive",
}

const FILTROS: { value: EstadoProduccion | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "planificada", label: "Planificada" },
  { value: "en_proceso", label: "En Proceso" },
  { value: "parcial", label: "Parcial" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
]

export default function ProduccionPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()

  const [ordenes, setOrdenes] = useState<OrdenProduccionExpanded[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNuevaDialog, setShowNuevaDialog] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<EstadoProduccion | "todas">("todas")

  // Crear/cancelar órdenes (planificación) es de admin/logística; el jefe de
  // producción documenta y completa desde el detalle.
  const canPlanificar = role === "admin" || role === "logistica"

  const fetchOrdenes = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("ordenes_produccion")
      .select(`
        *,
        items:orden_produccion_items(
          *,
          producto:productos!producto_id(nombre),
          variante:producto_variantes!variante_id(presentacion),
          receta:recetas!receta_id(nombre, rendimiento)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      toast.error("Error cargando órdenes: " + error.message)
      setIsLoading(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOrdenes((data ?? []).map((o: any) => ({ ...o, items: o.items ?? [], consumos: [] })))
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchOrdenes() }, [fetchOrdenes])

  const ordenesFiltradas = filtroEstado === "todas" ? ordenes : ordenes.filter((o) => o.estado === filtroEstado)

  async function handleCancelar(o: OrdenProduccionExpanded) {
    const { error } = await supabase.rpc("fn_cancelar_orden_produccion", { p_orden_id: o.id })
    if (error) { toast.error(error.message); return }
    toast.success(`Orden ${o.numero} cancelada.`)
    fetchOrdenes()
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Órdenes de Producción</h1>
          <p className="text-muted-foreground mt-1">
            Producción diaria: consumo de insumos por receta+merma (FEFO) y creación de lotes de PT.
          </p>
        </div>
        {canPlanificar && (
          <Button className="gap-2" onClick={() => setShowNuevaDialog(true)}>
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filtroEstado === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-input hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : ordenesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <FlaskConical className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay órdenes de producción</p>
              <p className="text-sm">Crea la primera orden para empezar a producir.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-center">Ítems</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Planificada</TableHead>
                  <TableHead className="text-right">Producida</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenesFiltradas.map((o) => {
                  const items = o.items ?? []
                  const resumen = items.length === 0
                    ? "—"
                    : items
                        .map((it) => `${it.producto?.nombre ?? "—"} ${it.variante?.presentacion ?? ""}`.trim())
                        .join(", ")
                  const planificada = items.reduce((s, it) => s + (it.cantidad_planificada ?? 0), 0)
                  const producida = items.reduce((s, it) => s + (it.cantidad_producida ?? 0), 0)
                  const costo = items.reduce((s, it) => s + (it.costo_total ?? 0), 0)
                  const algunaProducida = items.some((it) => it.cantidad_producida != null)
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/inventario/produccion/${o.id}`} className="text-primary hover:underline">
                          {o.numero}
                        </Link>
                        {o.orden_origen_id && (
                          <span className="block text-[10px] text-muted-foreground font-sans mt-0.5">Reposición</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[280px] truncate" title={resumen}>{resumen}</TableCell>
                      <TableCell className="text-muted-foreground text-center">{items.length}</TableCell>
                      <TableCell className="text-muted-foreground">{o.fecha}</TableCell>
                      <TableCell className="text-right">{planificada.toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-right">{algunaProducida ? producida.toLocaleString("es-CO") : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {costo > 0 ? `$${costo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={ESTADO_VARIANT[o.estado] ?? "secondary"}
                          className={cn("gap-1", o.estado === "parcial" && "border-amber-500 text-amber-600")}
                        >
                          {o.estado === "parcial" && <AlertTriangle className="h-3 w-3" />}
                          {ESTADO_PRODUCCION_LABELS[o.estado] ?? o.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/inventario/produccion/${o.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              Ver detalle
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {canPlanificar && o.estado === "planificada" && items.every((it) => it.estado === "planificada") && (
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                    <Ban className="h-3.5 w-3.5" />
                                    Cancelar
                                  </Button>
                                }
                              />
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar orden {o.numero}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {o.orden_origen_id
                                      ? "Esta es una orden de reposición generada automáticamente. Si la cancelas, el faltante no se producirá."
                                      : "La orden no tiene producción registrada, se puede cancelar sin afectar inventario."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Volver</AlertDialogCancel>
                                  <AlertDialogAction variant="destructive" onClick={() => handleCancelar(o)}>
                                    Cancelar orden
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NuevaOrdenProduccionDialog
        open={showNuevaDialog}
        onOpenChange={setShowNuevaDialog}
        onSaved={fetchOrdenes}
      />
    </div>
  )
}
