"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Check, X } from "lucide-react"
import type { OrigenDonacion } from "@/types"
import { ORIGEN_DONACION_LABELS } from "@/lib/constants/labels"
import { AprobarDonacionDialog } from "./AprobarDonacionDialog"
import { RechazarDonacionDialog } from "./RechazarDonacionDialog"
import { DONACION_SELECT, formatCOP, type PendienteRow } from "./utils"

interface Props {
  onCountChange?: (count: number) => void
}

export function AprobacionesDonacionPanel({ onCountChange }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PendienteRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [aprobarId, setAprobarId] = useState<string | null>(null)
  const [rechazarId, setRechazarId] = useState<string | null>(null)

  const fetchPendientes = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("donaciones")
      .select(DONACION_SELECT)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("No se pudieron cargar las donaciones pendientes")
      console.error(error)
    } else {
      const pendientes = (data ?? []) as unknown as PendienteRow[]
      setRows(pendientes)
      onCountChange?.(pendientes.length)
    }
    setIsLoading(false)
  }, [supabase, onCountChange])

  useEffect(() => { void fetchPendientes() }, [fetchPendientes])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <CheckCircle2 className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Sin donaciones pendientes</p>
          <p className="text-sm">Todas las donaciones registradas ya fueron revisadas.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((d) => {
        const esPedido = d.origen === ("pedido" as OrigenDonacion)
        const lote = d.producto_lotes
        return (
          <Card key={d.id} className="border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {d.destinatario}
                    <Badge variant="outline" className="font-normal text-[10px] h-5">
                      {ORIGEN_DONACION_LABELS[d.origen]}
                    </Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Registrada por {d.users?.full_name ?? "—"} ·{" "}
                    {new Date(d.created_at).toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valor comercial</p>
                  <p className="font-semibold tabular-nums">{formatCOP(Number(d.valor_comercial))}</p>
                </div>
              </div>

              <p className="text-sm">
                <span className="text-muted-foreground">Motivo:</span> {d.motivo}
              </p>

              <div className="rounded-md border overflow-x-auto">
                {esPedido ? (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">
                          Pedido {d.pedidos?.numero_pedido ?? "—"}
                          {d.pedidos?.clientes?.nombre_completo && (
                            <span className="text-muted-foreground font-normal">
                              {" "}— {d.pedidos.clientes.nombre_completo}
                            </span>
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                        <th className="px-3 py-2 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.pedidos?.detalle_pedido ?? []).map((l, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{l.nombre_snapshot}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{l.cantidad}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCOP(Number(l.subtotal))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Producto</th>
                        <th className="px-3 py-2 font-medium">Lote</th>
                        <th className="px-3 py-2 font-medium text-right">Unidades a donar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2">
                          {lote?.productos?.nombre ?? "—"}
                          {lote?.producto_variantes?.presentacion && (
                            <span className="text-muted-foreground">
                              {" "}— {lote.producto_variantes.presentacion}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{lote?.codigo_lote ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {Number(d.cantidad ?? 0).toLocaleString("es-CO")}
                          <span className="text-muted-foreground font-normal">
                            {" "}/ {Number(lote?.cantidad_disponible ?? 0).toLocaleString("es-CO")} disp.
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {esPedido
                  ? "Al aprobar, el pedido pasa a confirmado y aparece en el tablero de logística."
                  : "Al aprobar, se descuenta el lote y queda el movimiento de donación en su historial."}
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setRechazarId(d.id)}
                >
                  <X className="h-4 w-4" />Rechazar
                </Button>
                <Button className="gap-1.5" onClick={() => setAprobarId(d.id)}>
                  <Check className="h-4 w-4" />Aprobar
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <AprobarDonacionDialog
        donacionId={aprobarId}
        onOpenChange={(open) => { if (!open) setAprobarId(null) }}
        onDone={() => void fetchPendientes()}
      />
      <RechazarDonacionDialog
        donacionId={rechazarId}
        onOpenChange={(open) => { if (!open) setRechazarId(null) }}
        onDone={() => void fetchPendientes()}
      />
    </div>
  )
}
