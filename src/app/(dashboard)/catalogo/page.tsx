"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { useAuth } from "@/hooks/useAuth"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Search,
  Package,
  Edit,
  ChevronRight,
  ChevronLeft,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { TipoPrecio } from "@/types"
import { TIPO_PRECIO_LABELS } from "@/lib/constants/labels"

// ---------- Constants ----------
const PAGE_SIZE = 20

// ---------- Types ----------
interface Categoria {
  id: string
  nombre: string
  slug: string
}

interface CategoriaProducto {
  id: string
  nombre: string
  slug: string
}

interface Producto {
  id: string
  sku: string | null
  nombre: string
  categoria_id: string
  tipo_precio: TipoPrecio
  es_magistral: boolean
  aplica_descuento_compra: boolean
  is_active: boolean
  notas: string | null
  created_at: string
  categorias_producto?: CategoriaProducto
  producto_variantes?: { sku: string }[]
}

interface NuevaVariante {
  sku: string
  presentacion: string
  precio_publico: string
  precio_por_gramo: string
}

const emptyVariante = (): NuevaVariante => ({
  sku: "",
  presentacion: "",
  precio_publico: "",
  precio_por_gramo: "",
})

// ---------- Skeleton Loader ----------
function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ---------- Component ----------
export default function CatalogoPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Pagination
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const debouncedSearch = useDebounce(searchQuery, 400)

  // Create form state (no SKU on parent)
  const [newProduct, setNewProduct] = useState({
    nombre: "",
    categoria_id: "",
    tipo_precio: "por_variante" as TipoPrecio,
    es_magistral: false,
    aplica_descuento_compra: true,
    notas: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Inline variant rows for the create dialog
  const [newVariantes, setNewVariantes] = useState<NuevaVariante[]>([emptyVariante()])
  const [pesosmagistralescargados, setPesosmagistralescargados] = useState<string[]>([])

  const addVarianteRow = () => setNewVariantes((p) => [...p, emptyVariante()])
  const removeVarianteRow = (i: number) =>
    setNewVariantes((p) => p.filter((_, idx) => idx !== i))
  const updateVarianteRow = (i: number, patch: Partial<NuevaVariante>) =>
    setNewVariantes((p) =>
      p.map((v, idx) => {
        if (idx !== i) return v
        const updated = { ...v, ...patch }
        if ("presentacion" in patch || "precio_publico" in patch) {
          const peso = parseFloat(updated.presentacion)
          const precio = parseFloat(updated.precio_publico)
          if (!isNaN(peso) && peso > 0 && !isNaN(precio) && precio > 0) {
            updated.precio_por_gramo = (precio / peso).toFixed(2)
          }
        }
        return updated
      })
    )

  const fetchProductos = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("productos")
      .select("*, categorias_producto(id, nombre, slug), producto_variantes(sku)", {
        count: "exact",
      })
      .order("nombre", { ascending: true })
      .range(from, to)

    if (selectedCategoria !== "all") {
      query = query.eq("categoria_id", selectedCategoria)
    }

    if (debouncedSearch.trim()) {
      query = query.ilike("nombre", `%${debouncedSearch}%`)
    }

    const { data, error, count } = await query

    if (!error && data) {
      setProductos(data as Producto[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, selectedCategoria, debouncedSearch, page])

  useEffect(() => {
    if (!showCreateDialog) return
    supabase.from("pesos_magistrales").select("peso_g").order("peso_g").then(({ data }: { data: any }) => {
      if (data) setPesosmagistralescargados(data.map((d: any) => `${d.peso_g}g`))
    })
  }, [showCreateDialog])

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from("categorias_producto")
      .select("*")
      .order("nombre")
    if (data) setCategorias(data)
  }, [supabase])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, selectedCategoria])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const handleCreate = async () => {
    setIsSaving(true)
    setSaveError(null)

    const validVariantes = newVariantes.filter(
      (v) => v.sku.trim() && v.presentacion.trim() && v.precio_publico.trim()
    )

    if (validVariantes.length === 0) {
      setSaveError(
        "Debes agregar al menos una variante con SKU, presentación y precio."
      )
      setIsSaving(false)
      return
    }

    const { data: productData, error: productError } = await supabase
      .from("productos")
      .insert([
        {
          nombre: newProduct.nombre,
          categoria_id: newProduct.categoria_id,
          tipo_precio: newProduct.tipo_precio,
          es_magistral: newProduct.es_magistral,
          aplica_descuento_compra: newProduct.aplica_descuento_compra,
          notas: newProduct.notas || null,
        },
      ])
      .select("id")
      .single()

    if (productError || !productData) {
      setSaveError(productError?.message ?? "Error al crear el producto.")
      setIsSaving(false)
      return
    }

    const productoId = productData.id

    const varianteRows = validVariantes.map((v) => ({
      producto_id: productoId,
      sku: v.sku.trim(),
      presentacion: v.presentacion.trim(),
      precio_publico: parseFloat(v.precio_publico),
      precio_por_gramo: v.precio_por_gramo ? parseFloat(v.precio_por_gramo) : null,
    }))

    const { error: varianteError } = await supabase
      .from("producto_variantes")
      .insert(varianteRows)

    if (varianteError) {
      await supabase.from("productos").delete().eq("id", productoId)
      setSaveError(`Error en variantes: ${varianteError.message}`)
      setIsSaving(false)
      return
    }

    setShowCreateDialog(false)
    setNewProduct({
      nombre: "",
      categoria_id: "",
      tipo_precio: "por_variante",
      es_magistral: false,
      aplica_descuento_compra: true,
      notas: "",
    })
    setNewVariantes([emptyVariante()])
    fetchProductos()
    setIsSaving(false)
  }

  const handleDeleteProducto = async (productoId: string, nombre: string) => {
    const res = await fetch(`/api/admin/productos/${productoId}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Error al eliminar producto.")
      throw new Error(data.error)
    }
    setProductos((prev) => prev.filter((p) => p.id !== productoId))
    setTotalCount((c) => c - 1)
    toast.success(`${nombre} eliminado.`)
  }

  const handleToggleActive = async (id: string, currentState: boolean) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !currentState } : p))
    )
    const { error } = await supabase
      .from("productos")
      .update({ is_active: !currentState })
      .eq("id", id)
    if (error) {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: currentState } : p))
      )
    }
  }

  const tipoPrecioLabels: Record<TipoPrecio, string> = {
    fijo: "Precio Fijo",
    por_variante: "Por Variante",
    por_gramo: "Por Gramo",
    escala: "Por Escala",
  }

  const showPrecioPorGramo =
    newProduct.tipo_precio === "por_gramo" ||
    newProduct.tipo_precio === "por_variante"

  const getPresentacionOptions = (esMagistral: boolean, tipoPrecio: TipoPrecio, magistrales: string[]): string[] => {
    if (tipoPrecio === "fijo") return ["Única"]
    if (esMagistral) return magistrales
    return ["300g", "500g", "1200g"]
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los productos, variantes y precios de Amatu.
          </p>
        </div>
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open)
            if (!open) {
              setSaveError(null)
              setNewVariantes([emptyVariante()])
            }
          }}
        >
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Producto</DialogTitle>
              <DialogDescription>
                Agrega un nuevo producto al catálogo de Amatu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto</Label>
                <Input
                  id="nombre"
                  placeholder="Dieta Res Premium"
                  value={newProduct.nombre}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, nombre: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={newProduct.categoria_id}
                    onValueChange={(v: string | null) =>
                      setNewProduct({ ...newProduct, categoria_id: v ?? "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar...">
                        {newProduct.categoria_id
                          ? (categorias.find(
                              (cat) => cat.id === newProduct.categoria_id
                            )?.nombre ?? null)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Precio</Label>
                  <Select
                    value={newProduct.tipo_precio}
                    onValueChange={(v) => {
                      setNewProduct({ ...newProduct, tipo_precio: v as TipoPrecio })
                      setNewVariantes((prev) => prev.map((vr) => ({ ...vr, presentacion: "", precio_por_gramo: "" })))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar...">
                        {newProduct.tipo_precio
                          ? (TIPO_PRECIO_LABELS[newProduct.tipo_precio] ??
                            newProduct.tipo_precio)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fijo">Precio Fijo</SelectItem>
                      <SelectItem value="por_variante">
                        Por Variante (peso)
                      </SelectItem>
                      <SelectItem value="por_gramo">Por Gramo</SelectItem>
                      <SelectItem value="escala">
                        Por Escala (volumen)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="magistral"
                    checked={newProduct.es_magistral}
                    onCheckedChange={(v) => {
                      setNewProduct({ ...newProduct, es_magistral: v })
                      setNewVariantes((prev) => prev.map((vr) => ({ ...vr, presentacion: "", precio_por_gramo: "" })))
                    }}
                  />
                  <Label htmlFor="magistral">Es dieta magistral</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="descuento"
                    checked={newProduct.aplica_descuento_compra}
                    onCheckedChange={(v) =>
                      setNewProduct({
                        ...newProduct,
                        aplica_descuento_compra: v,
                      })
                    }
                  />
                  <Label htmlFor="descuento">Aplica descuento</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  placeholder="Notas internas del producto..."
                  value={newProduct.notas}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, notas: e.target.value })
                  }
                />
              </div>

              {/* Inline variant rows */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>
                    Variantes{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={addVarianteRow}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar variante
                  </Button>
                </div>

                {/* Column headers */}
                <div
                  className={`grid gap-2 text-xs text-muted-foreground px-1 ${showPrecioPorGramo ? "grid-cols-[1fr_1fr_1fr_1fr_auto]" : "grid-cols-[1fr_1fr_1fr_auto]"}`}
                >
                  <span>SKU *</span>
                  <span>Presentación *</span>
                  <span>Precio público *</span>
                  {showPrecioPorGramo && <span>Precio/Gramo</span>}
                  <span className="w-8" />
                </div>

                {newVariantes.map((v, i) => (
                  <div
                    key={i}
                    className={`grid gap-2 items-center ${showPrecioPorGramo ? "grid-cols-[1fr_1fr_1fr_1fr_auto]" : "grid-cols-[1fr_1fr_1fr_auto]"}`}
                  >
                    <Input
                      placeholder="AMT-RES-300G"
                      value={v.sku}
                      onChange={(e) =>
                        updateVarianteRow(i, { sku: e.target.value })
                      }
                    />
                    <Select
                      value={v.presentacion ?? ""}
                      onValueChange={(val: string | null) => val && updateVarianteRow(i, { presentacion: val })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Tamaño..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getPresentacionOptions(newProduct.es_magistral, newProduct.tipo_precio, pesosmagistralescargados).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="45000"
                      value={v.precio_publico}
                      onChange={(e) =>
                        updateVarianteRow(i, { precio_publico: e.target.value })
                      }
                    />
                    {showPrecioPorGramo && (
                      <Input
                        type="number"
                        placeholder="150"
                        value={v.precio_por_gramo}
                        onChange={(e) =>
                          updateVarianteRow(i, {
                            precio_por_gramo: e.target.value,
                          })
                        }
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={newVariantes.length === 1}
                      onClick={() => removeVarianteRow(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {newProduct.tipo_precio === "escala" && (
                  <p className="text-xs text-muted-foreground">
                    Los precios por escala (volumen) se configuran en el detalle
                    del producto después de crearlo.
                  </p>
                )}
              </div>

              {saveError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {saveError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isSaving ||
                  !newProduct.nombre ||
                  !newProduct.categoria_id ||
                  !newVariantes.some(
                    (v) =>
                      v.sku.trim() &&
                      v.presentacion.trim() &&
                      v.precio_publico.trim()
                  )
                }
              >
                {isSaving ? "Guardando..." : "Crear Producto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
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
            <Select
              value={selectedCategoria}
              onValueChange={(v: string | null) =>
                setSelectedCategoria(v ?? "all")
              }
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todas las categorías">
                  {selectedCategoria && selectedCategoria !== "all"
                    ? (categorias.find((cat) => cat.id === selectedCategoria)
                        ?.nombre ?? selectedCategoria)
                    : "Todas las categorías"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay productos aún</p>
              <p className="text-sm">
                Crea tu primer producto para empezar a armar el catálogo.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Tipo Precio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((producto) => (
                    <TableRow key={producto.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{producto.nombre}</span>
                          {producto.es_magistral && (
                            <Badge variant="secondary" className="text-xs">
                              Magistral
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {producto.categorias_producto?.nombre ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {tipoPrecioLabels[producto.tipo_precio]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            producto.is_active ? "default" : "secondary"
                          }
                          className="cursor-pointer"
                          onClick={() =>
                            handleToggleActive(producto.id, producto.is_active)
                          }
                        >
                          {producto.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {role === "admin" && (
                            <DeleteConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              entityLabel={producto.nombre}
                              confirmToken={producto.nombre}
                              description="Se eliminarán el producto y todas sus variantes. Si alguna variante tiene pedidos asociados, la eliminación será bloqueada."
                              onConfirm={() => handleDeleteProducto(producto.id, producto.nombre)}
                            />
                          )}
                          <Link href={`/catalogo/${producto.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * PAGE_SIZE + 1}–
                    {Math.min((page + 1) * PAGE_SIZE, totalCount)} de{" "}
                    {totalCount} productos
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
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
