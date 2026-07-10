"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { useAuth } from "@/hooks/useAuth"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plus, Search, Warehouse, Edit, Eye, ChevronRight, ChevronLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Insumo, TipoInsumo, UnidadMedida, VStockInsumo } from "@/types"
import type { Database } from "@/types/database.types"
import { TIPO_INSUMO_LABELS, UNIDAD_MEDIDA_LABELS } from "@/lib/constants/labels"

const PAGE_SIZE = 20

type InsumoRow = Insumo & { stock: VStockInsumo | null }

const emptyForm = () => ({
  nombre: "",
  tipo: "materia_prima" as TipoInsumo,
  unidad_medida: "kg" as UnidadMedida,
  stock_minimo: "",
  merma_pct: "0",
  notas: "",
})

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[80px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function InsumosPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()
  const searchParams = useSearchParams()
  const filtro = searchParams.get("filtro") // "bajo_minimo" | "por_vencer"
  const [insumos, setInsumos] = useState<InsumoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTipo, setSelectedTipo] = useState<TipoInsumo | "all">("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const debouncedSearch = useDebounce(searchQuery, 400)

  const [form, setForm] = useState(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canWrite = role === "admin" || role === "logistica"

  const fetchInsumos = useCallback(async () => {
    setIsLoading(true)

    let query = supabase
      .from("insumos")
      .select("*", { count: "exact" })
      .order("nombre", { ascending: true })

    if (selectedTipo !== "all") {
      query = query.eq("tipo", selectedTipo)
    }
    if (debouncedSearch.trim()) {
      query = query.ilike("nombre", `%${debouncedSearch}%`)
    }
    // Con filtro de alerta (bajo mínimo / por vencer) traemos todo para filtrar en cliente
    if (!filtro) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error || !data) {
      setIsLoading(false)
      return
    }

    const { data: stockData } = await supabase.from("v_stock_insumos").select("*")
    const stockById = new Map((stockData ?? []).map((s) => [s.insumo_id, s as unknown as VStockInsumo]))

    let rows = data.map((i: Insumo) => ({ ...i, stock: stockById.get(i.id) ?? null }))
    if (filtro === "bajo_minimo") rows = rows.filter((r: InsumoRow) => r.stock?.bajo_minimo)
    if (filtro === "por_vencer") rows = rows.filter((r: InsumoRow) => (r.stock?.lotes_por_vencer ?? 0) > 0)

    setInsumos(rows)
    setTotalCount(filtro ? rows.length : count ?? 0)
    setIsLoading(false)
  }, [supabase, selectedTipo, debouncedSearch, page, filtro])

  useEffect(() => { setPage(0) }, [debouncedSearch, selectedTipo])
  useEffect(() => { fetchInsumos() }, [fetchInsumos])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setSaveError(null)
    setShowDialog(true)
  }

  const openEdit = (insumo: Insumo) => {
    setEditingId(insumo.id)
    setForm({
      nombre: insumo.nombre,
      tipo: insumo.tipo,
      unidad_medida: insumo.unidad_medida,
      stock_minimo: String(insumo.stock_minimo),
      merma_pct: String(insumo.merma_pct),
      notas: insumo.notas ?? "",
    })
    setSaveError(null)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setSaveError("El nombre es requerido.")
      return
    }
    setIsSaving(true)
    setSaveError(null)

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      unidad_medida: form.unidad_medida,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
      merma_pct: parseFloat(form.merma_pct) || 0,
      notas: form.notas.trim() || null,
    }

    const { error } = editingId
      ? await supabase.from("insumos").update(payload).eq("id", editingId)
      : await supabase.from("insumos").insert([payload as Database["public"]["Tables"]["insumos"]["Insert"]])

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
      return
    }

    setShowDialog(false)
    fetchInsumos()
    toast.success(editingId ? "Insumo actualizado." : "Insumo creado.")
    setIsSaving(false)
  }

  const handleDelete = async (id: string, nombre: string) => {
    const res = await fetch(`/api/admin/insumos/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Error al eliminar insumo.")
      throw new Error(data.error)
    }
    setInsumos((prev) => prev.filter((i) => i.id !== id))
    setTotalCount((c) => c - 1)
    toast.success(`${nombre} eliminado.`)
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    setInsumos((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !current } : i)))
    const { error } = await supabase.from("insumos").update({ is_active: !current }).eq("id", id)
    if (error) {
      setInsumos((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: current } : i)))
      toast.error("No se pudo actualizar el estado.")
    }
  }

  return (
    <TooltipProvider>
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Insumos</h1>
          <p className="text-muted-foreground mt-1">
            Maestro de materia prima, producto seco, aseo y empaque.
          </p>
        </div>
        {filtro && (
          <Badge className="gap-1">
            {filtro === "bajo_minimo" ? "Filtrando: bajo mínimo" : "Filtrando: por vencer (≤30 días)"}
            <Link href="/inventario/insumos" className="ml-1 underline">Quitar</Link>
          </Badge>
        )}
        {canWrite && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger render={<Button className="gap-2" onClick={openCreate} />}>
              <Plus className="h-4 w-4" />
              Nuevo Insumo
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Insumo" : "Crear Insumo"}</DialogTitle>
                <DialogDescription>
                  El código se genera automáticamente según el tipo de insumo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Pechuga de pollo"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.tipo}
                      onValueChange={(v) => v && setForm({ ...form, tipo: v as TipoInsumo })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar...">
                          {TIPO_INSUMO_LABELS[form.tipo]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_INSUMO_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad de Medida</Label>
                    <Select
                      value={form.unidad_medida}
                      onValueChange={(v) => v && setForm({ ...form, unidad_medida: v as UnidadMedida })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar...">
                          {UNIDAD_MEDIDA_LABELS[form.unidad_medida]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIDAD_MEDIDA_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      placeholder="10"
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merma_pct">Merma (%)</Label>
                    <Input
                      id="merma_pct"
                      type="number"
                      placeholder="5"
                      value={form.merma_pct}
                      onChange={(e) => setForm({ ...form, merma_pct: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    placeholder="Notas internas del insumo..."
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  />
                </div>

                {saveError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                    {saveError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !form.nombre.trim()}>
                  {isSaving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Insumo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedTipo} onValueChange={(v) => setSelectedTipo((v as TipoInsumo | "all") ?? "all")}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todos los tipos">
                  {selectedTipo === "all" ? "Todos los tipos" : TIPO_INSUMO_LABELS[selectedTipo]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(TIPO_INSUMO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : insumos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Warehouse className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay insumos aún</p>
              <p className="text-sm">Crea el primer insumo para empezar a registrar ingresos.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-right">Costo / Unidad</TableHead>
                    <TableHead className="text-right">Stock Mín.</TableHead>
                    <TableHead className="text-right">Merma %</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map((insumo) => {
                    const bajoMinimo = insumo.stock?.bajo_minimo ?? (0 < insumo.stock_minimo)
                    return (
                      <TableRow key={insumo.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{insumo.nombre}</span>
                            <span className="text-xs text-muted-foreground font-mono">{insumo.codigo}</span>
                            {bajoMinimo && (
                              <Badge variant="destructive" className="text-xs">Bajo mínimo</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {TIPO_INSUMO_LABELS[insumo.tipo]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {UNIDAD_MEDIDA_LABELS[insumo.unidad_medida]}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(insumo.stock?.stock_disponible ?? 0).toLocaleString("es-CO")} {insumo.unidad_medida}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${insumo.costo_promedio.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                          <span className="text-xs"> / {insumo.unidad_medida}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {insumo.stock_minimo.toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {insumo.merma_pct}%
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge
                            active={insumo.is_active}
                            className="cursor-pointer"
                            onClick={() => canWrite && handleToggleActive(insumo.id, insumo.is_active)}
                          />
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
                                entityLabel={insumo.nombre}
                                confirmToken={insumo.nombre}
                                description="Se eliminará el insumo. Si tiene lotes, movimientos o recetas asociadas, la eliminación será bloqueada."
                                onConfirm={() => handleDelete(insumo.id, insumo.nombre)}
                              />
                            )}
                            {canWrite && (
                              <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(insumo)}>
                                <Edit className="h-4 w-4" />
                                Editar
                              </Button>
                            )}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    render={<Link href={`/inventario/insumos/${insumo.id}`} />}
                                    nativeButton={false}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount} insumos
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
    </TooltipProvider>
  )
}
