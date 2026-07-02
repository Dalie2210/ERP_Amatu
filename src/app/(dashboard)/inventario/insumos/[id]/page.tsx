"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, PackageOpen } from "lucide-react"
import type { Insumo, InsumoLote, MovimientoInventario, VStockInsumo } from "@/types"
import { TIPO_INSUMO_LABELS, UNIDAD_MEDIDA_LABELS, TIPO_MOVIMIENTO_LABELS } from "@/lib/constants/labels"

function diasParaVencer(fecha: string | null): number | null {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function InsumoDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [insumo, setInsumo] = useState<Insumo | null>(null)
  const [stock, setStock] = useState<VStockInsumo | null>(null)
  const [lotes, setLotes] = useState<InsumoLote[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: insumoData }, { data: stockData }, { data: lotesData }, { data: movData }] =
      await Promise.all([
        supabase.from("insumos").select("*").eq("id", params.id).single(),
        supabase.from("v_stock_insumos").select("*").eq("insumo_id", params.id).maybeSingle(),
        supabase
          .from("insumo_lotes")
          .select("*")
          .eq("insumo_id", params.id)
          .gt("cantidad_disponible", 0)
          .order("fecha_vencimiento", { ascending: true, nullsFirst: false }),
        supabase
          .from("movimientos_inventario")
          .select("*")
          .eq("insumo_id", params.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

    setInsumo(insumoData)
    setStock(stockData)
    setLotes(lotesData ?? [])
    setMovimientos(movData ?? [])
    setIsLoading(false)
  }, [supabase, params.id])

  useEffect(() => { fetchData() }, [fetchData])

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!insumo) {
    return (
      <div className="max-w-[1200px] mx-auto text-center py-16 text-muted-foreground">
        <PackageOpen className="h-12 w-12 mx-auto opacity-30 mb-3" />
        Insumo no encontrado.
      </div>
    )
  }

  const bajoMinimo = stock?.bajo_minimo ?? false

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventario/insumos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading tracking-tight">{insumo.nombre}</h1>
            <span className="text-sm text-muted-foreground font-mono">{insumo.codigo}</span>
            {bajoMinimo && <Badge variant="destructive">Bajo mínimo</Badge>}
            <Badge variant={insumo.is_active ? "default" : "secondary"}>
              {insumo.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {TIPO_INSUMO_LABELS[insumo.tipo]} · {UNIDAD_MEDIDA_LABELS[insumo.unidad_medida]}
          </p>
        </div>
      </div>

      {/* Info section */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Stock Disponible</p>
            <p className="text-xl font-semibold">
              {(stock?.stock_disponible ?? 0).toLocaleString("es-CO")} {insumo.unidad_medida}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Costo Promedio</p>
            <p className="text-xl font-semibold">
              ${insumo.costo_promedio.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Stock Mínimo</p>
            <p className="text-xl font-semibold">{insumo.stock_minimo.toLocaleString("es-CO")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Merma</p>
            <p className="text-xl font-semibold">{insumo.merma_pct}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Lotes activos */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Lotes Activos (FEFO)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">Sin lotes con saldo disponible.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Días p/ vencer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => {
                  const dias = diasParaVencer(lote.fecha_vencimiento)
                  return (
                    <TableRow key={lote.id}>
                      <TableCell className="font-mono text-sm">{lote.codigo_lote}</TableCell>
                      <TableCell className="text-right">
                        {lote.cantidad_disponible.toLocaleString("es-CO")} {insumo.unidad_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        ${lote.costo_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lote.proveedor ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lote.fecha_ingreso).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lote.fecha_vencimiento
                          ? new Date(lote.fecha_vencimiento).toLocaleDateString("es-CO")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {dias === null ? (
                          "—"
                        ) : (
                          <Badge variant={dias <= 30 ? "destructive" : "outline"} className="font-normal">
                            {dias} días
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Kardex */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">Sin movimientos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(mov.created_at).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {TIPO_MOVIMIENTO_LABELS[mov.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${mov.cantidad >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {mov.cantidad >= 0 ? "+" : ""}{mov.cantidad.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${mov.costo_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{mov.notas ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
