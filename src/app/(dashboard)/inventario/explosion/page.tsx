"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Calculator, ArrowDownToLine, AlertTriangle } from "lucide-react"
import type { ExplosionMaterialesRow, EstadoPedido } from "@/types"

interface OrdenOption {
  id: string
  numero: string | null
  cantidad_planificada: number
  fecha: string
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
}

interface PedidoOption {
  id: string
  numero_pedido: string
  estado: string
  clientes: { nombre_completo: string } | null
}

const ESTADOS_PEDIDO_PENDIENTE: EstadoPedido[] = [
  "confirmado",
  "en_preparacion",
  "espera_produccion",
  "listo_despacho",
  "parcial",
]

export default function ExplosionMaterialesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [ordenes, setOrdenes] = useState<OrdenOption[]>([])
  const [pedidos, setPedidos] = useState<PedidoOption[]>([])
  const [selectedOrdenes, setSelectedOrdenes] = useState<Set<string>>(new Set())
  const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set())
  const [resultado, setResultado] = useState<ExplosionMaterialesRow[] | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isCalculando, setIsCalculando] = useState(false)

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true)
    const [ordenesRes, pedidosRes] = await Promise.all([
      supabase
        .from("ordenes_produccion")
        .select("id, numero, cantidad_planificada, fecha, productos(nombre), producto_variantes(presentacion)")
        .eq("estado", "planificada")
        .order("fecha", { ascending: true }),
      supabase
        .from("pedidos")
        .select("id, numero_pedido, estado, clientes(nombre_completo)")
        .in("estado", ESTADOS_PEDIDO_PENDIENTE)
        .order("created_at", { ascending: false })
        .limit(100),
    ])
    setOrdenes((ordenesRes.data ?? []) as unknown as OrdenOption[])
    setPedidos((pedidosRes.data ?? []) as unknown as PedidoOption[])
    setIsLoadingOptions(false)
  }, [supabase])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const toggleOrden = (id: string) =>
    setSelectedOrdenes((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const togglePedido = (id: string) =>
    setSelectedPedidos((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleCalcular = async () => {
    if (selectedOrdenes.size === 0 && selectedPedidos.size === 0) {
      toast.error("Selecciona al menos una orden de producción o un pedido.")
      return
    }
    setIsCalculando(true)
    const { data, error } = await supabase.rpc("fn_explosion_materiales", {
      p_ordenes_ids: Array.from(selectedOrdenes),
      p_pedidos_ids: Array.from(selectedPedidos),
    })
    if (error) {
      toast.error("Error calculando explosión: " + error.message)
      setIsCalculando(false)
      return
    }
    setResultado((data ?? []) as ExplosionMaterialesRow[])
    setIsCalculando(false)
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Explosión de Materiales</h1>
        <p className="text-muted-foreground mt-1">
          Requerimiento de insumos crudos para órdenes planificadas y pedidos pendientes vs. stock disponible.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Órdenes de Producción Planificadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[360px] overflow-y-auto">
            {isLoadingOptions ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : ordenes.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No hay órdenes planificadas.</p>
            ) : (
              <div className="divide-y">
                {ordenes.map((o) => (
                  <label key={o.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 cursor-pointer">
                    <Checkbox checked={selectedOrdenes.has(o.id)} onCheckedChange={() => toggleOrden(o.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{o.numero} — {o.productos?.nombre} ({o.producto_variantes?.presentacion})</p>
                      <p className="text-xs text-muted-foreground">Planificado: {o.cantidad_planificada} · {o.fecha}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pedidos Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[360px] overflow-y-auto">
            {isLoadingOptions ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : pedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No hay pedidos pendientes.</p>
            ) : (
              <div className="divide-y">
                {pedidos.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 cursor-pointer">
                    <Checkbox checked={selectedPedidos.has(p.id)} onCheckedChange={() => togglePedido(p.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.numero_pedido} — {p.clientes?.nombre_completo ?? "—"}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleCalcular} disabled={isCalculando} className="gap-2">
          <Calculator className="h-4 w-4" />
          {isCalculando ? "Calculando..." : "Calcular Explosión"}
        </Button>
      </div>

      {resultado && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Requerimiento de Insumos (crudo) vs. Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {resultado.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No se requieren insumos para la selección actual.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Demanda Total</TableHead>
                    <TableHead className="text-right">Stock Disponible</TableHead>
                    <TableHead className="text-right">Faltante</TableHead>
                    <TableHead className="text-right">Sugerido Comprar</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.map((r) => {
                    const faltante = r.faltante > 0
                    return (
                      <TableRow key={r.insumo_id} className={faltante ? "bg-destructive/5" : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {faltante && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                            {r.insumo_nombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{r.demanda_total.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {r.unidad_medida}</TableCell>
                        <TableCell className="text-right">{r.stock_disponible.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {r.unidad_medida}</TableCell>
                        <TableCell className="text-right">
                          {faltante ? (
                            <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                              {r.faltante.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {r.unidad_medida}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {faltante ? r.sugerido_comprar.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {faltante && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              render={<Link href={`/inventario/ingresos/nuevo?insumo_id=${r.insumo_id}&cantidad=${Math.ceil(r.sugerido_comprar)}`} />}
                              nativeButton={false}
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                              Registrar ingreso
                            </Button>
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
      )}
    </div>
  )
}
