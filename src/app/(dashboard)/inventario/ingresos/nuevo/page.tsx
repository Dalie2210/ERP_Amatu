"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import type { Insumo, TipoInsumo } from "@/types"
import { TIPO_INSUMO_LABELS } from "@/lib/constants/labels"

interface ItemRow {
  insumo_id: string
  cantidad: string
  precio_compra: string
  codigo_lote: string
  fecha_vencimiento: string
}

const emptyItem = (): ItemRow => ({
  insumo_id: "",
  cantidad: "",
  precio_compra: "",
  codigo_lote: "",
  fecha_vencimiento: "",
})

export default function NuevoIngresoPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [tipoIngreso, setTipoIngreso] = useState<TipoInsumo>("materia_prima")
  const [proveedor, setProveedor] = useState("")
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [temperaturaLlegada, setTemperaturaLlegada] = useState("")
  const [placaVehiculo, setPlacaVehiculo] = useState("")
  const [notas, setNotas] = useState("")

  const [items, setItems] = useState<ItemRow[]>([emptyItem()])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esMateriaPrima = tipoIngreso === "materia_prima"

  useEffect(() => {
    const fetchInsumos = async () => {
      const { data } = await supabase
        .from("insumos")
        .select("*")
        .eq("tipo", tipoIngreso)
        .eq("is_active", true)
        .order("nombre")
      setInsumos(data ?? [])
    }
    fetchInsumos()
    // Reset selections that no longer match the filtered type
    setItems((prev) => prev.map((it) => ({ ...it, insumo_id: "" })))
  }, [tipoIngreso, supabase])

  const addItem = () => setItems((p) => [...p, emptyItem()])
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i))
  const updateItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const precioUnitario = (it: ItemRow) => {
    const cantidad = parseFloat(it.cantidad)
    const precio = parseFloat(it.precio_compra)
    if (!cantidad || !precio || cantidad <= 0) return null
    return precio / cantidad
  }

  const total = items.reduce((sum, it) => sum + (parseFloat(it.precio_compra) || 0), 0)

  const validItems = items.filter(
    (it) => it.insumo_id && parseFloat(it.cantidad) > 0 && parseFloat(it.precio_compra) >= 0
  )

  const handleSave = async () => {
    setError(null)
    if (validItems.length === 0) {
      setError("Agrega al menos un ítem con insumo, cantidad y precio de compra.")
      return
    }
    setIsSaving(true)

    const cabecera = {
      tipo_ingreso: tipoIngreso,
      proveedor: proveedor.trim() || null,
      fecha,
      temperatura_llegada: esMateriaPrima && temperaturaLlegada ? parseFloat(temperaturaLlegada) : null,
      placa_vehiculo: esMateriaPrima ? placaVehiculo.trim() || null : null,
      notas: notas.trim() || null,
    }

    const rpcItems = validItems.map((it) => ({
      insumo_id: it.insumo_id,
      cantidad: parseFloat(it.cantidad),
      precio_compra: parseFloat(it.precio_compra),
      codigo_lote: it.codigo_lote.trim() || null,
      fecha_vencimiento: it.fecha_vencimiento || null,
    }))

    const { data, error: rpcError } = await supabase.rpc("fn_registrar_ingreso", {
      p_cabecera: cabecera,
      p_items: rpcItems,
    })

    if (rpcError) {
      setError(rpcError.message)
      setIsSaving(false)
      return
    }

    const numero = Array.isArray(data) ? data[0]?.numero : data?.numero
    toast.success(`Ingreso ${numero ?? ""} registrado correctamente.`)
    router.push("/inventario/ingresos")
  }

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventario/ingresos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Registrar Ingreso</h1>
          <p className="text-muted-foreground mt-1">
            Crea un ingreso de compra y sus lotes de inventario.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Datos del Ingreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Ingreso</Label>
              <Select value={tipoIngreso} onValueChange={(v) => v && setTipoIngreso(v as TipoInsumo)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar...">
                    {TIPO_INSUMO_LABELS[tipoIngreso]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_INSUMO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                placeholder="Nombre del proveedor"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
              />
            </div>
          </div>

          {esMateriaPrima && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-muted/50 border">
              <div className="space-y-2">
                <Label htmlFor="temp">Temperatura de Llegada (°C)</Label>
                <Input
                  id="temp"
                  type="number"
                  placeholder="4.5"
                  value={temperaturaLlegada}
                  onChange={(e) => setTemperaturaLlegada(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa">Placa del Vehículo</Label>
                <Input
                  id="placa"
                  placeholder="ABC123"
                  value={placaVehiculo}
                  onChange={(e) => setPlacaVehiculo(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              placeholder="Notas del ingreso..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ítems</CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            Agregar ítem
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-xs text-muted-foreground px-1 grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <span>Insumo *</span>
            <span>Cantidad *</span>
            <span>Precio compra *</span>
            <span>Precio unitario</span>
            <span>Lote</span>
            <span>Vencimiento</span>
            <span className="w-8" />
          </div>

          {items.map((it, i) => {
            const pu = precioUnitario(it)
            return (
              <div key={i} className="grid gap-2 items-center grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
                <Select
                  value={it.insumo_id || ""}
                  onValueChange={(v) => v && updateItem(i, { insumo_id: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar insumo...">
                      {insumos.find((ins) => ins.id === it.insumo_id)?.nombre ?? null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {insumos.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="10"
                  value={it.cantidad}
                  onChange={(e) => updateItem(i, { cantidad: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="50000"
                  value={it.precio_compra}
                  onChange={(e) => updateItem(i, { precio_compra: e.target.value })}
                />
                <Input
                  disabled
                  value={pu !== null ? pu.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : ""}
                  placeholder="Auto"
                  className="text-muted-foreground"
                />
                <Input
                  placeholder="Opcional"
                  value={it.codigo_lote}
                  onChange={(e) => updateItem(i, { codigo_lote: e.target.value })}
                />
                <Input
                  type="date"
                  value={it.fecha_vencimiento}
                  onChange={(e) => updateItem(i, { fecha_vencimiento: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  disabled={items.length === 1}
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}

          <div className="flex justify-end pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${total.toLocaleString("es-CO", { maximumFractionDigits: 2 })}</span>
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/inventario/ingresos")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving || validItems.length === 0}>
          {isSaving ? "Guardando..." : "Registrar Ingreso"}
        </Button>
      </div>
    </div>
  )
}
