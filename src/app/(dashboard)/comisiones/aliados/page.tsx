"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Users, ChevronDown, DollarSign, Clock, CheckCircle2,
} from "lucide-react"

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`

const TIPO_ALIADO: Record<string, string> = {
  veterinario: "Veterinario",
  entrenador_canino: "Entrenador",
  otro: "Otro",
}

const TIPO_COMISION: Record<string, string> = {
  primera_compra: "1ª compra",
  recompra: "Recompra",
}

interface ComisionAliado {
  id: string
  tipo: string
  base_calculo: number
  porcentaje: number
  monto: number
  estado: string
  created_at: string
  pedidos: { numero_pedido: string; created_at: string } | null
}

interface AliadoReferido {
  id: string
  periodo_activo: boolean
  fecha_inicio_comision: string | null
  fecha_fin_comision: string | null
  clientes: { id: string; nombre_completo: string; codigo_cliente: string } | null
  comisiones_aliado: ComisionAliado[]
}

interface AliadoRow {
  id: string
  nombre: string
  tipo: string
  celular: string | null
  correo: string | null
  aliados_referidos: AliadoReferido[]
}

function sumComisiones(refs: AliadoReferido[], estado?: string) {
  return refs.flatMap((r) => r.comisiones_aliado)
    .filter((c) => !estado || c.estado === estado)
    .reduce((s, c) => s + Number(c.monto), 0)
}

function countActiveClients(refs: AliadoReferido[]) {
  return refs.filter((r) => r.periodo_activo).length
}

export default function AliadosPage() {
  const { role } = useAuth()
  const isAdminOrContable = role === "admin" || role === "contable"

  const [aliados, setAliados] = useState<AliadoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchAliados = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/comisiones/aliados/reporte")
      if (res.ok) {
        const data = await res.json()
        setAliados(data.aliados ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdminOrContable) fetchAliados()
  }, [fetchAliados, isAdminOrContable])

  // Summary KPIs
  const totalPendiente = useMemo(
    () => aliados.reduce((s, a) => s + sumComisiones(a.aliados_referidos, "pendiente"), 0),
    [aliados]
  )
  const totalLiquidada = useMemo(
    () => aliados.reduce((s, a) => s + sumComisiones(a.aliados_referidos, "liquidada"), 0),
    [aliados]
  )
  const totalActivos = useMemo(
    () => aliados.reduce((s, a) => s + countActiveClients(a.aliados_referidos), 0),
    [aliados]
  )

  if (!isAdminOrContable) {
    return (
      <div className="max-w-[1440px] mx-auto flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
        <p>Acceso restringido a admin y contable.</p>
        <Link href="/comisiones"><Button variant="outline">Volver</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/comisiones">
            <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Comisiones de Aliados</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Veterinarios y entrenadores que refirieron clientes — ventana de 6 meses por cliente.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes en ventana activa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading">{totalActivos}</span>
                <Users className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de liquidar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-amber-600">{formatCOP(totalPendiente)}</span>
                <Clock className="h-8 w-8 text-amber-400/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total liquidado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold font-heading text-emerald-600">{formatCOP(totalLiquidada)}</span>
                <CheckCircle2 className="h-8 w-8 text-emerald-400/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aliados Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : aliados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay aliados registrados.</p>
              <p className="text-xs text-muted-foreground">Los aliados se crean al registrar pedidos con fuente "referido_veterinario" o "referido_entrenador" y un aliado_id asignado.</p>
            </div>
          ) : (
            <div className="divide-y">
              {aliados.map((aliado) => {
                const pendiente = sumComisiones(aliado.aliados_referidos, "pendiente")
                const liquidada = sumComisiones(aliado.aliados_referidos, "liquidada")
                const activos = countActiveClients(aliado.aliados_referidos)
                const isExpanded = expandedId === aliado.id

                return (
                  <div key={aliado.id}>
                    <button
                      type="button"
                      className="w-full"
                      onClick={() => setExpandedId(isExpanded ? null : aliado.id)}
                    >
                      <div className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors text-left">
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
                          <div className="col-span-2 sm:col-span-1">
                            <p className="font-medium text-sm">{aliado.nombre}</p>
                            <p className="text-xs text-muted-foreground">{TIPO_ALIADO[aliado.tipo] ?? aliado.tipo}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Clientes activos</p>
                            <p className="font-semibold tabular-nums">{activos}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total referidos</p>
                            <p className="font-semibold tabular-nums">{aliado.aliados_referidos.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                            <p className="font-semibold tabular-nums text-amber-700">{formatCOP(pendiente)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Liquidado</p>
                            <p className="font-semibold tabular-nums text-emerald-700">{formatCOP(liquidada)}</p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-muted/20">
                        {aliado.aliados_referidos.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3 pl-8">Sin clientes referidos.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs pl-8">Cliente</TableHead>
                                <TableHead className="text-xs">Ventana</TableHead>
                                <TableHead className="text-xs text-center">Estado</TableHead>
                                <TableHead className="text-xs">Pedido</TableHead>
                                <TableHead className="text-xs">Tipo</TableHead>
                                <TableHead className="text-xs text-right">Base</TableHead>
                                <TableHead className="text-xs text-center">%</TableHead>
                                <TableHead className="text-xs text-right">Monto</TableHead>
                                <TableHead className="text-xs text-center">Estado pago</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {aliado.aliados_referidos.map((ref) =>
                                ref.comisiones_aliado.length === 0 ? (
                                  <TableRow key={ref.id}>
                                    <TableCell className="pl-8 text-xs text-muted-foreground" colSpan={9}>
                                      {ref.clientes?.nombre_completo ?? "—"} — Sin comisiones generadas aún
                                      {ref.periodo_activo && (
                                        <span className="ml-2 text-emerald-600">(ventana activa hasta {ref.fecha_fin_comision})</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  ref.comisiones_aliado.map((com, ci) => (
                                    <TableRow key={com.id} className="text-xs">
                                      {ci === 0 && (
                                        <TableCell className="pl-8 align-top" rowSpan={ref.comisiones_aliado.length}>
                                          <p className="font-medium">{ref.clientes?.nombre_completo ?? "—"}</p>
                                          <p className="text-muted-foreground text-[10px]">{ref.clientes?.codigo_cliente}</p>
                                        </TableCell>
                                      )}
                                      {ci === 0 && (
                                        <TableCell className="align-top" rowSpan={ref.comisiones_aliado.length}>
                                          <div className="space-y-0.5">
                                            {ref.fecha_inicio_comision && (
                                              <p className="text-[10px] text-muted-foreground">
                                                {ref.fecha_inicio_comision} → {ref.fecha_fin_comision}
                                              </p>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      {ci === 0 && (
                                        <TableCell className="text-center align-top" rowSpan={ref.comisiones_aliado.length}>
                                          <Badge
                                            variant="outline"
                                            className={`text-[10px] h-5 ${ref.periodo_activo ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"}`}
                                          >
                                            {ref.periodo_activo ? "Activa" : "Expirada"}
                                          </Badge>
                                        </TableCell>
                                      )}
                                      <TableCell className="font-mono text-[10px]">
                                        {com.pedidos?.numero_pedido ?? "—"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                          {TIPO_COMISION[com.tipo] ?? com.tipo}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums">{formatCOP(com.base_calculo)}</TableCell>
                                      <TableCell className="text-center font-medium">{com.porcentaje}%</TableCell>
                                      <TableCell className="text-right font-semibold tabular-nums text-amber-700">{formatCOP(com.monto)}</TableCell>
                                      <TableCell className="text-center">
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] h-5 ${com.estado === "liquidada" ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}`}
                                        >
                                          {com.estado === "liquidada" ? "Liquidada" : "Pendiente"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )
                              )}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Las comisiones de aliados se calculan automáticamente cuando un pedido con aliado asignado pasa a estado <strong>Despachado</strong>. La liquidación se gestiona externamente por contabilidad.
      </p>
    </div>
  )
}
