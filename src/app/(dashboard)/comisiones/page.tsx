"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { createLiquidacion } from "@/lib/comisiones/createLiquidacion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import type { EstadoLiquidacion } from "@/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`
}

function getCurrentPeriodo(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getMonthOptions() {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const raw = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    opts.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) })
  }
  return opts
}

function getDateRange(periodo: string): { start: string; end: string } {
  const [year, month] = periodo.split("-").map(Number)
  const start = `${periodo}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return { start, end }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComisionRow {
  pedidoId: string
  numeroPedido: string
  estadoPago: string
  total: number
  clienteNombre: string
  comision: {
    numeroVentaCliente: number
    baseCalculo: number
    pctComision: number
    montoComision: number
    aplicaComision: boolean
    razonNoComision: string | null
  } | null
}

interface LeadsStats {
  totalLeads: number
  totalCierres: number
  pctCierre: number
}

interface VendedorOption {
  id: string
  full_name: string
}

interface LiquidacionRow {
  id: string
  periodo_mes: string
  pct_cierre_meta: number
  rango_cierre: string | null
  monto_total_comisiones: number
  estado: EstadoLiquidacion
  fecha_liquidacion: string | null
}

const liqEstadoColors: Record<EstadoLiquidacion, string> = {
  borrador: "bg-gray-100 text-gray-700",
  cerrado: "bg-blue-100 text-blue-700",
  pagado: "bg-green-100 text-green-700",
}

const liqEstadoLabels: Record<EstadoLiquidacion, string> = {
  borrador: "Borrador",
  cerrado: "Cerrado",
  pagado: "Pagado",
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[160px]" />
          <Skeleton className="h-5 w-[50px]" />
          <Skeleton className="h-5 w-[90px]" />
          <Skeleton className="h-5 w-[50px]" />
          <Skeleton className="h-5 w-[90px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComisionesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, role } = useAuth()
  const router = useRouter()

  const isAdminOrContable = role === "admin" || role === "contable"
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [vendedores, setVendedores] = useState<VendedorOption[]>([])
  const [selectedVendedor, setSelectedVendedor] = useState("")
  const [comisiones, setComisiones] = useState<ComisionRow[]>([])
  const [leadsStats, setLeadsStats] = useState<LeadsStats>({
    totalLeads: 0,
    totalCierres: 0,
    pctCierre: 0,
  })
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingLiq, setIsCreatingLiq] = useState(false)

  // ── Fetch vendedores list (admin/contable only) ───────────────────────────
  const fetchVendedores = useCallback(async () => {
    if (!isAdminOrContable || !user) return
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .in("role", ["vendedor", "admin"])
      .eq("is_active", true)
      .order("full_name")
    if (data && data.length > 0) {
      setVendedores(data)
      setSelectedVendedor((prev) => prev || data[0].id)
    }
  }, [supabase, isAdminOrContable, user])

  // ── Effective vendedor ID for queries ────────────────────────────────────
  const effectiveVendedorId = useMemo(() => {
    if (!user) return ""
    return isAdminOrContable ? selectedVendedor || user.id : user.id
  }, [user, isAdminOrContable, selectedVendedor])

  // ── Fetch commissions + leads stats ──────────────────────────────────────
  const fetchComisiones = useCallback(async () => {
    if (!effectiveVendedorId) return
    setIsLoading(true)
    const { start, end } = getDateRange(periodo)

    // Query pedidos with their nested comisiones_detalle
    const { data: pedidosData } = await supabase
      .from("pedidos")
      .select(
        `id, numero_pedido, estado_pago, total,
         clientes(nombre_completo),
         comisiones_detalle(
           numero_venta_cliente, base_calculo,
           pct_comision, monto_comision, aplica_comision, razon_no_comision
         )`
      )
      .eq("vendedor_id", effectiveVendedorId)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })

    const rows: ComisionRow[] = (pedidosData ?? []).map((p: any) => {
      const cd = p.comisiones_detalle?.[0]
      return {
        pedidoId: p.id,
        numeroPedido: p.numero_pedido,
        estadoPago: p.estado_pago,
        total: p.total,
        clienteNombre: p.clientes?.nombre_completo ?? "—",
        comision: cd
          ? {
              numeroVentaCliente: cd.numero_venta_cliente,
              baseCalculo: cd.base_calculo,
              pctComision: cd.pct_comision,
              montoComision: cd.monto_comision,
              aplicaComision: cd.aplica_comision,
              razonNoComision: cd.razon_no_comision,
            }
          : null,
      }
    })
    setComisiones(rows)

    // Leads + close rate
    const { data: leadsData } = await supabase
      .from("leads_meta_ads")
      .select("cantidad_leads")
      .eq("vendedor_id", effectiveVendedorId)
      .eq("periodo_mes", periodo)

    const totalLeads =
      leadsData?.reduce((sum: number, r: any) => sum + r.cantidad_leads, 0) ?? 0

    const { count: cierresCount } = await supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("vendedor_id", effectiveVendedorId)
      .eq("fuente", "meta_ads")
      .eq("numero_venta_cliente", 1)
      .gte("created_at", start)
      .lt("created_at", end)
      .neq("estado", "devolucion")

    const totalCierres = cierresCount ?? 0
    const pctCierre =
      totalLeads > 0
        ? Math.round((totalCierres / totalLeads) * 100 * 100) / 100
        : 0

    setLeadsStats({ totalLeads, totalCierres, pctCierre })

    // Recent liquidaciones (admin/contable)
    if (isAdminOrContable) {
      const { data: liqData } = await supabase
        .from("liquidaciones_comision")
        .select(
          "id, periodo_mes, pct_cierre_meta, rango_cierre, monto_total_comisiones, estado, fecha_liquidacion"
        )
        .eq("vendedor_id", effectiveVendedorId)
        .order("created_at", { ascending: false })
        .limit(5)
      setLiquidaciones((liqData ?? []) as LiquidacionRow[])
    }

    setIsLoading(false)
  }, [supabase, effectiveVendedorId, periodo, isAdminOrContable])

  useEffect(() => {
    fetchVendedores()
  }, [fetchVendedores])

  useEffect(() => {
    if (effectiveVendedorId) fetchComisiones()
  }, [fetchComisiones, effectiveVendedorId])

  // ── Computed stat totals ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const ganado = comisiones
      .filter((r) => r.comision?.aplicaComision && r.estadoPago === "confirmado")
      .reduce((sum, r) => sum + (r.comision?.montoComision ?? 0), 0)
    const bloqueado = comisiones
      .filter((r) => r.comision?.aplicaComision && r.estadoPago !== "confirmado")
      .reduce((sum, r) => sum + (r.comision?.montoComision ?? 0), 0)
    return { ganado, bloqueado }
  }, [comisiones])

  // ── Create liquidacion ────────────────────────────────────────────────────
  const handleCreateLiquidacion = async () => {
    if (!effectiveVendedorId) return
    setIsCreatingLiq(true)
    const result = await createLiquidacion(supabase, effectiveVendedorId, periodo)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Liquidación creada correctamente")
      router.push(`/comisiones/liquidacion/${result.liquidacionId}`)
    }
    setIsCreatingLiq(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground mt-1">
            Seguimiento de comisiones por ventas del período.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/comisiones/leads">
            <Button variant="outline" size="default" className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Leads
            </Button>
          </Link>
          {isAdminOrContable && (
            <Button
              onClick={handleCreateLiquidacion}
              disabled={isCreatingLiq || !effectiveVendedorId}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isCreatingLiq ? "Creando..." : "Crear Liquidación"}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v: string | null) => setPeriodo(v ?? periodo)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Seleccionar período...">
              {periodo ? (monthOptions.find((opt) => opt.value === periodo)?.label ?? periodo) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdminOrContable && vendedores.length > 0 && (
          <Select value={selectedVendedor} onValueChange={(v: string | null) => setSelectedVendedor(v ?? "")}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos los vendedores">
                {selectedVendedor
                  ? (vendedores.find((v) => v.id === selectedVendedor)?.full_name ?? selectedVendedor)
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ganado este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-green-600">
                  {formatCOP(stats.ganado)}
                </span>
                <DollarSign className="h-8 w-8 text-green-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Solo pedidos con pago confirmado
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bloqueado (pago pendiente)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-amber-600">
                  {formatCOP(stats.bloqueado)}
                </span>
                <Clock className="h-8 w-8 text-amber-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Se libera al confirmar el pago del cliente
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                % Cierre Meta Ads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading">
                  {leadsStats.pctCierre.toFixed(1)}%
                </span>
                <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {leadsStats.totalCierres} cierres / {leadsStats.totalLeads} leads
                {leadsStats.totalLeads === 0 && " · Sin leads registrados"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commissions table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : comisiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <DollarSign className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Sin pedidos en este período</p>
              <p className="text-sm">Selecciona otro mes o registra nuevas ventas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]"># Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center w-[80px]">Venta #</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-center w-[60px]">%</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead className="w-[100px]">Pago</TableHead>
                  <TableHead>Estado comisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comisiones.map((row) => (
                  <TableRow key={row.pedidoId} className="group">
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/ventas/${row.pedidoId}`}
                        className="hover:underline text-primary"
                      >
                        {row.numeroPedido}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.clienteNombre}</TableCell>
                    <TableCell className="text-center">
                      {row.comision ? (
                        <span className="text-sm font-medium">
                          #{row.comision.numeroVentaCliente}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.comision ? formatCOP(row.comision.baseCalculo) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.comision ? (
                        <span className="text-sm font-medium">
                          {row.comision.pctComision}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {row.comision ? (
                        row.comision.aplicaComision ? (
                          <span
                            className={
                              row.estadoPago === "confirmado"
                                ? "text-green-600"
                                : "text-amber-600"
                            }
                          >
                            {formatCOP(row.comision.montoComision)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">$0</span>
                        )
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.estadoPago === "confirmado" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {row.estadoPago === "confirmado" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.comision ? (
                        row.comision.aplicaComision ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Comisiona
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 max-w-[200px] truncate"
                            title={row.comision.razonNoComision ?? ""}
                          >
                            {row.comision.razonNoComision ?? "No aplica"}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Sin registro
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent liquidaciones (admin/contable only) */}
      {isAdminOrContable && !isLoading && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-heading">Liquidaciones recientes</h2>
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {liquidaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <FileText className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No hay liquidaciones para este vendedor.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-center">% Cierre</TableHead>
                      <TableHead>Rango</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidaciones.map((liq) => (
                      <TableRow key={liq.id} className="group">
                        <TableCell className="font-mono text-sm">
                          {liq.periodo_mes}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {liq.pct_cierre_meta}%
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {liq.rango_cierre ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCOP(liq.monto_total_comisiones)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${liqEstadoColors[liq.estado]}`}
                          >
                            {liqEstadoLabels[liq.estado]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/comisiones/liquidacion/${liq.id}`}>
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
        </div>
      )}
    </div>
  )
}
