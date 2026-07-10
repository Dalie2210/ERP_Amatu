"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { NuevaOrdenProduccionDialog } from "@/components/inventario/NuevaOrdenProduccionDialog"
import { CompletarOrdenDialog } from "@/components/inventario/CompletarOrdenDialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, FlaskConical, CheckCircle2 } from "lucide-react"
import type { OrdenProduccionExpanded } from "@/types"
import { ESTADO_PRODUCCION_LABELS } from "@/lib/constants/labels"

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planificada: "secondary",
  en_proceso: "outline",
  completada: "default",
  cancelada: "destructive",
}

export default function ProduccionPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()

  const [ordenes, setOrdenes] = useState<OrdenProduccionExpanded[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNuevaDialog, setShowNuevaDialog] = useState(false)
  const [completandoOrden, setCompletandoOrden] = useState<OrdenProduccionExpanded | null>(null)

  const canWrite = role === "admin" || role === "logistica"

  const fetchOrdenes = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("ordenes_produccion")
      .select(`
        *,
        producto:productos!producto_id(nombre),
        variante:producto_variantes!variante_id(presentacion),
        receta:recetas!receta_id(nombre, rendimiento)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      toast.error("Error cargando órdenes: " + error.message)
      setIsLoading(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOrdenes((data ?? []).map((o: any) => ({ ...o, consumos: [] })))
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchOrdenes() }, [fetchOrdenes])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Órdenes de Producción</h1>
          <p className="text-muted-foreground mt-1">
            Producción diaria: consumo de insumos por receta+merma (FEFO) y creación de lotes de PT.
          </p>
        </div>
        {canWrite && (
          <Button className="gap-2" onClick={() => setShowNuevaDialog(true)}>
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : ordenes.length === 0 ? (
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
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Planificada</TableHead>
                  <TableHead className="text-right">Producida</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                    <TableCell className="font-medium">{o.producto?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{o.variante?.presentacion ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{o.fecha}</TableCell>
                    <TableCell className="text-right">{o.cantidad_planificada}</TableCell>
                    <TableCell className="text-right">{o.cantidad_producida ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.costo_total != null ? `$${o.costo_total.toLocaleString("es-CO", { maximumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={ESTADO_VARIANT[o.estado] ?? "secondary"}>
                        {ESTADO_PRODUCCION_LABELS[o.estado] ?? o.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && (o.estado === "planificada" || o.estado === "en_proceso") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setCompletandoOrden(o)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

      <CompletarOrdenDialog
        open={completandoOrden !== null}
        onOpenChange={(v) => !v && setCompletandoOrden(null)}
        orden={completandoOrden}
        onCompleted={fetchOrdenes}
      />
    </div>
  )
}
