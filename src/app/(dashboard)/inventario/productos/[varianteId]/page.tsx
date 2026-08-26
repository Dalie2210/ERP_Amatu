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
import { ArrowLeft, PackageOpen, HeartHandshake } from "lucide-react"
import type { ProductoLote, MovimientoInventario, VStockProducto } from "@/types"
import { ESTADO_PT_LABELS, TIPO_MOVIMIENTO_LABELS } from "@/lib/constants/labels"
import { usePermissions } from "@/hooks/usePermissions"
import { DonarLoteDialog, type LotePreset } from "@/components/inventario/DonarLoteDialog"

interface VarianteInfo {
  id: string
  presentacion: string
  producto_id: string
  producto_nombre: string
}

function diasParaVencer(fecha: string | null): number | null {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ProductoVarianteDetailPage() {
  const params = useParams<{ varianteId: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  // ERP-DON-02: donar un lote existente es una decisión de admin.
  const { isAdmin } = usePermissions()
  const [loteADonar, setLoteADonar] = useState<LotePreset | null>(null)

  const [variante, setVariante] = useState<VarianteInfo | null>(null)
  const [stockRows, setStockRows] = useState<VStockProducto[]>([])
  const [lotes, setLotes] = useState<ProductoLote[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: varianteData }, { data: stockData }, { data: lotesData }, { data: movData }] =
      await Promise.all([
        supabase
          .from("producto_variantes")
          .select("id, presentacion, producto_id, productos(nombre)")
          .eq("id", params.varianteId)
          .single(),
        supabase.from("v_stock_productos").select("*").eq("variante_id", params.varianteId),
        supabase
          .from("producto_lotes")
          .select("*")
          .eq("variante_id", params.varianteId)
          .gt("cantidad_disponible", 0)
          .neq("estado", "despachado")
          .order("fecha_produccion", { ascending: true }),
        supabase
          .from("movimientos_inventario")
          .select("*")
          .eq("variante_id", params.varianteId)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

    if (varianteData) {
      const producto = varianteData.productos as unknown as { nombre: string } | null
      setVariante({
        id: varianteData.id,
        presentacion: varianteData.presentacion,
        producto_id: varianteData.producto_id,
        producto_nombre: producto?.nombre ?? "—",
      })
    } else {
      setVariante(null)
    }
    setStockRows((stockData ?? []) as VStockProducto[])
    setLotes(lotesData ?? [])
    setMovimientos(movData ?? [])
    setIsLoading(false)
  }, [supabase, params.varianteId])

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

  if (!variante) {
    return (
      <div className="max-w-[1200px] mx-auto text-center py-16 text-muted-foreground">
        <PackageOpen className="h-12 w-12 mx-auto opacity-30 mb-3" />
        Producto no encontrado.
      </div>
    )
  }

  const producido = stockRows.find((r) => r.estado === "producido")?.stock_disponible ?? 0
  const empacado = stockRows.find((r) => r.estado === "empacado")?.stock_disponible ?? 0
  const despachado = stockRows.find((r) => r.estado === "despachado")?.stock_disponible ?? 0
  const disponible = producido + empacado

  const disponibleRows = stockRows.filter((r) => r.estado !== "despachado")
  const valorTotal = disponibleRows.reduce((acc, r) => acc + r.stock_disponible * r.costo_promedio_lote, 0)
  const costoPromedio = disponible > 0 ? valorTotal / disponible : 0

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventario/productos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">{variante.producto_nombre}</h1>
          <p className="text-muted-foreground mt-1">{variante.presentacion}</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Stock Disponible</p>
            <p className="text-xl font-semibold">{disponible.toLocaleString("es-CO")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Costo Promedio</p>
            <p className="text-xl font-semibold">
              ${costoPromedio.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-xl font-semibold">
              ${valorTotal.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Producido</p>
            <p className="text-xl font-semibold">{producido.toLocaleString("es-CO")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Empacado</p>
            <p className="text-xl font-semibold">{empacado.toLocaleString("es-CO")}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Lotes Activos (Rotación)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">Sin lotes con saldo disponible.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead>Producción</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Días p/ vencer</TableHead>
                  {isAdmin && <TableHead className="w-[52px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote, i) => {
                  const dias = diasParaVencer(lote.fecha_vencimiento)
                  return (
                    <TableRow key={lote.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {lote.codigo_lote}
                          {i === 0 && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-normal">
                              Enviar primero
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {ESTADO_PT_LABELS[lote.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {lote.cantidad_disponible.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-right">
                        ${lote.costo_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lote.fecha_produccion).toLocaleDateString("es-CO")}
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
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar como donación"
                            aria-label="Marcar como donación"
                            onClick={() =>
                              setLoteADonar({
                                id: lote.id,
                                codigoLote: lote.codigo_lote,
                                disponible: lote.cantidad_disponible,
                              })
                            }
                          >
                            <HeartHandshake className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      <DonarLoteDialog
        lote={loteADonar}
        onOpenChange={(open) => { if (!open) setLoteADonar(null) }}
        onDone={() => void fetchData()}
      />
    </div>
  )
}
