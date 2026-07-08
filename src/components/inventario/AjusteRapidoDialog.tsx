"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Minus } from "lucide-react"

interface InsumoOption {
  id: string
  nombre: string
  unidad_medida: string
}

interface VarianteOption {
  producto_id: string
  variante_id: string
  producto_nombre: string
  presentacion: string
}

/** Cuando se pasa `preset`, el ítem viene fijo desde la fila que originó el ajuste
 * (ya no hay que buscarlo/seleccionarlo dentro del diálogo). */
export interface AjustePreset {
  tipo: "insumo" | "producto"
  nombre: string
  detalle?: string
  insumoId?: string
  productoId?: string
  varianteId?: string
}

interface AjusteRapidoDialogProps {
  trigger: React.ReactElement
  /** Se llama tras un ajuste exitoso para refrescar la vista padre. */
  onSaved?: () => void
  /** Ítem preseleccionado (y bloqueado) al abrir el diálogo. */
  preset?: AjustePreset
}

export function AjusteRapidoDialog({ trigger, onSaved, preset }: AjusteRapidoDialogProps) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [tipoItem, setTipoItem] = useState<"insumo" | "producto">(preset?.tipo ?? "insumo")
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const [variantes, setVariantes] = useState<VarianteOption[]>([])
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>(preset?.insumoId ?? "")
  const [selectedVarianteKey, setSelectedVarianteKey] = useState<string>(preset?.varianteId ?? "")
  const [signo, setSigno] = useState<"+" | "-">("+")
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState("")
  const [esMerma, setEsMerma] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || preset) return
    supabase.from("insumos").select("id, nombre, unidad_medida").eq("is_active", true).order("nombre")
      .then(({ data }: { data: InsumoOption[] | null }) => setInsumos(data ?? []))

    supabase.from("producto_variantes")
      .select("id, presentacion, producto_id, productos(nombre)")
      .eq("is_active", true)
      .order("presentacion")
      .then(({ data }: { data: { id: string; presentacion: string; producto_id: string; productos: { nombre: string } | null }[] | null }) => {
        setVariantes(
          (data ?? []).map((v) => ({
            producto_id: v.producto_id,
            variante_id: v.id,
            producto_nombre: v.productos?.nombre ?? "—",
            presentacion: v.presentacion,
          }))
        )
      })
  }, [supabase, open, preset])

  const selectedVariante = variantes.find((v) => v.variante_id === selectedVarianteKey)
  const isValid =
    (tipoItem === "insumo" ? !!selectedInsumoId : !!(preset ? preset.varianteId : selectedVariante)) &&
    parseFloat(cantidad) > 0 &&
    motivo.trim().length > 0

  const resetForm = () => {
    setCantidad("")
    setMotivo("")
    setEsMerma(false)
    setSigno("+")
    if (!preset) {
      setSelectedInsumoId("")
      setSelectedVarianteKey("")
    }
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSaving(true)
    const cantidadFirmada = (signo === "+" ? 1 : -1) * parseFloat(cantidad)

    const { error } = await supabase.rpc("fn_ajuste_inventario", {
      p_insumo_id: tipoItem === "insumo" ? (preset?.insumoId ?? selectedInsumoId) : null,
      p_producto_id: tipoItem === "producto" ? (preset?.productoId ?? selectedVariante?.producto_id ?? null) : null,
      p_variante_id: tipoItem === "producto" ? (preset?.varianteId ?? selectedVariante?.variante_id ?? null) : null,
      p_cantidad: cantidadFirmada,
      p_motivo: motivo.trim(),
      p_es_merma: esMerma,
    })

    if (error) {
      toast.error("Error al registrar el ajuste: " + error.message)
      setIsSaving(false)
      return
    }

    toast.success("Ajuste registrado correctamente")
    resetForm()
    setIsSaving(false)
    setOpen(false)
    onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Ajuste Rápido de Inventario</DialogTitle>
          <DialogDescription>
            Registra un ajuste puntual o merma para un insumo o producto terminado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {preset ? (
            <div className="space-y-2">
              <Label>Ítem</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                {preset.nombre}
                {preset.detalle && <span className="text-muted-foreground font-normal"> — {preset.detalle}</span>}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tipo de ítem</Label>
                <Select value={tipoItem} onValueChange={(v) => v && setTipoItem(v as "insumo" | "producto")}>
                  <SelectTrigger>
                    <SelectValue>{tipoItem === "insumo" ? "Insumo (materia prima / seco / aseo / empaque)" : "Producto Terminado"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insumo">Insumo (materia prima / seco / aseo / empaque)</SelectItem>
                    <SelectItem value="producto">Producto Terminado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoItem === "insumo" ? (
                <div className="space-y-2">
                  <Label>Insumo</Label>
                  <Select value={selectedInsumoId} onValueChange={(v) => v && setSelectedInsumoId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar insumo...">
                        {insumos.find((i) => i.id === selectedInsumoId)?.nombre}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Producto / Presentación</Label>
                  <Select value={selectedVarianteKey} onValueChange={(v) => v && setSelectedVarianteKey(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto...">
                        {selectedVariante && `${selectedVariante.producto_nombre} — ${selectedVariante.presentacion}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {variantes.map((v) => (
                        <SelectItem key={v.variante_id} value={v.variante_id}>
                          {v.producto_nombre} — {v.presentacion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
            <div className="space-y-2">
              <Label>Signo</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={signo === "+" ? "default" : "outline"}
                  size="icon"
                  onClick={() => { setSigno("+"); setEsMerma(false) }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={signo === "-" ? "destructive" : "outline"}
                  size="icon"
                  onClick={() => setSigno("-")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad-rapido">Cantidad</Label>
              <Input
                id="cantidad-rapido"
                type="number"
                min={0}
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="merma-rapido" checked={esMerma} onCheckedChange={setEsMerma} disabled={signo === "+"} />
            <Label htmlFor="merma-rapido" className="text-sm">Registrar como merma (siempre negativo)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-rapido">Motivo</Label>
            <Textarea
              id="motivo-rapido"
              placeholder="Ej: diferencia detectada fuera del conteo semanal"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!isValid || isSaving} onClick={handleSubmit}>
            {isSaving ? "Guardando..." : "Registrar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
