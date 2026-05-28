"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  TrendingUp, ShoppingBag, DollarSign, Target, Plus, ChevronRight, Package,
  RotateCcw, ArrowLeftRight,
} from "lucide-react"
import Link from "next/link"

const estadoLabels: Record<string, string> = {
  fecha_tentativa: "Por Confirmar",
  confirmado: "Confirmado",
  en_preparacion: "Preparación",
  espera_produccion: "Esp. Producción",
  listo_despacho: "Listo",
  despachado: "Despachado",
  devolucion: "Devolución",
  parcial: "Parcial",
  cambio: "Cambio",
}

const estadoColors: Record<string, string> = {
  fecha_tentativa: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-green-100 text-green-800",
  en_preparacion: "bg-blue-100 text-blue-800",
  espera_produccion: "bg-orange-100 text-orange-800",
  listo_despacho: "bg-indigo-100 text-indigo-800",
  despachado: "bg-emerald-100 text-emerald-800",
  devolucion: "bg-red-100 text-red-800",
  parcial: "bg-amber-100 text-amber-800",
  cambio: "bg-pink-100 text-pink-800",
}

const estadoFunnelOrder = [
  "fecha_tentativa", "confirmado", "en_preparacion",
  "espera_produccion", "listo_despacho", "despachado",
]

const fuenteLabels: Record<string, string> = {
  meta_ads: "Meta Ads",
  referido_cliente: "Ref. Cliente",
  referido_veterinario: "Ref. Veterinario",
  referido_entrenador: "Ref. Entrenador",
  distribuidor: "Distribuidor",
  otro: "Otro",
}

const fuenteColors: Record<string, string> = {
  meta_ads: "bg-blue-100 text-blue-800",
  referido_cliente: "bg-purple-100 text-purple-800",
  referido_veterinario: "bg-teal-100 text-teal-800",
  referido_entrenador: "bg-cyan-100 text-cyan-800",
  distribuidor: "bg-orange-100 text-orange-800",
  otro: "bg-gray-100 text-gray-800",
}

const pagoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Pagado",
}

interface RecentOrder {
  id: string
  numero_pedido: string
  estado: string
  estado_pago: string
  total: number
  created_at: string
  fue_editado: boolean
  clientes: { nombre_completo: string } | null
}

interface AliadoBreakdown {
  nombre: string
  count: number
  total: number
}

interface DashboardData {
  revenueThisMonth: number
  activeOrders: number
  commissionThisMonth: number
  leadsCount: number
  closuresCount: number
  devolucionCount: number
  cambioCount: number
  estadoCounts: Record<string, number>
  topProducts: { nombre: string; unidades: number; revenue: number }[]
  fuenteCounts: Record<string, number>
  aliadoBreakdowns: Record<string, AliadoBreakdown[]>
  recentOrders: RecentOrder[]
}

function CardSkeleton() {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6 px-5 pb-5 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-36" />
      </CardContent>
    </Card>
  )
}

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [aliadoDialogFuente, setAliadoDialogFuente] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { data: pedidosMes },
        { data: allPedidos },
        { data: comisiones },
        { count: leadsCount },
        { count: closuresCount },
        { data: detalles },
        { data: recentOrders },
        { data: aliadoPedidos },
      ] = await Promise.all([
        supabase
          .from("pedidos")
          .select("total, estado")
          .gte("created_at", monthStart),
        supabase
          .from("pedidos")
          .select("estado, fuente"),
        supabase
          .from("comisiones_detalle")
          .select("monto_comision")
          .gte("created_at", monthStart),
        supabase
          .from("leads_meta_ads")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("pedidos")
          .select("*", { count: "exact", head: true })
          .eq("fuente", "meta_ads")
          .eq("numero_venta_cliente", 1),
        supabase
          .from("detalle_pedido")
          .select("cantidad, subtotal, productos(nombre)"),
        supabase
          .from("pedidos")
          .select("id, numero_pedido, estado, estado_pago, total, created_at, fue_editado, clientes(nombre_completo)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("pedidos")
          .select("fuente, total, aliado_id, aliados(nombre)")
          .in("fuente", ["referido_veterinario", "referido_entrenador"])
          .not("aliado_id", "is", null),
      ])

      const revenueThisMonth = (pedidosMes ?? [])
        .filter((p: { estado: string; total: number | null }) => p.estado !== "devolucion")
        .reduce((acc: number, p: { estado: string; total: number | null }) => acc + (p.total ?? 0), 0)

      const activeOrders = (allPedidos ?? [])
        .filter((p: { estado: string }) => !["despachado", "devolucion", "cambio"].includes(p.estado)).length

      const commissionThisMonth = (comisiones ?? [])
        .reduce((acc: number, c: { monto_comision: number | null }) => acc + (c.monto_comision ?? 0), 0)

      const estadoCounts: Record<string, number> = {}
      for (const p of allPedidos ?? []) {
        estadoCounts[p.estado] = (estadoCounts[p.estado] ?? 0) + 1
      }

      const fuenteCounts: Record<string, number> = {}
      for (const p of allPedidos ?? []) {
        if (p.fuente) fuenteCounts[p.fuente] = (fuenteCounts[p.fuente] ?? 0) + 1
      }

      type DetalleRow = { cantidad: number; subtotal: number; productos: { nombre: string } | null }
      const productMap: Record<string, { unidades: number; revenue: number }> = {}
      for (const d of (detalles as DetalleRow[] | null) ?? []) {
        const nombre = d.productos?.nombre ?? "Desconocido"
        if (!productMap[nombre]) productMap[nombre] = { unidades: 0, revenue: 0 }
        productMap[nombre].unidades += d.cantidad ?? 0
        productMap[nombre].revenue += d.subtotal ?? 0
      }
      const topProducts = Object.entries(productMap)
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Build aliado breakdown per fuente
      type AliadoPedidoRow = {
        fuente: string
        total: number
        aliado_id: string | null
        aliados: { nombre: string } | null
      }
      const aliadoBreakdowns: Record<string, AliadoBreakdown[]> = {}
      for (const p of (aliadoPedidos as AliadoPedidoRow[] | null) ?? []) {
        if (!p.aliado_id || !p.aliados) continue
        if (!aliadoBreakdowns[p.fuente]) aliadoBreakdowns[p.fuente] = []
        const existing = aliadoBreakdowns[p.fuente].find((a) => a.nombre === p.aliados!.nombre)
        if (existing) {
          existing.count++
          existing.total += p.total ?? 0
        } else {
          aliadoBreakdowns[p.fuente].push({ nombre: p.aliados.nombre, count: 1, total: p.total ?? 0 })
        }
      }

      setData({
        revenueThisMonth,
        activeOrders,
        commissionThisMonth,
        leadsCount: leadsCount ?? 0,
        closuresCount: closuresCount ?? 0,
        devolucionCount: estadoCounts["devolucion"] ?? 0,
        cambioCount: estadoCounts["cambio"] ?? 0,
        estadoCounts,
        topProducts,
        fuenteCounts,
        aliadoBreakdowns,
        recentOrders: (recentOrders as RecentOrder[]) ?? [],
      })
      setIsLoading(false)
    }
    load()
  }, [supabase])

  const closeRate =
    data && data.leadsCount > 0
      ? Math.round((data.closuresCount / data.leadsCount) * 100)
      : null

  const maxEstado = Math.max(...Object.values(data?.estadoCounts ?? {}), 1)
  const totalFuente = Object.values(data?.fuenteCounts ?? {}).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Ventas</h1>
          <p className="text-muted-foreground mt-1">Resumen de rendimiento y métricas de ventas.</p>
        </div>
        <Link href="/ventas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card className="border-none shadow-sm xl:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ventas este mes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold">
                  ${(data?.revenueThisMonth ?? 0).toLocaleString("es-CO")}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm xl:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos activos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold">{data?.activeOrders ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Sin despachar ni devolver</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm xl:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Comisión este mes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold">
                  ${(data?.commissionThisMonth ?? 0).toLocaleString("es-CO")}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm xl:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de cierre</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold">
                  {closeRate !== null ? `${closeRate}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.closuresCount ?? 0} cierres / {data?.leadsCount ?? 0} leads
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm xl:col-span-1 border-l-2 border-l-red-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Devoluciones</CardTitle>
                <RotateCcw className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-red-600">{data?.devolucionCount ?? 0}</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm xl:col-span-1 border-l-2 border-l-pink-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cambios</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-pink-400" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-pink-600">{data?.cambioCount ?? 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Status Funnel */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Estado de Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))
          ) : (
            estadoFunnelOrder.map((estado) => {
              const count = data?.estadoCounts[estado] ?? 0
              const pct = maxEstado > 0 ? Math.round((count / maxEstado) * 100) : 0
              return (
                <div key={estado} className="flex items-center gap-3">
                  <span className="text-sm w-32 shrink-0 text-right text-muted-foreground">
                    {estadoLabels[estado]}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Top Products + Fuente split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Top Productos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : (data?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin ventas registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.topProducts ?? []).map((p) => (
                    <TableRow key={p.nombre}>
                      <TableCell className="font-medium text-sm">{p.nombre}</TableCell>
                      <TableCell className="text-right text-sm">{p.unidades}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        ${p.revenue.toLocaleString("es-CO")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pedidos por Fuente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))
            ) : Object.keys(data?.fuenteCounts ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos.</p>
            ) : (
              Object.entries(data?.fuenteCounts ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([fuente, count]) => {
                  const hasBreakdown = (data?.aliadoBreakdowns[fuente]?.length ?? 0) > 0
                  return (
                    <div
                      key={fuente}
                      className={`flex items-center justify-between py-0.5 ${hasBreakdown ? "cursor-pointer rounded hover:bg-muted/50 px-1 -mx-1 transition-colors" : ""}`}
                      onClick={() => hasBreakdown && setAliadoDialogFuente(fuente)}
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fuenteColors[fuente] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {fuenteLabels[fuente] ?? fuente}
                        {hasBreakdown && <ChevronRight className="h-3 w-3 ml-1" />}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{count}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {totalFuente > 0 ? `${Math.round((count / totalFuente) * 100)}%` : "—"}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos Recientes</CardTitle>
          <Link href="/pedidos">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : (data?.recentOrders ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <ShoppingBag className="h-8 w-8 opacity-30" />
              <p className="text-sm">No hay pedidos recientes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]"># Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentOrders ?? []).map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="font-mono text-sm">
                      {p.numero_pedido}
                      {p.fue_editado && (
                        <Badge variant="destructive" className="ml-2 text-[10px] h-4">EDITADO</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.clientes?.nombre_completo ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {estadoLabels[p.estado] ?? p.estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.estado_pago === "confirmado" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {pagoLabels[p.estado_pago] ?? p.estado_pago}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${p.total.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/ventas/${p.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Aliado breakdown dialog (D4) */}
      <Dialog open={!!aliadoDialogFuente} onOpenChange={() => setAliadoDialogFuente(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              Desglose por Aliado — {fuenteLabels[aliadoDialogFuente ?? ""] ?? aliadoDialogFuente}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {(data?.aliadoBreakdowns[aliadoDialogFuente ?? ""] ?? [])
              .sort((a, b) => b.count - a.count)
              .map((aliado) => (
                <div key={aliado.nombre} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium text-sm">{aliado.nombre}</span>
                  <div className="flex items-center gap-4 text-sm text-right">
                    <span className="text-muted-foreground">{aliado.count} pedido{aliado.count !== 1 ? "s" : ""}</span>
                    <span className="font-semibold">${aliado.total.toLocaleString("es-CO")}</span>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
