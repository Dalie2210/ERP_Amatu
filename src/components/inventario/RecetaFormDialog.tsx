"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ProductSelector } from "@/components/admin/ProductSelector"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Insumo, RecetaExpanded } from "@/types"

interface ItemDraft {
  insumoId: string | null
  cantidadCocido: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  receta: RecetaExpanded | null
  defaultProductoId?: string | null
  onSaved: () => void
}

function emptyItem(): ItemDraft {
  return { insumoId: null, cantidadCocido: "" }
}

export function RecetaFormDialog({ open, onOpenChange, receta, defaultProductoId, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const isEdit = receta !== null

  const [productoId, setProductoId] = useState<string | null>(null)
  const [varianteId, setVarianteId] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [rendimiento, setRendimiento] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from("insumos")
      .select("*")
      .eq("is_active", true)
      .order("nombre")
      .then(({ data }: { data: Insumo[] | null }) => setInsumos(data ?? []))
  }, [open, supabase])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (receta) {
      setProductoId(receta.producto_id)
      setVarianteId(receta.variante_id)
      setNombre(receta.nombre)
      setRendimiento(String(receta.rendimiento))
      setIsActive(receta.is_active)
      setItems(
        receta.receta_items.length > 0
          ? receta.receta_items.map((ri) => ({
              insumoId: ri.insumo_id,
              cantidadCocido: String(ri.cantidad),
            }))
          : [emptyItem()]
      )
    } else {
      setProductoId(defaultProductoId ?? null)
      setVarianteId(null)
      setNombre("")
      setRendimiento("")
      setIsActive(true)
      setItems([emptyItem()])
    }
  }, [receta, open, defaultProductoId])

  const insumoById = (id: string | null) => insumos.find((i) => i.id === id) ?? null

  function crudoRequerido(item: ItemDraft): number | null {
    const insumo = insumoById(item.insumoId)
    const cocido = parseFloat(item.cantidadCocido)
    if (!insumo || isNaN(cocido) || cocido <= 0) return null
    const factorMerma = 1 - insumo.merma_pct / 100
    const factorRendimiento = insumo.rendimiento_pct / 100
    if (factorMerma <= 0 || factorRendimiento <= 0) return null
    return cocido / factorRendimiento / factorMerma
  }

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setError(null)
    if (!productoId) { setError("Selecciona un producto."); return }
    if (!nombre.trim()) { setError("El nombre de la receta es obligatorio."); return }
    const rend = parseFloat(rendimiento)
    if (isNaN(rend) || rend <= 0) { setError("El rendimiento debe ser mayor a cero."); return }
    const validItems = items.filter(
      (it) => it.insumoId !== null && parseFloat(it.cantidadCocido) > 0
    )
    if (validItems.length === 0) { setError("Agrega al menos un ingrediente."); return }

    setSaving(true)

    const cabecera = {
      producto_id: productoId,
      variante_id: varianteId,
      nombre: nombre.trim(),
      rendimiento: rend,
      is_active: isActive,
    }

    if (isEdit) {
      const { error: recErr } = await supabase.from("recetas").update(cabecera).eq("id", receta!.id)
      if (recErr) { setError(recErr.message); setSaving(false); return }

      await supabase.from("receta_items").delete().eq("receta_id", receta!.id)
      const { error: itemsErr } = await supabase.from("receta_items").insert(
        validItems.map((it) => {
          const insumo = insumoById(it.insumoId)!
          return {
            receta_id: receta!.id,
            insumo_id: it.insumoId!,
            cantidad: parseFloat(it.cantidadCocido),
            unidad_medida: insumo.unidad_medida,
          }
        })
      )
      if (itemsErr) { setError(itemsErr.message); setSaving(false); return }
    } else {
      const { data: newReceta, error: recErr } = await supabase.from("recetas").insert(cabecera).select().single()
      if (recErr || !newReceta) { setError(recErr?.message ?? "Error creando receta"); setSaving(false); return }

      const { error: itemsErr } = await supabase.from("receta_items").insert(
        validItems.map((it) => {
          const insumo = insumoById(it.insumoId)!
          return {
            receta_id: newReceta.id,
            insumo_id: it.insumoId!,
            cantidad: parseFloat(it.cantidadCocido),
            unidad_medida: insumo.unidad_medida,
          }
        })
      )
      if (itemsErr) { setError(itemsErr.message); setSaving(false); return }
    }

    setSaving(false)
    toast.success(isEdit ? "Receta actualizada." : "Receta creada.")
    onSaved()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Receta" : "Nueva Receta (BOM)"}</SheetTitle>
          <SheetDescription>
            Ingresa las cantidades en peso cocido/procesado; la cantidad en crudo se calcula
            automáticamente con la merma del insumo.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-2 px-4">
          <div className="space-y-1.5">
            <Label>Producto / Presentación</Label>
            <ProductSelector
              productoId={productoId}
              varianteId={varianteId}
              onProductoChange={setProductoId}
              onVarianteChange={setVarianteId}
              placeholder="Seleccionar producto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre de la Receta</Label>
              <Input
                placeholder="Ej: Res 500g"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rendimiento (PT por corrida)</Label>
              <Input
                type="number"
                placeholder="10"
                value={rendimiento}
                onChange={(e) => setRendimiento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingredientes (peso cocido)</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setItems((p) => [...p, emptyItem()])}>
                <Plus className="h-3.5 w-3.5" />
                Agregar ingrediente
              </Button>
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground px-1 grid-cols-[2fr_1fr_1fr_auto]">
              <span>Insumo</span>
              <span>Cocido *</span>
              <span>Crudo (calc.)</span>
              <span className="w-8" />
            </div>

            {items.map((it, idx) => {
              const insumo = insumoById(it.insumoId)
              const crudo = crudoRequerido(it)
              return (
                <div key={idx} className="grid gap-2 items-center grid-cols-[2fr_1fr_1fr_auto]">
                  <Select
                    value={it.insumoId ?? ""}
                    onValueChange={(v) => v && updateItem(idx, { insumoId: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seleccionar insumo...">
                        {insumo?.nombre ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((ins) => (
                        <SelectItem key={ins.id} value={ins.id}>
                          {ins.nombre} ({ins.merma_pct}% merma
                          {ins.rendimiento_pct !== 100 ? `, ${ins.rendimiento_pct}% rendimiento` : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="500"
                    value={it.cantidadCocido}
                    onChange={(e) => updateItem(idx, { cantidadCocido: e.target.value })}
                  />
                  <Input
                    disabled
                    className="text-muted-foreground"
                    value={
                      crudo !== null
                        ? `${crudo.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${insumo?.unidad_medida ?? ""}`
                        : ""
                    }
                    placeholder="Auto"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={items.length === 1}
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="receta-active" />
            <Label htmlFor="receta-active">Receta activa</Label>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Receta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
