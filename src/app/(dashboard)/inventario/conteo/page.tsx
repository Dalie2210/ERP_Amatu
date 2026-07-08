"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ClipboardCheck, Save, History, Sliders } from "lucide-react"
import type { CategoriaConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { AjusteRapidoDialog, type AjustePreset } from "@/components/inventario/AjusteRapidoDialog"

interface ConteoItemRow {
  key: string
  nombre: string
  detalle: string
  stockMinimo: number | null
  cantidadSistema: number
  cantidadContada: string
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
}

interface HistoricoConteo {
  fecha: string
  valores: Map<string, number>
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function ConteoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [categoria, setCategoria] = useState<CategoriaConteo>("materia_prima")
  const [fecha, setFecha] = useState(todayISO())
  const [items, setItems] = useState<ConteoItemRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [historico, setHistorico] = useState<HistoricoConteo[]>([])

  const loadItems = useCallback(async () => {
    setIsLoading(true)

    if (categoria === "producto_terminado") {
      const { data: variantes } = await supabase
        .from("producto_variantes")
        .select("id, presentacion, producto_id, productos(nombre)")
        .eq("is_active", true)
        .order("presentacion")

      const { data: stockRows } = await supabase
        .from("v_stock_productos")
        .select("variante_id, estado, stock_disponible")

      const stockByVariante = new Map<string, number>()
      for (const r of (stockRows ?? []) as { variante_id: string; estado: string; stock_disponible: number }[]) {
        if (r.estado === "despachado") continue
        stockByVariante.set(r.variante_id, (stockByVariante.get(r.variante_id) ?? 0) + Number(r.stock_disponible))
      }

      const rows: ConteoItemRow[] = ((variantes ?? []) as unknown as { id: string; presentacion: string; producto_id: string; productos: { nombre: string } | null }[]).map((v) => ({
        key: v.id,
        nombre: v.productos?.nombre ?? "—",
        detalle: v.presentacion,
        stockMinimo: null,
        cantidadSistema: stockByVariante.get(v.id) ?? 0,
        cantidadContada: String(stockByVariante.get(v.id) ?? 0),
        insumoId: null,
        productoId: v.producto_id,
        varianteId: v.id,
      }))
      setItems(rows)
    } else {
      const { data: insumos } = await supabase
        .from("insumos")
        .select("id, nombre, unidad_medida, stock_minimo")
        .eq("tipo", categoria)
        .eq("is_active", true)
        .order("nombre")

      const { data: stockRows } = await supabase.from("v_stock_insumos").select("insumo_id, stock_disponible")
      const stockByInsumo = new Map(
        ((stockRows ?? []) as { insumo_id: string; stock_disponible: number }[]).map((s) => [s.insumo_id, Number(s.stock_disponible)])
      )

      const rows: ConteoItemRow[] = ((insumos ?? []) as { id: string; nombre: string; unidad_medida: string; stock_minimo: number }[]).map((i) => ({
        key: i.id,
        nombre: i.nombre,
        detalle: i.unidad_medida,
        stockMinimo: i.stock_minimo,
        cantidadSistema: stockByInsumo.get(i.id) ?? 0,
        cantidadContada: String(stockByInsumo.get(i.id) ?? 0),
        insumoId: i.id,
        productoId: null,
        varianteId: null,
      }))
      setItems(rows)
    }
    setIsLoading(false)
  }, [supabase, categoria])

  const loadHistorico = useCallback(async () => {
    const { data: conteos } = await supabase
      .from("conteos_inventario")
      .select("id, fecha")
      .eq("categoria", categoria)
      .order("fecha", { ascending: false })
      .limit(5)

    if (!conteos || conteos.length === 0) {
      setHistorico([])
      return
    }

    const conteoIds = conteos.map((c: { id: string }) => c.id)
    const { data: conteoItems } = await supabase
      .from("conteo_items")
      .select("conteo_id, insumo_id, variante_id, cantidad_contada")
      .in("conteo_id", conteoIds)

    const result: HistoricoConteo[] = conteos.map((c: { id: string; fecha: string }) => {
      const valores = new Map<string, number>()
      for (const item of (conteoItems ?? []) as { conteo_id: string; insumo_id: string | null; variante_id: string | null; cantidad_contada: number }[]) {
        if (item.conteo_id !== c.id) continue
        const key = item.insumo_id ?? item.variante_id ?? ""
        valores.set(key, item.cantidad_contada)
      }
      return { fecha: c.fecha, valores }
    })
    setHistorico(result)
  }, [supabase, categoria])

  useEffect(() => { loadItems(); loadHistorico() }, [loadItems, loadHistorico])

  const handleSave = async () => {
    if (items.length === 0) return
    setIsSaving(true)
    try {
      const { data: conteo, error: conteoErr } = await supabase
        .from("conteos_inventario")
        .insert({ fecha, categoria })
        .select()
        .single()
      if (conteoErr) throw conteoErr

      const conteoItemsCalc = items.map((it) => {
        const contada = parseFloat(it.cantidadContada) || 0
        return {
          conteo_id: conteo.id,
          insumo_id: it.insumoId,
          producto_id: it.productoId,
          variante_id: it.varianteId,
          cantidad_sistema: it.cantidadSistema,
          cantidad_contada: contada,
          diferencia: contada - it.cantidadSistema, // solo para uso local; es columna generada en BD
        }
      })

      // `diferencia` es GENERATED ALWAYS en la BD: no se puede insertar explícitamente.
      const conteoItemsPayload = conteoItemsCalc.map(({ diferencia: _diferencia, ...rest }) => rest)

      const { error: itemsErr } = await supabase.from("conteo_items").insert(conteoItemsPayload)
      if (itemsErr) throw itemsErr

      // Aplica ajustes automáticos por cada diferencia detectada
      const conDiferencia = conteoItemsCalc.filter((it) => it.diferencia !== 0)
      for (const it of conDiferencia) {
        await supabase.rpc("fn_ajuste_inventario", {
          p_insumo_id: it.insumo_id,
          p_producto_id: it.producto_id,
          p_variante_id: it.variante_id,
          p_cantidad: it.diferencia,
          p_motivo: `Conteo físico ${fecha}`,
          p_es_merma: false,
        })
      }

      toast.success(`Conteo guardado — ${conDiferencia.length} ajustes aplicados`)
      await loadItems()
      await loadHistorico()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar el conteo")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Conteo</h1>
        <p className="text-muted-foreground mt-1">
          Registra el conteo por categoría y compáralo contra el sistema, o ajusta un ítem puntual.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={categoria} onValueChange={(v) => v && setCategoria(v as CategoriaConteo)}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue>{CATEGORIA_CONTEO_LABELS[categoria]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIA_CONTEO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="w-full sm:w-[180px]" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Conteo — {CATEGORIA_CONTEO_LABELS[categoria]}
          </CardTitle>
          <Button size="sm" className="gap-2" disabled={isSaving || items.length === 0} onClick={handleSave}>
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar Conteo"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <p className="text-sm">No hay ítems activos en esta categoría.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Sistema</TableHead>
                  <TableHead className="text-right w-[140px]">Contado</TableHead>
                  <TableHead></TableHead>
                  <TableHead className="text-right">Ajustar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const contada = parseFloat(it.cantidadContada) || 0
                  const bajoMinimo = it.stockMinimo !== null && contada < it.stockMinimo
                  const preset: AjustePreset = it.insumoId
                    ? { tipo: "insumo", nombre: it.nombre, detalle: it.detalle, insumoId: it.insumoId }
                    : { tipo: "producto", nombre: it.nombre, detalle: it.detalle, productoId: it.productoId ?? undefined, varianteId: it.varianteId ?? undefined }
                  return (
                    <TableRow key={it.key} className={bajoMinimo ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{it.nombre}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{it.detalle}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {it.cantidadSistema.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-28 ml-auto text-right"
                          value={it.cantidadContada}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p) => (p.key === it.key ? { ...p, cantidadContada: e.target.value } : p))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {bajoMinimo && <Badge variant="destructive" className="text-[10px]">Bajo mínimo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <AjusteRapidoDialog
                          preset={preset}
                          onSaved={() => { loadItems(); loadHistorico() }}
                          trigger={
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Sliders className="h-4 w-4" />
                              Ajustar
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {historico.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico Comparativo — {CATEGORIA_CONTEO_LABELS[categoria]}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  {historico.map((h) => (
                    <TableHead key={h.fecha} className="text-right whitespace-nowrap">
                      {new Date(h.fecha).toLocaleDateString("es-CO")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.key}>
                    <TableCell className="font-medium">{it.nombre}{it.detalle && ` — ${it.detalle}`}</TableCell>
                    {historico.map((h) => (
                      <TableCell key={h.fecha} className="text-right text-muted-foreground">
                        {h.valores.has(it.key) ? h.valores.get(it.key)?.toLocaleString("es-CO") : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
