"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ProductSelector } from "./ProductSelector"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"

interface KitItemDraft {
  productoId: string | null
  varianteId: string | null
  cantidad: number
}

interface KitRow {
  id: string
  nombre: string
  descripcion: string | null
  is_active: boolean
  kit_items: {
    id: string
    producto_id: string
    variante_id: string | null
    cantidad: number
  }[]
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  kit: KitRow | null
  onSaved: () => void
}

function emptyItem(): KitItemDraft {
  return { productoId: null, varianteId: null, cantidad: 1 }
}

export function KitFormDialog({ open, onOpenChange, kit, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const isEdit = kit !== null

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [items, setItems] = useState<KitItemDraft[]>([emptyItem()])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (kit) {
      setNombre(kit.nombre)
      setDescripcion(kit.descripcion ?? "")
      setIsActive(kit.is_active)
      setItems(
        kit.kit_items.length > 0
          ? kit.kit_items.map((ki) => ({
              productoId: ki.producto_id,
              varianteId: ki.variante_id,
              cantidad: ki.cantidad,
            }))
          : [emptyItem()]
      )
    } else {
      setNombre("")
      setDescripcion("")
      setIsActive(true)
      setItems([emptyItem()])
    }
  }, [kit, open])

  function updateItem(idx: number, patch: Partial<KitItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    const validItems = items.filter((it) => it.productoId !== null)
    if (validItems.length === 0) {
      toast.error("Agrega al menos un producto al kit")
      return
    }

    setSaving(true)

    if (isEdit) {
      const { error: kitErr } = await supabase
        .from("kits")
        .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, is_active: isActive })
        .eq("id", kit!.id)
      if (kitErr) { toast.error("Error: " + kitErr.message); setSaving(false); return }

      // Replace all items
      await supabase.from("kit_items").delete().eq("kit_id", kit!.id)
      const { error: itemsErr } = await supabase.from("kit_items").insert(
        validItems.map((it) => ({
          kit_id: kit!.id,
          producto_id: it.productoId!,
          variante_id: it.varianteId,
          cantidad: it.cantidad,
        }))
      )
      if (itemsErr) { toast.error("Error guardando ítems: " + itemsErr.message); setSaving(false); return }
    } else {
      const { data: newKit, error: kitErr } = await supabase
        .from("kits")
        .insert({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, is_active: isActive })
        .select()
        .single()
      if (kitErr || !newKit) { toast.error("Error: " + kitErr?.message); setSaving(false); return }

      const { error: itemsErr } = await supabase.from("kit_items").insert(
        validItems.map((it) => ({
          kit_id: newKit.id,
          producto_id: it.productoId!,
          variante_id: it.varianteId,
          cantidad: it.cantidad,
        }))
      )
      if (itemsErr) { toast.error("Error guardando ítems: " + itemsErr.message); setSaving(false); return }
    }

    setSaving(false)
    toast.success(isEdit ? "Kit actualizado" : "Kit creado")
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar kit" : "Nuevo kit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Kit Iniciador Cachorros" />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción breve del kit..."
              rows={2}
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Productos del kit</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-muted/40 rounded-lg p-3">
                <div className="flex-1 space-y-2">
                  <ProductSelector
                    productoId={item.productoId}
                    varianteId={item.varianteId}
                    onProductoChange={(id) => updateItem(idx, { productoId: id, varianteId: null })}
                    onVarianteChange={(id) => updateItem(idx, { varianteId: id })}
                    placeholder="Seleccionar producto..."
                  />
                </div>
                <div className="flex items-center gap-1 pt-0.5 shrink-0">
                  <Label className="text-xs text-muted-foreground">Cant.</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => updateItem(idx, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 h-9 text-center text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Añadir ítem
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="kit-active" />
            <Label htmlFor="kit-active">Kit activo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
