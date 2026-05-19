"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ExternalLink, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const formatCOP = (n: number) => `$${Number(n).toLocaleString("es-CO")}`

type FilterTab = "all" | "con" | "sin"

interface ComisionRow {
  id: string
  pedido_id: string
  numero_venta_cliente: number
  base_calculo: number
  pct_comision: number
  monto_comision: number
  aplica_comision: boolean
  razon_no_comision: string | null
  is_provisional: boolean
  liquidacion_id: string | null
  pedidos: {
    numero_pedido: string
    fuente: string
    estado_pago: string
    clientes: { nombre_completo: string } | null
  } | null
}

const FUENTE_LABEL: Record<string, string> = {
  meta_ads: "Meta Ads",
  referido_cliente: "Ref. Cliente",
  referido_veterinario: "Ref. Vet",
  referido_entrenador: "Ref. Entrenador",
  distribuidor: "Distribuidor",
  otro: "Otro",
}

interface ComisionesTableProps {
  comisiones: ComisionRow[]
}

export function ComisionesTable({ comisiones }: ComisionesTableProps) {
  const [tab, setTab] = useState<FilterTab>("all")

  const filtered = comisiones.filter((c) => {
    if (tab === "con") return c.aplica_comision
    if (tab === "sin") return !c.aplica_comision
    return true
  })

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: comisiones.length },
    { id: "con", label: "Con comisión", count: comisiones.filter((c) => c.aplica_comision).length },
    { id: "sin", label: "Sin comisión", count: comisiones.filter((c) => !c.aplica_comision).length },
  ]

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.id)}
            className="h-7 text-xs gap-1.5"
          >
            {t.label}
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold",
              tab === t.id ? "bg-white/20" : "bg-muted"
            )}>
              {t.count}
            </span>
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Pedido</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs text-center">Venta #</TableHead>
              <TableHead className="text-xs">Fuente</TableHead>
              <TableHead className="text-xs text-right">Base</TableHead>
              <TableHead className="text-xs text-right">%</TableHead>
              <TableHead className="text-xs text-right">Comisión</TableHead>
              <TableHead className="text-xs text-center">Pago</TableHead>
              <TableHead className="text-xs text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  No hay órdenes en este período
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const pedido = c.pedidos
                const isConfirmed = pedido?.estado_pago === "confirmado"
                return (
                  <TableRow
                    key={c.id}
                    className={cn(
                      "text-sm",
                      c.aplica_comision && isConfirmed && "bg-emerald-50/50",
                      c.aplica_comision && !isConfirmed && "bg-amber-50/50",
                      !c.aplica_comision && "opacity-60"
                    )}
                  >
                    <TableCell className="font-mono text-xs">
                      <a
                        href={`/ventas/${c.pedido_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:underline text-primary"
                      >
                        {pedido?.numero_pedido ?? "—"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">
                      {pedido?.clientes?.nombre_completo ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] h-5">{c.numero_venta_cliente}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {FUENTE_LABEL[pedido?.fuente ?? ""] ?? pedido?.fuente ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatCOP(c.base_calculo)}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">
                      {c.aplica_comision ? `${c.pct_comision}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {c.aplica_comision ? (
                        <span className={isConfirmed ? "text-emerald-700" : "text-amber-700"}>
                          {formatCOP(c.monto_comision)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{c.razon_no_comision ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isConfirmed ? "default" : "outline"}
                        className={cn("text-[10px] h-5", isConfirmed ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "border-amber-200 text-amber-700")}
                      >
                        {isConfirmed ? "Confirmado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.is_provisional ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <AlertCircle className="h-3 w-3 text-amber-400" />
                          Provisional
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 text-emerald-700 border-emerald-200">
                          Liquidado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
