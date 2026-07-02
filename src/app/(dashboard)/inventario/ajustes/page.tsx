"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Sliders, Plus, Minus } from "lucide-react"

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

export default function AjustesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [tipoItem, setTipoItem] = useState<"insumo" | "producto">("insumo")
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const [variantes, setVariantes] = useState<VarianteOption[]>([])
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>("")
  const [selectedVarianteKey, setSelectedVarianteKey] = useState<string>("")
  const [signo, setSigno] = useState<"+" | "-">("+")
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState("")
  const [esMerma, setEsMerma] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
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
  }, [supabase])

  const selectedVariante = variantes.find((v) => v.variante_id === selectedVarianteKey)
  const isValid =
    (tipoItem === "insumo" ? !!selectedInsumoId : !!selectedVariante) &&
    parseFloat(cantidad) > 0 &&
    motivo.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSaving(true)
    const cantidadFirmada = (signo === "+" ? 1 : -1) * parseFloat(cantidad)

    const { error } = await supabase.rpc("fn_ajuste_inventario", {
      p_insumo_id: tipoItem === "insumo" ? selectedInsumoId : null,
      p_producto_id: tipoItem === "producto" ? selectedVariante?.producto_id ?? null : null,
      p_variante_id: tipoItem === "producto" ? selectedVariante?.variante_id ?? null : null,
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
    setCantidad("")
    setMotivo("")
    setEsMerma(false)
    setIsSaving(false)
  }

  return (
    <div className="space-y-8 max-w-[720px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Ajuste Manual de Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Registra ajustes de conteo físico o mermas para insumos o producto terminado.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Nuevo Ajuste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min={0}
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="merma" checked={esMerma} onCheckedChange={setEsMerma} disabled={signo === "+"} />
            <Label htmlFor="merma" className="text-sm">Registrar como merma (siempre negativo)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              placeholder="Ej: diferencia detectada en conteo físico del 2026-07-02"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>

          <Button className="w-full" disabled={!isValid || isSaving} onClick={handleSubmit}>
            {isSaving ? "Guardando..." : "Registrar Ajuste"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
