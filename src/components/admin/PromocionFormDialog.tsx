"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ProductSelector } from "./ProductSelector"
import { toast } from "sonner"
import type { TipoPromocion } from "@/types"

const tipoPromocionLabels: Record<TipoPromocion, string> = {
  paga_x_lleva_mas: "Paga X lleva X+N (unidades gratis)",
  producto_gratis: "Producto gratis al comprar otro",
}

interface PromocionRow {
  id: string
  nombre: string
  tipo: TipoPromocion
  is_active: boolean
  producto_id: string | null
  variante_id: string | null
  paga_x: number | null
  lleva_extra: number | null
  trigger_producto_id: string | null
  trigger_variante_id: string | null
  regalo_producto_id: string | null
  regalo_variante_id: string | null
  regalo_cantidad: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  promo: PromocionRow | null
  onSaved: () => void
}

export function PromocionFormDialog({ open, onOpenChange, promo, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const isEdit = promo !== null

  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<TipoPromocion>("paga_x_lleva_mas")
  const [isActive, setIsActive] = useState(true)
  // Tipo 1
  const [productoId, setProductoId] = useState<string | null>(null)
  const [varianteId, setVarianteId] = useState<string | null>(null)
  const [pagaX, setPagaX] = useState(2)
  const [llevaExtra, setLlevaExtra] = useState(1)
  // Tipo 2
  const [triggerProductoId, setTriggerProductoId] = useState<string | null>(null)
  const [triggerVarianteId, setTriggerVarianteId] = useState<string | null>(null)
  const [regaloProductoId, setRegaloProductoId] = useState<string | null>(null)
  const [regaloVarianteId, setRegaloVarianteId] = useState<string | null>(null)
  const [regaloCantidad, setRegaloCantidad] = useState(1)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (promo) {
      setNombre(promo.nombre)
      setTipo(promo.tipo)
      setIsActive(promo.is_active)
      setProductoId(promo.producto_id)
      setVarianteId(promo.variante_id)
      setPagaX(promo.paga_x ?? 2)
      setLlevaExtra(promo.lleva_extra ?? 1)
      setTriggerProductoId(promo.trigger_producto_id)
      setTriggerVarianteId(promo.trigger_variante_id)
      setRegaloProductoId(promo.regalo_producto_id)
      setRegaloVarianteId(promo.regalo_variante_id)
      setRegaloCantidad(promo.regalo_cantidad ?? 1)
    } else {
      setNombre("")
      setTipo("paga_x_lleva_mas")
      setIsActive(true)
      setProductoId(null)
      setVarianteId(null)
      setPagaX(2)
      setLlevaExtra(1)
      setTriggerProductoId(null)
      setTriggerVarianteId(null)
      setRegaloProductoId(null)
      setRegaloVarianteId(null)
      setRegaloCantidad(1)
    }
  }, [promo, open])

  async function handleSave() {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (tipo === "paga_x_lleva_mas" && !productoId) {
      toast.error("Selecciona el producto")
      return
    }
    if (tipo === "producto_gratis" && (!triggerProductoId || !regaloProductoId)) {
      toast.error("Selecciona el producto disparador y el producto regalo")
      return
    }

    setSaving(true)
    const payload = {
      nombre: nombre.trim(),
      tipo,
      is_active: isActive,
      ...(tipo === "paga_x_lleva_mas"
        ? {
            producto_id: productoId,
            variante_id: varianteId,
            paga_x: pagaX,
            lleva_extra: llevaExtra,
            trigger_producto_id: null,
            trigger_variante_id: null,
            regalo_producto_id: null,
            regalo_variante_id: null,
            regalo_cantidad: 1,
          }
        : {
            producto_id: null,
            variante_id: null,
            paga_x: null,
            lleva_extra: null,
            trigger_producto_id: triggerProductoId,
            trigger_variante_id: triggerVarianteId,
            regalo_producto_id: regaloProductoId,
            regalo_variante_id: regaloVarianteId,
            regalo_cantidad: regaloCantidad,
          }),
    }

    const { error } = isEdit
      ? await supabase.from("promociones").update(payload).eq("id", promo!.id)
      : await supabase.from("promociones").insert(payload)

    setSaving(false)
    if (error) {
      toast.error("Error al guardar: " + error.message)
      return
    }
    toast.success(isEdit ? "Promoción actualizada" : "Promoción creada")
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Paga 2 lleva 3 en Acana" />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo de promoción</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPromocion)}>
              <SelectTrigger>
                <span>{tipoPromocionLabels[tipo]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paga_x_lleva_mas">Paga X lleva X+N (unidades gratis)</SelectItem>
                <SelectItem value="producto_gratis">Producto gratis al comprar otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo 1 fields */}
          {tipo === "paga_x_lleva_mas" && (
            <>
              <div className="space-y-1.5">
                <Label>Producto</Label>
                <ProductSelector
                  productoId={productoId}
                  varianteId={varianteId}
                  onProductoChange={setProductoId}
                  onVarianteChange={setVarianteId}
                  placeholder="Seleccionar producto..."
                />
                <p className="text-xs text-muted-foreground">Deja variante vacía para aplicar a todas las variantes</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Paga (X)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pagaX}
                    onChange={(e) => setPagaX(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lleva extra (N)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={llevaExtra}
                    onChange={(e) => setLlevaExtra(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Por cada {pagaX} unidades compradas, se agregan {llevaExtra} unidades gratis al carrito.
              </p>
            </>
          )}

          {/* Tipo 2 fields */}
          {tipo === "producto_gratis" && (
            <>
              <div className="space-y-1.5">
                <Label>Producto disparador</Label>
                <ProductSelector
                  productoId={triggerProductoId}
                  varianteId={triggerVarianteId}
                  onProductoChange={setTriggerProductoId}
                  onVarianteChange={setTriggerVarianteId}
                  placeholder="Al comprar este producto..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Producto regalo</Label>
                <ProductSelector
                  productoId={regaloProductoId}
                  varianteId={regaloVarianteId}
                  onProductoChange={setRegaloProductoId}
                  onVarianteChange={setRegaloVarianteId}
                  placeholder="Se regala este producto..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad de regalo</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-28"
                  value={regaloCantidad}
                  onChange={(e) => setRegaloCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </>
          )}

          {/* Activo toggle */}
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="promo-active" />
            <Label htmlFor="promo-active">Promoción activa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear promoción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
