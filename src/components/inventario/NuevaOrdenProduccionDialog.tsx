"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface RecetaOption {
  id: string
  nombre: string
  rendimiento: number
  producto_id: string
  variante_id: string | null
  producto: { nombre: string } | null
  variante: { presentacion: string } | null
  receta_items: { insumo_id: string; cantidad: number; insumo: { nombre: string; merma_pct: number; rendimiento_pct: number } }[]
}

interface StockRow {
  insumo_id: string
  stock_disponible: number
}

interface ItemRow {
  recetaId: string
  cantidad: string
}

export interface OrdenPreset {
  producto_id: string
  variante_id: string | null
  cantidad: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  presets?: OrdenPreset[]
}

const emptyRow = (): ItemRow => ({ recetaId: "", cantidad: "" })

export function NuevaOrdenProduccionDialog({ open, onOpenChange, onSaved, presets }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [recetas, setRecetas] = useState<RecetaOption[]>([])
  const [items, setItems] = useState<ItemRow[]>([emptyRow()])
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState("")
  const [presetsSinReceta, setPresetsSinReceta] = useState(0)
  const [stockInsumos, setStockInsumos] = useState<StockRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFecha(new Date().toISOString().slice(0, 10))
    setNotas("")
    setError(null)
    setPresetsSinReceta(0)
    setItems([emptyRow()])

    supabase
      .from("recetas")
      .select(`
        id, nombre, rendimiento, producto_id, variante_id,
        producto:productos!producto_id(nombre),
        variante:producto_variantes!variante_id(presentacion),
        receta_items(insumo_id, cantidad, insumo:insumos!insumo_id(nombre, merma_pct, rendimiento_pct))
      `)
      .eq("is_active", true)
      .order("nombre")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        const list = (data ?? []) as RecetaOption[]
        setRecetas(list)

        if (presets && presets.length > 0) {
          const rows: ItemRow[] = []
          let sinReceta = 0
          for (const p of presets) {
            const receta =
              list.find((r) => r.producto_id === p.producto_id && r.variante_id === p.variante_id) ??
              list.find((r) => r.producto_id === p.producto_id && r.variante_id === null)
            if (receta) {
              rows.push({ recetaId: receta.id, cantidad: p.cantidad > 0 ? String(p.cantidad) : "" })
            } else {
              sinReceta++
            }
          }
          setItems(rows.length > 0 ? rows : [emptyRow()])
          setPresetsSinReceta(sinReceta)
        }
      })

    supabase
      .from("v_stock_insumos")
      .select("insumo_id, stock_disponible")
      .then(({ data }) => setStockInsumos((data ?? []) as unknown as StockRow[]))
  }, [open, supabase, presets])

  const addRow = () => setItems((p) => [...p, emptyRow()])
  const removeRow = (i: number) => setItems((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)))
  const updateRow = (i: number, patch: Partial<ItemRow>) =>
    setItems((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const recetaById = (id: string) => recetas.find((r) => r.id === id) ?? null

  // Requerimiento de insumos agregado sobre todas las filas (informativo)
  const faltantes = useMemo(() => {
    const req = new Map<string, { nombre: string; crudo: number; disponible: number }>()
    for (const it of items) {
      const receta = recetaById(it.recetaId)
      const cant = parseFloat(it.cantidad)
      if (!receta || isNaN(cant) || cant <= 0 || receta.rendimiento <= 0) continue
      for (const ri of receta.receta_items) {
        const cocido = ri.cantidad * (cant / receta.rendimiento)
        const factorMerma = 1 - ri.insumo.merma_pct / 100
        const factorRendimiento = ri.insumo.rendimiento_pct / 100
        const crudo = factorMerma > 0 && factorRendimiento > 0 ? cocido / factorRendimiento / factorMerma : Infinity
        const disponible = stockInsumos.find((s) => s.insumo_id === ri.insumo_id)?.stock_disponible ?? 0
        const prev = req.get(ri.insumo_id)
        req.set(ri.insumo_id, {
          nombre: ri.insumo.nombre,
          crudo: (prev?.crudo ?? 0) + crudo,
          disponible,
        })
      }
    }
    return Array.from(req.values()).filter((f) => f.crudo > f.disponible)
  }, [items, recetas, stockInsumos])

  const validItems = items.filter((it) => it.recetaId && parseFloat(it.cantidad) > 0)

  async function handleSave() {
    setError(null)
    if (validItems.length === 0) {
      setError("Agrega al menos un producto con receta y cantidad mayor a cero.")
      return
    }

    const payload = validItems.map((it) => {
      const receta = recetaById(it.recetaId)!
      return {
        receta_id: receta.id,
        producto_id: receta.producto_id,
        variante_id: receta.variante_id,
        cantidad: parseFloat(it.cantidad),
      }
    })

    setSaving(true)
    const { error: rpcErr } = await supabase.rpc("fn_crear_orden_produccion", {
      p_fecha: fecha,
      p_notas: notas.trim(),
      p_items: payload,
    })
    setSaving(false)
    if (rpcErr) { setError(rpcErr.message); return }

    toast.success(
      payload.length > 1
        ? `Orden de producción creada con ${payload.length} productos.`
        : "Orden de producción creada."
    )
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Producción</DialogTitle>
          <DialogDescription>
            Agrega uno o varios productos (solo se listan los que tienen receta activa).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {presetsSinReceta > 0 && (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm p-3 rounded-md border border-amber-500/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {presetsSinReceta} producto{presetsSinReceta !== 1 ? "s" : ""} sin receta activa no se incluyó (crea su receta en Inventario → Recetas).
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_140px_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Producto / Presentación (receta)</span>
              <span>Cantidad</span>
              <span className="w-8" />
            </div>
            {items.map((it, i) => {
              const receta = recetaById(it.recetaId)
              return (
                <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2 items-center">
                  <Select value={it.recetaId} onValueChange={(v) => v && updateRow(i, { recetaId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar receta...">
                        {receta
                          ? `${receta.producto?.nombre ?? ""} — ${receta.variante?.presentacion ?? "Todas"}`
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {recetas.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.producto?.nombre ?? ""} — {r.variante?.presentacion ?? "Todas"} ({r.nombre})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="10"
                    value={it.cantidad}
                    onChange={(e) => updateRow(i, { cantidad: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={items.length === 1}
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" />
              Agregar producto
            </Button>
            {recetas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay recetas activas. Crea una en Inventario → Recetas (BOM).
              </p>
            )}
          </div>

          <div className="space-y-2 max-w-[200px]">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea placeholder="Notas de la orden..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {faltantes.length > 0 && (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm p-3 rounded-md border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Ingredientes con stock insuficiente (no bloquea):
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {faltantes.map((f) => (
                  <li key={f.nombre}>
                    {f.nombre}: requiere {f.crudo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}, hay {f.disponible.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || validItems.length === 0}>
            {saving ? "Creando..." : "Crear Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
