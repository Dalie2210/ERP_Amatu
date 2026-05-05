"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import type { TipoPrecio } from "@/types"

interface Categoria { id: string; nombre: string; slug: string }
interface Variante {
  id: string; producto_id: string; presentacion: string
  precio_publico: number; precio_por_gramo: number | null; is_active: boolean
}
interface PrecioEscala {
  id: string; producto_id: string; cantidad_minima: number; precio_total: number
}

export default function ProductoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const productoId = params.id as string

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [preciosEscala, setPreciosEscala] = useState<PrecioEscala[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Product form
  const [form, setForm] = useState({
    sku: "", nombre: "", categoria_id: "", tipo_precio: "por_variante" as TipoPrecio,
    es_magistral: false, aplica_descuento_compra: true, is_active: true, notas: "",
  })

  // New variant dialog
  const [showVarianteDialog, setShowVarianteDialog] = useState(false)
  const [newVariante, setNewVariante] = useState({
    presentacion: "", precio_publico: "", precio_por_gramo: "",
  })

  // New scale price dialog
  const [showEscalaDialog, setShowEscalaDialog] = useState(false)
  const [newEscala, setNewEscala] = useState({ cantidad_minima: "", precio_total: "" })

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    const [prodRes, catRes, varRes, escRes] = await Promise.all([
      supabase.from("productos").select("*").eq("id", productoId).single(),
      supabase.from("categorias_producto").select("*").order("nombre"),
      supabase.from("producto_variantes").select("*").eq("producto_id", productoId).order("precio_publico"),
      supabase.from("precios_escala").select("*").eq("producto_id", productoId).order("cantidad_minima"),
    ])
    if (prodRes.data) {
      const p = prodRes.data
      setForm({
        sku: p.sku, nombre: p.nombre, categoria_id: p.categoria_id,
        tipo_precio: p.tipo_precio, es_magistral: p.es_magistral,
        aplica_descuento_compra: p.aplica_descuento_compra, is_active: p.is_active,
        notas: p.notas || "",
      })
    }
    if (catRes.data) setCategorias(catRes.data)
    if (varRes.data) setVariantes(varRes.data)
    if (escRes.data) setPreciosEscala(escRes.data)
    setIsLoading(false)
  }, [productoId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSave = async () => {
    setIsSaving(true); setSaveMsg(null)
    const { error } = await supabase.from("productos").update({
      sku: form.sku, nombre: form.nombre, categoria_id: form.categoria_id,
      tipo_precio: form.tipo_precio, es_magistral: form.es_magistral,
      aplica_descuento_compra: form.aplica_descuento_compra,
      is_active: form.is_active, notas: form.notas || null, updated_at: new Date().toISOString(),
    }).eq("id", productoId)
    setSaveMsg(error ? error.message : "Producto actualizado ✓")
    setIsSaving(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleAddVariante = async () => {
    const { error } = await supabase.from("producto_variantes").insert([{
      producto_id: productoId,
      presentacion: newVariante.presentacion,
      precio_publico: parseFloat(newVariante.precio_publico),
      precio_por_gramo: newVariante.precio_por_gramo ? parseFloat(newVariante.precio_por_gramo) : null,
    }])
    if (!error) {
      setShowVarianteDialog(false)
      setNewVariante({ presentacion: "", precio_publico: "", precio_por_gramo: "" })
      fetchAll()
    }
  }

  const handleDeleteVariante = async (id: string) => {
    await supabase.from("producto_variantes").delete().eq("id", id)
    fetchAll()
  }

  const handleAddEscala = async () => {
    const { error } = await supabase.from("precios_escala").insert([{
      producto_id: productoId,
      cantidad_minima: parseInt(newEscala.cantidad_minima),
      precio_total: parseFloat(newEscala.precio_total),
    }])
    if (!error) {
      setShowEscalaDialog(false)
      setNewEscala({ cantidad_minima: "", precio_total: "" })
      fetchAll()
    }
  }

  const handleDeleteEscala = async (id: string) => {
    await supabase.from("precios_escala").delete().eq("id", id)
    fetchAll()
  }

  const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>
  }

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/catalogo")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-heading tracking-tight">{form.nombre || "Producto"}</h1>
          <p className="text-sm text-muted-foreground font-mono">{form.sku}</p>
        </div>
        <Badge variant={form.is_active ? "default" : "secondary"}>
          {form.is_active ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {/* Product Details Card */}
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.categoria_id} onValueChange={(v: string | null) => setForm({ ...form, categoria_id: v ?? "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Precio</Label>
              <Select value={form.tipo_precio} onValueChange={(v) => setForm({ ...form, tipo_precio: v as TipoPrecio })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fijo">Precio Fijo</SelectItem>
                  <SelectItem value="por_variante">Por Variante</SelectItem>
                  <SelectItem value="por_gramo">Por Gramo</SelectItem>
                  <SelectItem value="escala">Por Escala</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch checked={form.es_magistral} onCheckedChange={(v) => setForm({ ...form, es_magistral: v })} />
              <Label>Dieta Magistral</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.aplica_descuento_compra} onCheckedChange={(v) => setForm({ ...form, aplica_descuento_compra: v })} />
              <Label>Aplica Descuento</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Activo</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas internas..." />
          </div>

          {saveMsg && (
            <div className={`text-sm p-3 rounded-md ${saveMsg.includes("✓") ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {saveMsg}
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Variants Card */}
      {(form.tipo_precio === "por_variante" || form.tipo_precio === "por_gramo") && (
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variantes (Presentaciones)</CardTitle>
            <Dialog open={showVarianteDialog} onOpenChange={setShowVarianteDialog}>
              <DialogTrigger>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Agregar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Variante</DialogTitle>
                  <DialogDescription>Agrega una presentación (ej: 300g, 500g, 1200g).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Presentación</Label>
                    <Input placeholder="300g" value={newVariante.presentacion} onChange={(e) => setNewVariante({ ...newVariante, presentacion: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Público ($)</Label>
                    <Input type="number" placeholder="45000" value={newVariante.precio_publico} onChange={(e) => setNewVariante({ ...newVariante, precio_publico: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio por Gramo ($ — opcional)</Label>
                    <Input type="number" placeholder="150" value={newVariante.precio_por_gramo} onChange={(e) => setNewVariante({ ...newVariante, precio_por_gramo: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowVarianteDialog(false)}>Cancelar</Button>
                  <Button onClick={handleAddVariante} disabled={!newVariante.presentacion || !newVariante.precio_publico}>Agregar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {variantes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No hay variantes. Agrega la primera.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Presentación</TableHead>
                    <TableHead className="text-right">Precio Público</TableHead>
                    <TableHead className="text-right">$/Gramo</TableHead>
                    <TableHead className="text-right w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantes.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.presentacion}</TableCell>
                      <TableCell className="text-right">{fmt(v.precio_publico)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{v.precio_por_gramo ? `$${v.precio_por_gramo}` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteVariante(v.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scale Pricing Card */}
      {form.tipo_precio === "escala" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Precios por Escala</CardTitle>
            <Dialog open={showEscalaDialog} onOpenChange={setShowEscalaDialog}>
              <DialogTrigger>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Agregar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Precio por Escala</DialogTitle>
                  <DialogDescription>Precio especial por cantidad (ej: 3+ rollos).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Cantidad Mínima</Label>
                    <Input type="number" placeholder="3" value={newEscala.cantidad_minima} onChange={(e) => setNewEscala({ ...newEscala, cantidad_minima: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Total ($)</Label>
                    <Input type="number" placeholder="25000" value={newEscala.precio_total} onChange={(e) => setNewEscala({ ...newEscala, precio_total: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEscalaDialog(false)}>Cancelar</Button>
                  <Button onClick={handleAddEscala} disabled={!newEscala.cantidad_minima || !newEscala.precio_total}>Agregar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {preciosEscala.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No hay precios por escala.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cantidad Mínima</TableHead>
                    <TableHead className="text-right">Precio Total</TableHead>
                    <TableHead className="text-right w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preciosEscala.map((pe) => (
                    <TableRow key={pe.id}>
                      <TableCell>{pe.cantidad_minima}+ unidades</TableCell>
                      <TableCell className="text-right">{fmt(pe.precio_total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteEscala(pe.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
