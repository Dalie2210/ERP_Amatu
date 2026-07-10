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
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface RecetaOption {
  id: string
  nombre: string
  rendimiento: number
  producto_id: string
  variante_id: string | null
  producto: { nombre: string } | null
  variante: { presentacion: string } | null
  receta_items: { insumo_id: string; cantidad: number; insumo: { nombre: string; merma_pct: number } }[]
}

interface StockRow {
  insumo_id: string
  stock_disponible: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function NuevaOrdenProduccionDialog({ open, onOpenChange, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [recetas, setRecetas] = useState<RecetaOption[]>([])
  const [recetaId, setRecetaId] = useState<string>("")
  const [cantidad, setCantidad] = useState("")
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState("")
  const [stockInsumos, setStockInsumos] = useState<StockRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRecetaId("")
    setCantidad("")
    setFecha(new Date().toISOString().slice(0, 10))
    setNotas("")
    setError(null)

    supabase
      .from("recetas")
      .select(`
        id, nombre, rendimiento, producto_id, variante_id,
        producto:productos!producto_id(nombre),
        variante:producto_variantes!variante_id(presentacion),
        receta_items(insumo_id, cantidad, insumo:insumos!insumo_id(nombre, merma_pct))
      `)
      .eq("is_active", true)
      .order("nombre")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => setRecetas((data ?? []) as RecetaOption[]))

    supabase
      .from("v_stock_insumos")
      .select("insumo_id, stock_disponible")
      .then(({ data }) => setStockInsumos((data ?? []) as unknown as StockRow[]))
  }, [open, supabase])

  const receta = recetas.find((r) => r.id === recetaId) ?? null

  const faltantes = useMemo(() => {
    if (!receta) return []
    const cant = parseFloat(cantidad)
    if (isNaN(cant) || cant <= 0 || receta.rendimiento <= 0) return []
    return receta.receta_items
      .map((it) => {
        const cocido = it.cantidad * (cant / receta.rendimiento)
        const factor = 1 - it.insumo.merma_pct / 100
        const crudo = factor > 0 ? cocido / factor : Infinity
        const disponible = stockInsumos.find((s) => s.insumo_id === it.insumo_id)?.stock_disponible ?? 0
        return { nombre: it.insumo.nombre, crudo, disponible, falta: crudo > disponible }
      })
      .filter((f) => f.falta)
  }, [receta, cantidad, stockInsumos])

  async function handleSave() {
    setError(null)
    if (!receta) { setError("Selecciona una receta."); return }
    const cant = parseFloat(cantidad)
    if (isNaN(cant) || cant <= 0) { setError("La cantidad debe ser mayor a cero."); return }

    setSaving(true)
    const { error: insErr } = await supabase.from("ordenes_produccion").insert({
      producto_id: receta.producto_id,
      variante_id: receta.variante_id,
      receta_id: receta.id,
      cantidad_planificada: cant,
      estado: "planificada",
      fecha,
      notas: notas.trim() || null,
    })
    setSaving(false)
    if (insErr) { setError(insErr.message); return }

    toast.success("Orden de producción creada.")
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Producción</DialogTitle>
          <DialogDescription>
            Selecciona producto + presentación (solo se listan los que tienen receta activa).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Receta (Producto / Presentación)</Label>
            <Select value={recetaId} onValueChange={(v) => v && setRecetaId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar receta...">
                  {receta
                    ? `${receta.producto?.nombre ?? ""} — ${receta.variante?.presentacion ?? "Todas"} (${receta.nombre})`
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
            {recetas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay recetas activas. Crea una en Inventario → Recetas (BOM).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cantidad a Producir</Label>
              <Input
                type="number"
                placeholder="10"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
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
          <Button onClick={handleSave} disabled={saving || !recetaId || !cantidad}>
            {saving ? "Creando..." : "Crear Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
