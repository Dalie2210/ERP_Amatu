"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DollarSign, Clock, TrendingUp, FileText, ChevronRight, BarChart3, Plus,
} from "lucide-react"
import Link from "next/link"
import { CloseRateMeter } from "@/components/comisiones/CloseRateMeter"
import { InlineLeadsForm } from "@/components/comisiones/InlineLeadsForm"
import { ComisionesTable } from "@/components/comisiones/ComisionesTable"
import { LiquidacionPreviewDialog } from "@/components/comisiones/LiquidacionPreviewDialog"
import type { EstadoLiquidacion } from "@/types"

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`

function getCurrentPeriodo() {
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

const LIQ_ESTADO_COLORS: Record<EstadoLiquidacion, string> = {
  borrador: "bg-slate-100 text-slate-700",
  cerrado: "bg-blue-100 text-blue-700",
  pagado: "bg-emerald-100 text-emerald-700",
}
const LIQ_ESTADO_LABELS: Record<EstadoLiquidacion, string> = {
  borrador: "Borrador", cerrado: "Cerrado", pagado: "Pagado",
}

export default function ComisionesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, role } = useAuth()
  const isAdminOrContable = role === "admin" || role === "contable"
  const isVendedor = role === "vendedor"
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [vendedores, setVendedores] = useState<{ id: string; full_name: string }[]>([])
  const [selectedVendedor, setSelectedVendedor] = useState("")
  const [previewData, setPreviewData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const [showLeadsForm, setShowLeadsForm] = useState(() => searchParams?.get("openLeads") === "true")
  const [showLiqDialog, setShowLiqDialog] = useState(false)

  const effectiveVendedorId = useMemo(() => {
    if (!user) return ""
    return isAdminOrContable ? selectedVendedor || user.id : user.id
  }, [user, isAdminOrContable, selectedVendedor])

  // Fetch vendedores list for admin/contable selector
  useEffect(() => {
    if (!isAdminOrContable || !user) return
    supabase
      .from("users")
      .select("id, full_name")
      .in("role", ["vendedor", "admin"])
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }: { data: { id: string; full_name: string }[] | null }) => {
        if (data?.length) {
          setVendedores(data)
          setSelectedVendedor((prev) => prev || data[0].id)
        }
      })
  }, [supabase, isAdminOrContable, user])

  const fetchPreview = useCallback(async () => {
    if (!effectiveVendedorId || !periodo) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ periodo })
      if (isAdminOrContable) params.set("vendedor_id", effectiveVendedorId)
      const res = await fetch(`/api/comisiones/preview?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewData(data)
      }
    } finally {
      setIsLoading(false)
    }
  }, [effectiveVendedorId, periodo, isAdminOrContable])

  useEffect(() => {
    if (effectiveVendedorId) fetchPreview()
  }, [fetchPreview, effectiveVendedorId])

  const cierre = previewData?.cierre
  const comisiones = previewData?.comisiones ?? []
  const liquidaciones = previewData?.liquidaciones ?? []
  const montoGanado = previewData?.montoGanado ?? 0
  const montoBloqueado = previewData?.montoBloqueado ?? 0

  const vendedorActual = vendedores.find((v) => v.id === effectiveVendedorId)
  const vendedorNombre = vendedorActual?.full_name ?? user?.email ?? "—"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Seguimiento en tiempo real — los montos se actualizan con cada cierre registrado.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(isVendedor || isAdminOrContable) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowLeadsForm((p) => !p)}
            >
              <Plus className="h-4 w-4" />
              {showLeadsForm ? "Ocultar leads" : "Registrar leads"}
            </Button>
          )}
          {isAdminOrContable && (
            <>
              <Link href="/comisiones/aliados">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Aliados
                </Button>
              </Link>
              <Button
                size="sm"
                className="gap-2"
                disabled={!effectiveVendedorId || isLoading}
                onClick={() => setShowLiqDialog(true)}
              >
                <FileText className="h-4 w-4" />
                Crear Liquidación
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <Select value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue>{monthOptions.find((o) => o.value === periodo)?.label ?? periodo}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdminOrContable && vendedores.length > 0 && (
          <Select value={selectedVendedor} onValueChange={(v) => v && setSelectedVendedor(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue>{vendedorNombre}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Inline leads form (collapsible) ── */}
      {showLeadsForm && effectiveVendedorId && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Registrar Leads Meta Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <InlineLeadsForm
              vendedorId={effectiveVendedorId}
              periodoMes={periodo}
              onSaved={fetchPreview}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Close Rate Meter ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tasa de Cierre Meta Ads — {periodo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !cierre ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : (
            <CloseRateMeter
              totalLeads={cierre.total_leads}
              totalCierres={cierre.total_cierres}
              pctCierre={Number(cierre.pct_cierre)}
              rangoLabel={cierre.rango_label}
            />
          )}
        </CardContent>
      </Card>

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ganado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-emerald-600">{formatCOP(montoGanado)}</span>
                <DollarSign className="h-8 w-8 text-emerald-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pedidos con pago confirmado</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-amber-600">{formatCOP(montoBloqueado)}</span>
                <Clock className="h-8 w-8 text-amber-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Se libera al confirmar pago</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Provisional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-slate-600">{formatCOP(montoGanado + montoBloqueado)}</span>
                <TrendingUp className="h-8 w-8 text-slate-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Se confirma al liquidar</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Commission Table ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Detalle por pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <ComisionesTable comisiones={comisiones} />
          )}
        </CardContent>
      </Card>

      {/* ── Liquidaciones (admin/contable) ── */}
      {isAdminOrContable && !isLoading && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Liquidaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {liquidaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground gap-2 p-6">
                <FileText className="h-7 w-7 opacity-30" />
                <p className="text-sm">No hay liquidaciones registradas para este vendedor.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Período</TableHead>
                    <TableHead className="text-xs text-center">% Cierre</TableHead>
                    <TableHead className="text-xs">Rango</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidaciones.map((liq: any) => (
                    <TableRow key={liq.id} className="group text-sm">
                      <TableCell className="font-mono text-xs">{liq.periodo_mes}</TableCell>
                      <TableCell className="text-center font-medium">{Number(liq.pct_cierre_meta).toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{liq.rango_cierre ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{formatCOP(liq.monto_total_comisiones)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${LIQ_ESTADO_COLORS[liq.estado as EstadoLiquidacion]}`}>
                          {LIQ_ESTADO_LABELS[liq.estado as EstadoLiquidacion]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/comisiones/liquidacion/${liq.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 gap-1  text-xs">
                            Ver <ChevronRight className="h-3.5 w-3.5" />
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
      )}

      {/* ── Liquidation Preview Dialog ── */}
      {effectiveVendedorId && previewData && (
        <LiquidacionPreviewDialog
          open={showLiqDialog}
          onOpenChange={setShowLiqDialog}
          vendedorId={effectiveVendedorId}
          vendedorNombre={vendedorNombre}
          periodoMes={periodo}
          preview={previewData}
        />
      )}
    </div>
  )
}
