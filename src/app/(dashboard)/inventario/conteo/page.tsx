"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ClipboardCheck, Sliders } from "lucide-react"
import type { CategoriaConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { AjusteRapidoDialog, type AjustePreset } from "@/components/inventario/AjusteRapidoDialog"

interface ConteoItemRow {
  key: string
  nombre: string
  detalle: string
  stockMinimo: number | null
  cantidadSistema: number
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
}

export default function ConteoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [categoria, setCategoria] = useState<CategoriaConteo>("materia_prima")
  const [items, setItems] = useState<ConteoItemRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        insumoId: i.id,
        productoId: null,
        varianteId: null,
      }))
      setItems(rows)
    }
    setIsLoading(false)
  }, [supabase, categoria])

  useEffect(() => { loadItems() }, [loadItems])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Conteo</h1>
        <p className="text-muted-foreground mt-1">
          Consulta el stock del sistema por categoría y ajusta un ítem puntual. El historial de cada
          ajuste queda registrado en Movimientos.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Conteo — {CATEGORIA_CONTEO_LABELS[categoria]}
          </CardTitle>
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
                  <TableHead className="text-right">Ajustar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const preset: AjustePreset = it.insumoId
                    ? {
                        tipo: "insumo",
                        nombre: it.nombre,
                        detalle: it.detalle,
                        insumoId: it.insumoId,
                        stockActual: it.cantidadSistema,
                        stockMinimo: it.stockMinimo ?? undefined,
                      }
                    : {
                        tipo: "producto",
                        nombre: it.nombre,
                        detalle: it.detalle,
                        productoId: it.productoId ?? undefined,
                        varianteId: it.varianteId ?? undefined,
                        stockActual: it.cantidadSistema,
                      }
                  return (
                    <TableRow key={it.key}>
                      <TableCell className="font-medium">{it.nombre}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{it.detalle}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {it.cantidadSistema.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <AjusteRapidoDialog
                          preset={preset}
                          onSaved={loadItems}
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
    </div>
  )
}
