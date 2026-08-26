"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { EmpacarLoteDialog } from "@/components/inventario/EmpacarLoteDialog"
import { NuevaOrdenProduccionDialog, type OrdenPreset } from "@/components/inventario/NuevaOrdenProduccionDialog"
import { BuscadorLotesPT } from "@/components/inventario/BuscadorLotesPT"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Search, PackageCheck, FlaskConical, X, CheckSquare, ListOrdered } from "lucide-react"
import type { VStockProducto } from "@/types"

interface GroupedRow {
  producto_id: string
  variante_id: string
  producto_nombre: string
  variante_presentacion: string
  producido: number
  empacado: number
  despachado: number
  stock_minimo: number
}

export default function ProductosPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { role } = useAuth()

  const [rows, setRows] = useState<GroupedRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [empacando, setEmpacando] = useState<GroupedRow | null>(null)
  const [minimoEdits, setMinimoEdits] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [presets, setPresets] = useState<OrdenPreset[] | null>(null)

  const canWrite = role === "admin" || role === "logistica"

  const fetchStock = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("v_stock_productos").select("*")
    if (error) {
      toast.error("Error cargando stock: " + error.message)
      setIsLoading(false)
      return
    }

    const grouped = new Map<string, GroupedRow>()
    for (const r of (data ?? []) as VStockProducto[]) {
      const key = `${r.producto_id}:${r.variante_id}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          producto_id: r.producto_id,
          variante_id: r.variante_id,
          producto_nombre: r.producto_nombre,
          variante_presentacion: r.variante_presentacion,
          producido: 0,
          empacado: 0,
          despachado: 0,
          stock_minimo: r.stock_minimo ?? 0,
        })
      }
      const g = grouped.get(key)!
      if (r.estado === "producido") g.producido += r.stock_disponible
      else if (r.estado === "empacado") g.empacado += r.stock_disponible
      else if (r.estado === "despachado") g.despachado += r.stock_disponible
    }

    setRows(Array.from(grouped.values()).sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre)))
    setMinimoEdits({})
    setSelected(new Set())
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchStock() }, [fetchStock])

  const filtered = rows.filter((r) =>
    r.producto_nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const keyOf = (r: GroupedRow) => `${r.producto_id}:${r.variante_id}`
  // Cuenta como stock disponible lo producido (sin empacar) + lo ya empacado
  // (aún no despachado); despachado no cuenta porque ya salió del inventario.
  const disponibleOf = (r: GroupedRow) => r.producido + r.empacado
  const faltaOf = (r: GroupedRow) => Math.max(0, r.stock_minimo - disponibleOf(r))
  const necesitaProduccion = (r: GroupedRow) => disponibleOf(r) < r.stock_minimo

  const elegibles = filtered.filter(necesitaProduccion)
  const seleccionadas = filtered.filter((r) => selected.has(keyOf(r)))

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const todosElegiblesSeleccionados =
    elegibles.length > 0 && elegibles.every((r) => selected.has(keyOf(r)))

  const toggleTodosElegibles = () => {
    setSelected(todosElegiblesSeleccionados ? new Set() : new Set(elegibles.map(keyOf)))
  }

  async function saveMinimo(r: GroupedRow, raw: string) {
    const key = keyOf(r)
    const parsed = raw.trim() === "" ? 0 : parseFloat(raw)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("El mínimo debe ser un número mayor o igual a cero.")
      setMinimoEdits((p) => { const n = { ...p }; delete n[key]; return n })
      return
    }
    if (parsed === r.stock_minimo) {
      setMinimoEdits((p) => { const n = { ...p }; delete n[key]; return n })
      return
    }
    const { error } = await supabase
      .from("producto_variantes")
      .update({ stock_minimo: parsed })
      .eq("id", r.variante_id)
    if (error) {
      toast.error("Error guardando mínimo: " + error.message)
      return
    }
    setRows((prev) => prev.map((row) => (keyOf(row) === key ? { ...row, stock_minimo: parsed } : row)))
    setMinimoEdits((p) => { const n = { ...p }; delete n[key]; return n })
    toast.success("Mínimo actualizado.")
  }

  const abrirOrden = (rowsParaOrden: GroupedRow[]) => {
    setPresets(
      rowsParaOrden.map((r) => ({
        producto_id: r.producto_id,
        variante_id: r.variante_id,
        cantidad: faltaOf(r),
      }))
    )
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Producto Terminado — Stock</h1>
        <p className="text-muted-foreground mt-1">
          Stock por variante, desglosado por estado. El mínimo define cuánto PT debería haber; la diferencia se mide contra lo producido + empacado (sin contar lo ya despachado).
        </p>
      </div>

      <BuscadorLotesPT />

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canWrite && elegibles.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={toggleTodosElegibles}>
              <CheckSquare className="h-3.5 w-3.5" />
              {todosElegiblesSeleccionados
                ? "Deseleccionar todos"
                : `Seleccionar todos con stock faltante (${elegibles.length})`}
            </Button>
          )}
        </CardContent>
      </Card>

      {canWrite && seleccionadas.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-purple-500/5 border-purple-500/20 px-4 py-3">
          <span className="text-sm font-medium">
            {seleccionadas.length} producto{seleccionadas.length !== 1 ? "s" : ""} seleccionado{seleccionadas.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => abrirOrden(seleccionadas)}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Crear orden para {seleccionadas.length} producto{seleccionadas.length !== 1 ? "s" : ""}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          </div>
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay stock de producto terminado</p>
              <p className="text-sm">Completa una orden de producción para generar stock.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canWrite && <TableHead className="w-10" />}
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Producido</TableHead>
                  <TableHead className="text-right">Empacado</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const key = keyOf(r)
                  const falta = faltaOf(r)
                  const deficit = necesitaProduccion(r)
                  return (
                    <TableRow key={key} data-state={selected.has(key) ? "selected" : undefined}>
                      {canWrite && (
                        <TableCell>
                          {deficit ? (
                            <label className="flex items-center justify-center cursor-pointer">
                              <Checkbox
                                checked={selected.has(key)}
                                onCheckedChange={() => toggle(key)}
                                aria-label={`Seleccionar ${r.producto_nombre}`}
                              />
                            </label>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Checkbox checked={false} disabled aria-hidden />
                            </div>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{r.producto_nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{r.variante_presentacion}</TableCell>
                      <TableCell className="text-right font-medium">{r.producido.toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.empacado.toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-right">
                        {canWrite ? (
                          <Input
                            type="number"
                            className="h-8 w-20 ml-auto text-right"
                            value={minimoEdits[key] ?? String(r.stock_minimo)}
                            onChange={(e) => setMinimoEdits((p) => ({ ...p, [key]: e.target.value }))}
                            onBlur={(e) => saveMinimo(r, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                            }}
                          />
                        ) : (
                          r.stock_minimo.toLocaleString("es-CO")
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${falta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {falta > 0 ? falta.toLocaleString("es-CO") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => router.push(`/inventario/productos/${r.variante_id}`)}
                          >
                            <ListOrdered className="h-3.5 w-3.5" />
                            Ver lotes
                          </Button>
                          {canWrite && deficit && (
                            <Button
                              size="sm"
                              className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => abrirOrden([r])}
                            >
                              <FlaskConical className="h-3.5 w-3.5" />
                              Crear orden
                            </Button>
                          )}
                          {canWrite && r.producido > 0 && (
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => setEmpacando(r)}>
                              <PackageCheck className="h-3.5 w-3.5" />
                              Empacar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmpacarLoteDialog
        open={empacando !== null}
        onOpenChange={(v) => !v && setEmpacando(null)}
        productoId={empacando?.producto_id ?? null}
        varianteId={empacando?.variante_id ?? null}
        productoNombre={empacando ? `${empacando.producto_nombre} — ${empacando.variante_presentacion}` : ""}
        onPacked={fetchStock}
      />

      <NuevaOrdenProduccionDialog
        open={presets !== null}
        onOpenChange={(v) => !v && setPresets(null)}
        presets={presets ?? undefined}
        onSaved={fetchStock}
      />
    </div>
  )
}
