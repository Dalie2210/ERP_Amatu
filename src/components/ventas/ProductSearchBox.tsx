"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { useCartStore } from "@/stores/cartStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Package, Beaker } from "lucide-react"
import type { CartItem, TipoPrecio } from "@/types"

// ---------- DB types ----------
interface ProductoVariante {
  id: string
  presentacion: string
  precio_publico: number
  precio_por_gramo: number | null
  is_active: boolean
}

interface PrecioEscala {
  id: string
  cantidad_minima: number
  precio_total: number
}

interface CategoriaProducto {
  id: string
  nombre: string
  slug: string
}

interface ProductoResult {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  tipo_precio: TipoPrecio
  es_magistral: boolean
  aplica_descuento_compra: boolean
  is_active: boolean
  notas: string | null
  categorias_producto: CategoriaProducto | null
  producto_variantes: ProductoVariante[]
  precios_escala: PrecioEscala[]
}

// ---------- Magistral dialog ----------
interface MagistralDialogProps {
  open: boolean
  onClose: () => void
  producto: ProductoResult
  variantes: ProductoVariante[]
  onAdd: (item: CartItem) => void
}

function MagistralDialog({ open, onClose, producto, variantes, onAdd }: MagistralDialogProps) {
  const [gramaje, setGramaje] = useState("")
  const [notas, setNotas] = useState("")

  const calcularPrecio = useCallback(() => {
    const g = parseFloat(gramaje)
    if (!g || g <= 0 || variantes.length === 0) return 0

    // Sort variants by presentacion (weight) ascending
    const sorted = [...variantes]
      .filter((v) => v.precio_por_gramo)
      .sort((a, b) => {
        const weightA = parseFloat(a.presentacion.replace(/[^\d.]/g, "")) || 0
        const weightB = parseFloat(b.presentacion.replace(/[^\d.]/g, "")) || 0
        return weightA - weightB
      })

    if (sorted.length === 0) return 0

    // Find correct tier
    let precioPorGramo = sorted[0].precio_por_gramo!
    for (const v of sorted) {
      const weight = parseFloat(v.presentacion.replace(/[^\d.]/g, "")) || 0
      if (g >= weight && v.precio_por_gramo) {
        precioPorGramo = v.precio_por_gramo
      }
    }

    return Math.round(precioPorGramo * g * 1.03)
  }, [gramaje, variantes])

  const precio = calcularPrecio()

  const handleAdd = () => {
    const g = parseFloat(gramaje)
    if (!g || precio <= 0) return

    onAdd({
      productoId: producto.id,
      varianteId: undefined,
      sku: producto.sku,
      nombre: `${producto.nombre} (${g}g magistral)`,
      presentacion: `${g}g`,
      precioUnitario: precio,
      cantidad: 1,
      subtotal: precio,
      esMagistral: true,
      gramajeMagistral: g,
      notasMagistral: notas || undefined,
      aplicaDescuento: producto.aplica_descuento_compra,
      categoria: producto.categorias_producto?.slug ?? "magistral",
    })
    setGramaje("")
    setNotas("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Dieta Magistral
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{producto.nombre}</p>
          <div className="space-y-2">
            <Label htmlFor="gramaje">Gramaje (g)</Label>
            <Input
              id="gramaje"
              type="number"
              placeholder="Ej: 350"
              value={gramaje}
              onChange={(e) => setGramaje(e.target.value)}
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas-mag">Notas de la magistral</Label>
            <Textarea
              id="notas-mag"
              placeholder="Ingredientes especiales, restricciones..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>
          {precio > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Precio calculado (+3%)</p>
              <p className="text-xl font-bold text-primary">
                ${precio.toLocaleString("es-CO")}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={!gramaje || precio <= 0}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Variant picker ----------
interface VariantPickerProps {
  producto: ProductoResult
  onClose: () => void
}

function VariantPicker({ producto, onClose }: VariantPickerProps) {
  const addItem = useCartStore((s) => s.addItem)
  const activeVariants = producto.producto_variantes.filter((v) => v.is_active)

  const handleAdd = (variante: ProductoVariante) => {
    addItem({
      productoId: producto.id,
      varianteId: variante.id,
      sku: producto.sku,
      nombre: producto.nombre,
      presentacion: variante.presentacion,
      precioUnitario: variante.precio_publico,
      cantidad: 1,
      subtotal: variante.precio_publico,
      esMagistral: false,
      aplicaDescuento: producto.aplica_descuento_compra,
      categoria: producto.categorias_producto?.slug ?? "otros",
    })
    onClose()
  }

  return (
    <div className="grid gap-2 p-2">
      {activeVariants.map((v) => (
        <button
          key={v.id}
          onClick={() => handleAdd(v)}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-md hover:bg-accent text-left transition-colors group"
        >
          <span className="text-sm font-medium">{v.presentacion}</span>
          <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform">
            ${v.precio_publico.toLocaleString("es-CO")}
          </span>
        </button>
      ))}
      {activeVariants.length === 0 && (
        <p className="text-sm text-muted-foreground p-2">Sin variantes activas</p>
      )}
    </div>
  )
}

// ---------- Scale price picker ----------
interface ScalePickerProps {
  producto: ProductoResult
  onClose: () => void
}

function ScalePicker({ producto, onClose }: ScalePickerProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [qty, setQty] = useState(1)

  const sorted = [...producto.precios_escala].sort((a, b) => a.cantidad_minima - b.cantidad_minima)

  // Find applicable price
  const aplicable = sorted.reduce<PrecioEscala | null>((acc, p) => {
    if (qty >= p.cantidad_minima) return p
    return acc
  }, null)

  const precioUnitario = aplicable
    ? aplicable.precio_total / aplicable.cantidad_minima
    : producto.producto_variantes[0]?.precio_publico ?? 0

  const handleAdd = () => {
    addItem({
      productoId: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      precioUnitario: Math.round(precioUnitario),
      cantidad: qty,
      subtotal: Math.round(precioUnitario * qty),
      esMagistral: false,
      aplicaDescuento: producto.aplica_descuento_compra,
      categoria: producto.categorias_producto?.slug ?? "otros",
    })
    onClose()
  }

  return (
    <div className="p-3 space-y-3">
      <div className="space-y-1.5">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`flex justify-between text-sm px-2 py-1 rounded ${
              aplicable?.id === p.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
            }`}
          >
            <span>≥ {p.cantidad_minima} uds</span>
            <span>${p.precio_total.toLocaleString("es-CO")}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">Cantidad:</Label>
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20"
        />
        <Button size="sm" onClick={handleAdd} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" />
          ${(Math.round(precioUnitario * qty)).toLocaleString("es-CO")}
        </Button>
      </div>
    </div>
  )
}

// ---------- MAIN: ProductSearchBox ----------
export function ProductSearchBox() {
  const supabase = useMemo(() => createClient(), [])
  const addItem = useCartStore((s) => s.addItem)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductoResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [magistralProduct, setMagistralProduct] = useState<ProductoResult | null>(null)

  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    setIsSearching(true)
    const { data } = await supabase
      .from("productos")
      .select("*, categorias_producto(id, nombre, slug), producto_variantes(*), precios_escala(*)")
      .eq("is_active", true)
      .or(`nombre.ilike.%${debouncedQuery}%,sku.ilike.%${debouncedQuery}%`)
      .order("nombre")
      .limit(10)

    setResults((data as ProductoResult[]) ?? [])
    setIsSearching(false)
  }, [supabase, debouncedQuery])

  useEffect(() => {
    search()
  }, [search])

  const handleDirectAdd = (producto: ProductoResult) => {
    // Product with fixed price and no variants
    if (producto.tipo_precio === "fijo") {
      const variant = producto.producto_variantes.find((v) => v.is_active)
      addItem({
        productoId: producto.id,
        varianteId: variant?.id,
        sku: producto.sku,
        nombre: producto.nombre,
        presentacion: variant?.presentacion,
        precioUnitario: variant?.precio_publico ?? 0,
        cantidad: 1,
        subtotal: variant?.precio_publico ?? 0,
        esMagistral: false,
        aplicaDescuento: producto.aplica_descuento_compra,
        categoria: producto.categorias_producto?.slug ?? "otros",
      })
      setQuery("")
      setResults([])
      return
    }

    if (producto.es_magistral || producto.tipo_precio === "por_gramo") {
      setMagistralProduct(producto)
      return
    }

    if (producto.tipo_precio === "escala") {
      setExpandedId(expandedId === producto.id ? null : producto.id)
      return
    }

    // por_variante → expand to show variants
    setExpandedId(expandedId === producto.id ? null : producto.id)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar producto por nombre o SKU..."
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setExpandedId(null)
          }}
        />
      </div>

      {(results.length > 0 || isSearching || (debouncedQuery && results.length === 0)) && (
        <div className="border rounded-lg bg-white shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[380px]">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
            ) : results.length > 0 ? (
              results.map((producto) => (
                <div key={producto.id} className="border-b last:border-b-0">
                  <button
                    onClick={() => handleDirectAdd(producto)}
                    className="flex items-center w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left gap-3"
                  >
                    <div className="h-9 w-9 bg-primary/5 rounded-md flex items-center justify-center shrink-0">
                      {producto.es_magistral ? (
                        <Beaker className="h-4 w-4 text-primary" />
                      ) : (
                        <Package className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{producto.nombre}</span>
                        {producto.es_magistral && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Magistral</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{producto.sku}</span>
                        <span className="text-xs text-muted-foreground">
                          · {producto.categorias_producto?.nombre}
                        </span>
                      </div>
                    </div>
                    {producto.tipo_precio === "fijo" && producto.producto_variantes[0] && (
                      <span className="text-sm font-semibold text-primary shrink-0">
                        ${producto.producto_variantes[0].precio_publico.toLocaleString("es-CO")}
                      </span>
                    )}
                    {producto.tipo_precio === "por_variante" && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {producto.producto_variantes.filter((v) => v.is_active).length} variantes
                      </Badge>
                    )}
                    {producto.tipo_precio === "escala" && (
                      <Badge variant="outline" className="text-xs shrink-0">Escala</Badge>
                    )}
                    {(producto.tipo_precio === "por_gramo" || producto.es_magistral) && (
                      <Badge variant="outline" className="text-xs shrink-0">Por gramo</Badge>
                    )}
                  </button>

                  {/* Expanded: variants or scale picker */}
                  {expandedId === producto.id && (
                    <div className="bg-muted/30 border-t">
                      {producto.tipo_precio === "escala" ? (
                        <ScalePicker
                          producto={producto}
                          onClose={() => {
                            setExpandedId(null)
                            setQuery("")
                            setResults([])
                          }}
                        />
                      ) : (
                        <VariantPicker
                          producto={producto}
                          onClose={() => {
                            setExpandedId(null)
                            setQuery("")
                            setResults([])
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron productos</div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Magistral dialog */}
      {magistralProduct && (
        <MagistralDialog
          open={!!magistralProduct}
          onClose={() => setMagistralProduct(null)}
          producto={magistralProduct}
          variantes={magistralProduct.producto_variantes}
          onAdd={(item) => {
            addItem(item)
            setQuery("")
            setResults([])
          }}
        />
      )}
    </div>
  )
}
