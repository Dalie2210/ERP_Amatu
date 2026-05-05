"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { Plus, Search, Package, Edit, Trash2, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { TipoPrecio } from "@/types"

// ---------- Types ----------
interface Categoria {
  id: string
  nombre: string
  slug: string
}

interface Producto {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  tipo_precio: TipoPrecio
  es_magistral: boolean
  aplica_descuento_compra: boolean
  is_active: boolean
  notas: string | null
  created_at: string
  categorias_producto?: Categoria
  variantes_count?: number
}

// ---------- Component ----------
export default function CatalogoPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create form state
  const [newProduct, setNewProduct] = useState({
    sku: "",
    nombre: "",
    categoria_id: "",
    tipo_precio: "por_variante" as TipoPrecio,
    es_magistral: false,
    aplica_descuento_compra: true,
    notas: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fetchProductos = useCallback(async () => {
    setIsLoading(true)
    let query = supabase
      .from("productos")
      .select("*, categorias_producto(id, nombre, slug)")
      .order("nombre", { ascending: true })

    if (selectedCategoria !== "all") {
      query = query.eq("categoria_id", selectedCategoria)
    }

    if (searchQuery.trim()) {
      query = query.or(
        `nombre.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`
      )
    }

    const { data, error } = await query

    if (!error && data) {
      setProductos(data as Producto[])
    }
    setIsLoading(false)
  }, [selectedCategoria, searchQuery])

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from("categorias_producto")
      .select("*")
      .order("nombre")
    if (data) setCategorias(data)
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const handleCreate = async () => {
    setIsSaving(true)
    setSaveError(null)

    const { error } = await supabase.from("productos").insert([
      {
        sku: newProduct.sku,
        nombre: newProduct.nombre,
        categoria_id: newProduct.categoria_id,
        tipo_precio: newProduct.tipo_precio,
        es_magistral: newProduct.es_magistral,
        aplica_descuento_compra: newProduct.aplica_descuento_compra,
        notas: newProduct.notas || null,
      },
    ])

    if (error) {
      setSaveError(error.message)
    } else {
      setShowCreateDialog(false)
      setNewProduct({
        sku: "",
        nombre: "",
        categoria_id: "",
        tipo_precio: "por_variante",
        es_magistral: false,
        aplica_descuento_compra: true,
        notas: "",
      })
      fetchProductos()
    }
    setIsSaving(false)
  }

  const handleToggleActive = async (id: string, currentState: boolean) => {
    await supabase
      .from("productos")
      .update({ is_active: !currentState })
      .eq("id", id)
    fetchProductos()
  }

  const tipoPrecioLabels: Record<TipoPrecio, string> = {
    fijo: "Precio Fijo",
    por_variante: "Por Variante",
    por_gramo: "Por Gramo",
    escala: "Por Escala",
  }

  const filteredProducts = productos

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
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger >
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Crear Producto</DialogTitle>
              <DialogDescription>
                Agrega un nuevo producto al catálogo de Amatu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="AMT-D001"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Dieta Res Premium"
                    value={newProduct.nombre}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, nombre: e.target.value })
                    }
                  />
                </div>
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
                      <SelectValue placeholder="Seleccionar..." />
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
                    onValueChange={(v) =>
                      setNewProduct({
                        ...newProduct,
                        tipo_precio: v as TipoPrecio,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fijo">Precio Fijo</SelectItem>
                      <SelectItem value="por_variante">Por Variante (peso)</SelectItem>
                      <SelectItem value="por_gramo">Por Gramo</SelectItem>
                      <SelectItem value="escala">Por Escala (volumen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="magistral"
                    checked={newProduct.es_magistral}
                    onCheckedChange={(v) =>
                      setNewProduct({ ...newProduct, es_magistral: v })
                    }
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
                  !newProduct.sku ||
                  !newProduct.nombre ||
                  !newProduct.categoria_id
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
                placeholder="Buscar por nombre o SKU..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedCategoria}
              onValueChange={(v: string | null) => setSelectedCategoria(v ?? "all")}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todas las categorías" />
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
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Cargando productos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay productos aún</p>
              <p className="text-sm">
                Crea tu primer producto para empezar a armar el catálogo.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo Precio</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((producto) => (
                  <TableRow key={producto.id} className="group">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {producto.sku}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{producto.nombre}</span>
                        {producto.es_magistral && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            Magistral
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(producto as any).categorias_producto?.nombre ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {tipoPrecioLabels[producto.tipo_precio]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={producto.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() =>
                          handleToggleActive(producto.id, producto.is_active)
                        }
                      >
                        {producto.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/catalogo/${producto.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
