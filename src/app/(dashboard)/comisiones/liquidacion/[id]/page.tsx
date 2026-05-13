"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, DollarSign, Lock, Check } from "lucide-react"
import { toast } from "sonner"
import type { EstadoLiquidacion } from "@/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`
}

const estadoColors: Record<EstadoLiquidacion, string> = {
  borrador: "bg-gray-100 text-gray-700",
  cerrado: "bg-blue-100 text-blue-700",
  pagado: "bg-green-100 text-green-700",
}

const estadoLabels: Record<EstadoLiquidacion, string> = {
  borrador: "Borrador",
  cerrado: "Cerrado",
  pagado: "Pagado",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Liquidacion {
  id: string
  periodo_mes: string
  total_leads_meta: number
  total_cierres_meta: number
  pct_cierre_meta: number
  rango_cierre: string | null
  monto_total_comisiones: number
  estado: EstadoLiquidacion
  fecha_liquidacion: string | null
  created_at: string
  users: { full_name: string } | null
}

interface ComisionDetalleRow {
  id: string
  pedido_id: string
  numero_venta_cliente: number
  base_calculo: number
  pct_comision: number
  monto_comision: number
  aplica_comision: boolean
  razon_no_comision: string | null
  pedidos: {
    numero_pedido: string
    estado_pago: string
    total: number
    clientes: { nombre_completo: string } | null
  } | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiquidacionDetailPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, role } = useAuth()
  const params = useParams()
  const liquidacionId = params?.id as string

  const isAdminOrContable = role === "admin" || role === "contable"

  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null)
  const [comisiones, setComisiones] = useState<ComisionDetalleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchData = useCallback(async () => {
    if (!liquidacionId || !user) return
    setIsLoading(true)

    const [{ data: liq, error: liqErr }, { data: coms }] = await Promise.all([
      supabase
        .from("liquidaciones_comision")
        .select("*, users!liquidaciones_comision_vendedor_id_fkey(full_name)")
        .eq("id", liquidacionId)
        .single(),
      supabase
        .from("comisiones_detalle")
        .select(
          `id, pedido_id, numero_venta_cliente, base_calculo,
           pct_comision, monto_comision, aplica_comision, razon_no_comision,
           pedidos(
             numero_pedido, estado_pago, total,
             clientes(nombre_completo)
           )`
        )
        .eq("liquidacion_id", liquidacionId)
        .order("created_at", { ascending: false }),
    ])

    if (liqErr || !liq) {
      setNotFound(true)
    } else {
      setLiquidacion(liq as Liquidacion)
      setComisiones((coms ?? []) as ComisionDetalleRow[])
    }
    setIsLoading(false)
  }, [supabase, liquidacionId, user])

  useEffect(() => {
    if (user) fetchData()
  }, [fetchData, user])

  const handleUpdateEstado = async (nuevoEstado: EstadoLiquidacion) => {
    setIsUpdating(true)
    const updates: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === "pagado") {
      updates.fecha_liquidacion = new Date().toISOString()
    }

    const { error } = await supabase
      .from("liquidaciones_comision")
      .update(updates)
      .eq("id", liquidacionId)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success(
        `Liquidación marcada como ${estadoLabels[nuevoEstado].toLowerCase()}`
      )
      fetchData()
    }
    setIsUpdating(false)
  }

  // ─── Computed summary stats ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalConfirmado = comisiones
      .filter((r) => r.aplica_comision && r.pedidos?.estado_pago === "confirmado")
      .reduce((sum, r) => sum + Number(r.monto_comision), 0)
    const totalPendiente = comisiones
      .filter((r) => r.aplica_comision && r.pedidos?.estado_pago !== "confirmado")
      .reduce((sum, r) => sum + Number(r.monto_comision), 0)
    return { totalConfirmado, totalPendiente }
  }, [comisiones])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />

  if (notFound) {
    return (
      <div className="max-w-[1440px] mx-auto flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
        <p className="text-lg font-medium">Liquidación no encontrada.</p>
        <Link href="/comisiones">
          <Button variant="outline">Volver a Comisiones</Button>
        </Link>
      </div>
    )
  }

  if (!liquidacion) return null

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Link href="/comisiones">
            <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold font-heading tracking-tight">
                Liquidación {liquidacion.periodo_mes}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${estadoColors[liquidacion.estado]}`}
              >
                {estadoLabels[liquidacion.estado]}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {liquidacion.users?.full_name ?? "—"} ·{" "}
              Creada el{" "}
              {new Date(liquidacion.created_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* State transition buttons (admin/contable only) */}
        {isAdminOrContable && (
          <div className="flex items-center gap-2 shrink-0">
            {liquidacion.estado === "borrador" && (
              <Button
                variant="outline"
                onClick={() => handleUpdateEstado("cerrado")}
                disabled={isUpdating}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Cerrar liquidación
              </Button>
            )}
            {liquidacion.estado === "cerrado" && (
              <Button
                onClick={() => handleUpdateEstado("pagado")}
                disabled={isUpdating}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Marcar como pagada
              </Button>
            )}
            {liquidacion.estado === "pagado" && liquidacion.fecha_liquidacion && (
              <p className="text-sm text-muted-foreground">
                Pagada el{" "}
                {new Date(liquidacion.fecha_liquidacion).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total Leads",
            value: liquidacion.total_leads_meta.toString(),
          },
          {
            label: "Cierres Meta Ads",
            value: liquidacion.total_cierres_meta.toString(),
          },
          {
            label: "% Cierre",
            value: `${liquidacion.pct_cierre_meta}%`,
          },
          {
            label: "Rango aplicado",
            value: liquidacion.rango_cierre ?? "—",
          },
          {
            label: "Total comisión",
            value: formatCOP(liquidacion.monto_total_comisiones),
            highlight: true,
          },
          {
            label: "Fecha de pago",
            value: liquidacion.fecha_liquidacion
              ? new Date(liquidacion.fecha_liquidacion).toLocaleDateString(
                  "es-CO",
                  { day: "numeric", month: "short" }
                )
              : "Pendiente",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <span
                className={`text-xl font-bold font-heading leading-none ${
                  stat.highlight ? "text-green-600" : ""
                }`}
              >
                {stat.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earned vs blocked summary */}
      {comisiones.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            Confirmado:{" "}
            <span className="font-semibold text-green-600">
              {formatCOP(summary.totalConfirmado)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Bloqueado (pago pendiente):{" "}
            <span className="font-semibold text-amber-600">
              {formatCOP(summary.totalPendiente)}
            </span>
          </div>
        </div>
      )}

      {/* Commission detail table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {comisiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <DollarSign className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                No hay comisiones vinculadas a esta liquidación.
              </p>
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
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comisiones.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/ventas/${row.pedido_id}`}
                        className="hover:underline text-primary"
                      >
                        {row.pedidos?.numero_pedido ?? row.pedido_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.pedidos?.clientes?.nombre_completo ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      #{row.numero_venta_cliente}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCOP(Number(row.base_calculo))}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {row.pct_comision}%
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {row.aplica_comision ? (
                        <span
                          className={
                            row.pedidos?.estado_pago === "confirmado"
                              ? "text-green-600"
                              : "text-amber-600"
                          }
                        >
                          {formatCOP(Number(row.monto_comision))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">$0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.pedidos?.estado_pago === "confirmado"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {row.pedidos?.estado_pago === "confirmado"
                          ? "Pagado"
                          : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.aplica_comision ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Comisiona
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 max-w-[180px] truncate"
                          title={row.razon_no_comision ?? ""}
                        >
                          {row.razon_no_comision ?? "No aplica"}
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
    </div>
  )
}
