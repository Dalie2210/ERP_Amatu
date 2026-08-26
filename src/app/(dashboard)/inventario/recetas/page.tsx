"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { RecetaFormDialog } from "@/components/inventario/RecetaFormDialog"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ClipboardList, Edit, Trash2 } from "lucide-react"
import { PORCION_ESTANDAR_G, formatGramaje } from "@/lib/inventario/mezcla"
import type { RecetaExpanded } from "@/types"

export default function RecetasPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()
  const searchParams = useSearchParams()
  const defaultProductoId = searchParams.get("producto")

  const [recetas, setRecetas] = useState<RecetaExpanded[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingReceta, setEditingReceta] = useState<RecetaExpanded | null>(null)

  const canWrite = role === "admin" || role === "logistica"

  const fetchRecetas = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("recetas")
      .select(`
        *,
        producto:productos!producto_id(nombre),
        variante:producto_variantes!variante_id(presentacion),
        receta_items(*, insumo:insumos!insumo_id(nombre, unidad_medida, merma_pct, rendimiento_pct))
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Error cargando recetas: " + error.message)
      setIsLoading(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRecetas((data ?? []) as any)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchRecetas() }, [fetchRecetas])

  useEffect(() => {
    if (defaultProductoId) setShowDialog(true)
  }, [defaultProductoId])

  const openCreate = () => {
    setEditingReceta(null)
    setShowDialog(true)
  }

  const openEdit = (receta: RecetaExpanded) => {
    setEditingReceta(receta)
    setShowDialog(true)
  }

  const handleDelete = async (id: string, nombre: string) => {
    const { error } = await supabase.from("recetas").delete().eq("id", id)
    if (error) {
      toast.error(
        error.code === "23503"
          ? "No se puede eliminar: la receta tiene órdenes de producción asociadas."
          : "Error al eliminar: " + error.message
      )
      throw new Error(error.message)
    }
    setRecetas((prev) => prev.filter((r) => r.id !== id))
    toast.success(`Receta "${nombre}" eliminada.`)
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Recetas (BOM)</h1>
          <p className="text-muted-foreground mt-1">
            Fórmula de cada dieta por porción estándar de {formatGramaje(PORCION_ESTANDAR_G)}, en
            peso cocido/procesado. Las demás presentaciones se derivan de esta base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventario/recetas/resumen">
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Amarre de cocción
            </Button>
          </Link>
          {canWrite && (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva Receta
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recetas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <ClipboardList className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay recetas aún</p>
              <p className="text-sm">Crea la primera receta para poder producir.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Receta</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Ingredientes</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recetas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.producto?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.variante?.presentacion ?? "Todas"}
                    </TableCell>
                    <TableCell>
                      {r.nombre}
                      {r.reemplazada_por && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (reemplazada por otra receta)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.base_modo === "unidades"
                        ? `${r.base_gramos ?? r.rendimiento} u.`
                        : formatGramaje(r.base_gramos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.receta_items.length}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge active={r.is_active} activeLabel="Activa" inactiveLabel="Inactiva" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {role === "admin" && (
                          <DeleteConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            entityLabel={r.nombre}
                            confirmToken={r.nombre}
                            description="Se eliminará la receta y sus ingredientes. Si tiene órdenes de producción asociadas, la eliminación será bloqueada."
                            onConfirm={() => handleDelete(r.id, r.nombre)}
                          />
                        )}
                        {canWrite && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(r)}>
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecetaFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        receta={editingReceta}
        defaultProductoId={editingReceta ? null : defaultProductoId}
        onSaved={fetchRecetas}
      />
    </div>
  )
}
