"use client"

import { useEffect, useMemo, useState } from "react"
import { startOfMonth, startOfYear, subDays, subMonths, endOfMonth, format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MultiSelectCombobox, type MultiSelectOption } from "@/components/ui/multi-select"
import { Download, Loader2 } from "lucide-react"
import { TIPO_INSUMO_LABELS } from "@/lib/constants/labels"
import type { TipoInsumo } from "@/types"
import { descargarReporte } from "@/lib/inventario/reportes/descargar"
import type { ValorizadoFilters } from "@/lib/inventario/reportes/valorizado"

interface InsumoOption {
  id: string
  codigo: string
  nombre: string
  tipo: TipoInsumo
}

const VENCIMIENTO_LABELS: Record<NonNullable<ValorizadoFilters["vencimiento"]>, string> = {
  todos: "Todos",
  vigentes: "Vigentes",
  por_vencer: "Por vencer (30 días)",
  vencidos: "Vencidos",
}

const TIPO_OPTIONS: MultiSelectOption[] = Object.entries(TIPO_INSUMO_LABELS).map(([value, label]) => ({ value, label }))

const DATE_PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "Hoy", range: () => { const d = format(new Date(), "yyyy-MM-dd"); return [d, d] } },
  { label: "Últimos 7 días", range: () => [format(subDays(new Date(), 6), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")] },
  { label: "Este mes", range: () => [format(startOfMonth(new Date()), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")] },
  { label: "Mes anterior", range: () => { const prev = subMonths(new Date(), 1); return [format(startOfMonth(prev), "yyyy-MM-dd"), format(endOfMonth(prev), "yyyy-MM-dd")] } },
  { label: "Últimos 90 días", range: () => [format(subDays(new Date(), 89), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")] },
  { label: "Este año", range: () => [format(startOfYear(new Date()), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")] },
  { label: "Todo", range: () => ["", ""] },
]

export function ExportarValorizadoDialog() {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [tipos, setTipos] = useState<string[]>([])
  const [insumoIds, setInsumoIds] = useState<string[]>([])
  const [proveedores, setProveedores] = useState<string[]>([])
  const [soloConStock, setSoloConStock] = useState(true)
  const [vencimiento, setVencimiento] = useState<ValorizadoFilters["vencimiento"]>("todos")
  const [incluirPT, setIncluirPT] = useState(true)

  const [insumosOptions, setInsumosOptions] = useState<InsumoOption[]>([])
  const [proveedorOptions, setProveedorOptions] = useState<MultiSelectOption[]>([])

  useEffect(() => {
    if (!open) return
    supabase
      .from("insumos")
      .select("id, codigo, nombre, tipo")
      .eq("is_active", true)
      .order("nombre")
      .then(({ data }: { data: InsumoOption[] | null }) => setInsumosOptions(data ?? []))

    supabase
      .from("insumo_lotes")
      .select("proveedor")
      .not("proveedor", "is", null)
      .then(({ data }: { data: { proveedor: string | null }[] | null }) => {
        const unique = Array.from(new Set((data ?? []).map((r) => r.proveedor).filter((p): p is string => !!p)))
        setProveedorOptions(unique.sort().map((p) => ({ value: p, label: p })))
      })
  }, [supabase, open])

  const insumoOptionsFiltrados: MultiSelectOption[] = insumosOptions
    .filter((i) => tipos.length === 0 || tipos.includes(i.tipo))
    .map((i) => ({ value: i.id, label: `${i.codigo} — ${i.nombre}` }))

  const filtrosInsumoActivos = tipos.length > 0 || insumoIds.length > 0 || proveedores.length > 0
  const ptSeOmitira = filtrosInsumoActivos && incluirPT

  const handleGenerar = async () => {
    setLoading(true)
    const filters: Partial<ValorizadoFilters> = {
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      tipos: tipos as TipoInsumo[],
      insumoIds,
      proveedores,
      soloConStock,
      vencimiento,
      incluirPT,
    }
    const fecha = new Date().toISOString().slice(0, 10)
    await descargarReporte("/api/inventario/reportes/valorizado", {
      method: "POST",
      body: filters,
      filenameFallback: `inventario_valorizado_${fecha}.xlsx`,
    })
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Download className="h-4 w-4" />
        Descargar Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Exportar Inventario Valorizado</DialogTitle>
          <DialogDescription>
            Genera el Excel contable lote a lote (Insumos + Producto Terminado + Resumen).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Rango de fechas de ingreso</Label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { const [desde, hasta] = preset.range(); setFechaDesde(desde); setFechaHasta(hasta) }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fecha-desde" className="text-xs text-muted-foreground">Desde</Label>
                <Input id="fecha-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fecha-hasta" className="text-xs text-muted-foreground">Hasta</Label>
                <Input id="fecha-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo / Categoría</Label>
              <MultiSelectCombobox options={TIPO_OPTIONS} value={tipos} onChange={setTipos} placeholder="Todos" />
            </div>
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <MultiSelectCombobox options={proveedorOptions} value={proveedores} onChange={setProveedores} placeholder="Todos" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Insumos</Label>
            <MultiSelectCombobox options={insumoOptionsFiltrados} value={insumoIds} onChange={setInsumoIds} placeholder="Todos" />
          </div>

          <div className="space-y-2">
            <Label>Estado de vencimiento</Label>
            <Select value={vencimiento} onValueChange={(v) => v && setVencimiento(v as ValorizadoFilters["vencimiento"])}>
              <SelectTrigger>
                <SelectValue>{VENCIMIENTO_LABELS[vencimiento ?? "todos"]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VENCIMIENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="solo-stock" checked={soloConStock} onCheckedChange={setSoloConStock} />
            <Label htmlFor="solo-stock" className="text-sm">Solo con stock disponible</Label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Switch
                id="incluir-pt"
                checked={incluirPT && !filtrosInsumoActivos}
                onCheckedChange={setIncluirPT}
                disabled={filtrosInsumoActivos}
              />
              <Label htmlFor="incluir-pt" className="text-sm">Incluir Producto Terminado</Label>
            </div>
            {ptSeOmitira && (
              <p className="text-xs text-muted-foreground pl-[52px]">
                Se omite: los filtros de insumo/tipo/proveedor no aplican a Producto Terminado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleGenerar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Generar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
