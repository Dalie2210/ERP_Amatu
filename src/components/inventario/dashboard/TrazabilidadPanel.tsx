"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search, ScanBarcode, Truck, FlaskConical, PackageCheck, ArrowDownToLine, ChevronRight,
} from "lucide-react"
import type { VTrazabilidadLote } from "@/types"
import { ESTADO_PT_LABELS, ESTADO_PRODUCCION_LABELS } from "@/lib/constants/labels"

export function TrazabilidadPanel() {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<VTrazabilidadLote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setIsLoading(true)
    setSearched(true)
    const { data, error } = await supabase
      .from("v_trazabilidad_lote")
      .select("*")
      .or(`codigo_lote_insumo.ilike.%${q}%,codigo_lote_pt.ilike.%${q}%`)
    if (!error) setRows((data ?? []) as unknown as VTrazabilidadLote[])
    setIsLoading(false)
  }

  const recepciones = useMemo(() => {
    const map = new Map<string, VTrazabilidadLote>()
    for (const r of rows) {
      if (r.insumo_lote_id && !map.has(r.insumo_lote_id)) map.set(r.insumo_lote_id, r)
    }
    return Array.from(map.values())
  }, [rows])

  const producciones = useMemo(() => {
    const map = new Map<string, VTrazabilidadLote>()
    for (const r of rows) {
      if (r.orden_produccion_id && !map.has(r.orden_produccion_id)) map.set(r.orden_produccion_id, r)
    }
    return Array.from(map.values())
  }, [rows])

  const lotesPT = useMemo(() => {
    const map = new Map<string, VTrazabilidadLote>()
    for (const r of rows) {
      if (r.producto_lote_id && !map.has(r.producto_lote_id)) map.set(r.producto_lote_id, r)
    }
    return Array.from(map.values())
  }, [rows])

  const despachos = useMemo(() => {
    const map = new Map<string, VTrazabilidadLote>()
    for (const r of rows) {
      if (r.remision_item_id && !map.has(r.remision_item_id)) map.set(r.remision_item_id, r)
    }
    return Array.from(map.values())
  }, [rows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código de lote (insumo o PT)..."
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || isLoading}>
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !searched ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <ScanBarcode className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Rastrea un lote</p>
            <p className="text-sm">Ingresa un código de lote de insumo o de producto terminado para ver su recorrido.</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <ScanBarcode className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Sin resultados</p>
            <p className="text-sm">No se encontró ningún lote con ese código.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recepción */}
          {recepciones.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Recepción (Insumo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recepciones.map((r) => (
                  <div key={r.insumo_lote_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-md bg-muted/40 border text-sm">
                    <span className="font-mono font-medium">{r.codigo_lote_insumo}</span>
                    <span className="text-muted-foreground">Insumo: <span className="text-foreground">{r.insumo_nombre}</span></span>
                    <span className="text-muted-foreground">Proveedor: <span className="text-foreground">{r.proveedor ?? "—"}</span></span>
                    <span className="text-muted-foreground">Ingreso: <span className="text-foreground">{r.fecha_ingreso}</span></span>
                    <span className="text-muted-foreground">Vence: <span className="text-foreground">{r.insumo_fecha_vencimiento ?? "—"}</span></span>
                    <span className="text-muted-foreground">Cant. inicial: <span className="text-foreground">{r.insumo_cantidad_inicial}</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Producción */}
          {producciones.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Producción que consumió el lote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {producciones.map((r) => (
                  <div key={r.orden_produccion_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-md bg-muted/40 border text-sm">
                    <span className="font-mono font-medium">{r.numero_op}</span>
                    <span className="text-muted-foreground">Fecha: <span className="text-foreground">{r.fecha_produccion}</span></span>
                    <Badge variant="outline">{r.estado_op ? ESTADO_PRODUCCION_LABELS[r.estado_op] : "—"}</Badge>
                    <span className="text-muted-foreground">Consumido de este lote: <span className="text-foreground">{r.cantidad_consumida}</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* PT generado */}
          {lotesPT.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Lotes de Producto Terminado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lotesPT.map((r) => (
                  <div key={r.producto_lote_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-md bg-muted/40 border text-sm">
                    <span className="font-mono font-medium">{r.codigo_lote_pt}</span>
                    <span className="text-muted-foreground">Producto: <span className="text-foreground">{r.producto_nombre} — {r.variante_presentacion}</span></span>
                    <Badge variant="outline">{r.estado_pt ? ESTADO_PT_LABELS[r.estado_pt] : "—"}</Badge>
                    <span className="text-muted-foreground">Cant. inicial: <span className="text-foreground">{r.pt_cantidad_inicial}</span></span>
                    <span className="text-muted-foreground">Vence: <span className="text-foreground">{r.pt_fecha_vencimiento ?? "—"}</span></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Despachos */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Despachos (Remisiones / Pedidos)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {despachos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este lote aún no ha sido despachado.</p>
              ) : (
                despachos.map((r) => (
                  <div key={r.remision_item_id} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-md bg-muted/40 border text-sm">
                    <span className="font-mono font-medium">{r.numero_remision}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Pedido: <span className="text-foreground">{r.numero_pedido}</span></span>
                    <span className="text-muted-foreground">Cliente: <span className="text-foreground">{r.cliente_nombre ?? "—"}</span></span>
                    <span className="text-muted-foreground">Fecha: <span className="text-foreground">{r.fecha_remision}</span></span>
                    <span className="text-muted-foreground">Entregado: <span className="text-foreground">{r.cantidad_entregada}</span></span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
