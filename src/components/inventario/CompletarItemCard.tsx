"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/useDebounce"
import type { OrdenProduccionItemExpanded, PreviewConsumoProduccion } from "@/types"

interface Props {
  item: OrdenProduccionItemExpanded
  /** La orden ya está cerrada (completada/cancelada): forzar solo lectura. */
  bloqueado?: boolean
  /** Se llama tras completar/cerrar el ítem para refrescar datos. */
  onDone: () => void
  /** Se llama con el resultado antes de refrescar (para registrar historial). */
  onCompleted?: (info: { cantidad: number; parcial: boolean }) => void
}

/**
 * Tarjeta para completar un producto terminado de una orden de producción:
 * cantidad realmente producida + preview FEFO del consumo + confirmación.
 * Reutilizada por el detalle de la orden y por el sheet de completar.
 */
export function CompletarItemCard({ item, bloqueado, onDone, onCompleted }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const yaCompletado = !!bloqueado || item.estado === "completada" || item.estado === "parcial"
  const [cantidad, setCantidad] = useState(String(item.cantidad_planificada))
  const [motivo, setMotivo] = useState("")
  const [preview, setPreview] = useState<PreviewConsumoProduccion[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const debouncedCantidad = useDebounce(cantidad, 400)

  const fetchPreview = useCallback(async () => {
    if (yaCompletado) return
    const cant = parseFloat(debouncedCantidad)
    if (isNaN(cant) || cant <= 0) { setPreview([]); return }

    setLoadingPreview(true)
    const { data, error: rpcError } = await supabase.rpc("fn_preview_consumo_item", {
      p_item_id: item.id,
      p_cantidad_producida: cant,
    })
    setLoadingPreview(false)
    if (rpcError) { setError(rpcError.message); setPreview([]); return }
    setError(null)
    setPreview(data ?? [])
  }, [item.id, debouncedCantidad, supabase, yaCompletado])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  const hayFaltantes = preview.some((p) => !p.suficiente)
  const costoTotal = preview.reduce((sum, p) => sum + p.cantidad_a_consumir * p.costo_unitario, 0)

  const titulo = `${item.producto?.nombre ?? "—"} — ${item.variante?.presentacion ?? "Todas"}`

  const cantidadNum = parseFloat(cantidad)
  const esProduccionParcial = !isNaN(cantidadNum) && cantidadNum > 0 && cantidadNum < item.cantidad_planificada
  const motivoFaltante = esProduccionParcial && motivo.trim() === ""

  async function handleConfirmar() {
    const cant = parseFloat(cantidad)
    if (isNaN(cant) || cant <= 0) { setError("La cantidad debe ser mayor a cero."); return }
    if (hayFaltantes) { setError("No hay stock suficiente de uno o más insumos."); return }
    if (cant < item.cantidad_planificada && motivo.trim() === "") {
      setError("Indica el motivo por el cual se produjo menos de lo planificado.")
      return
    }

    setConfirming(true)
    const { error: rpcError } = await supabase.rpc("fn_completar_item_produccion", {
      p_item_id: item.id,
      p_cantidad_producida: cant,
      p_motivo: cant < item.cantidad_planificada ? motivo.trim() : null,
    })
    setConfirming(false)
    if (rpcError) { setError(rpcError.message); return }

    const parcial = cant < item.cantidad_planificada
    toast.success(
      parcial
        ? `Producción cerrada como parcial: ${titulo}.`
        : `Producción completada: ${titulo}.`
    )
    onCompleted?.({ cantidad: cant, parcial })
    onDone()
  }

  if (yaCompletado) {
    const parcial = item.estado === "parcial"
    const sinProducir = bloqueado && (item.estado === "planificada" || item.estado === "en_proceso")
    return (
      <div className="rounded-lg border p-4 space-y-1 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="font-medium">{titulo}</span>
          {sinProducir ? (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              Sin producción
            </Badge>
          ) : parcial ? (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Parcial
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completado
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Producido: {(item.cantidad_producida ?? 0).toLocaleString("es-CO")} / Planificado: {item.cantidad_planificada.toLocaleString("es-CO")}
          {item.costo_total != null && ` · Costo: $${item.costo_total.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`}
        </p>
        {parcial && item.motivo_parcial && (
          <p className="text-sm text-muted-foreground">Motivo: {item.motivo_parcial}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">Receta: {item.receta?.nombre ?? "—"}</span>
      </div>

      <div className="space-y-2 max-w-[220px]">
        <Label>Cantidad Realmente Producida</Label>
        <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <p className="text-xs text-muted-foreground">Planificada: {item.cantidad_planificada}</p>
      </div>

      {esProduccionParcial && (
        <div className="space-y-2">
          <Label>Motivo del faltante</Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: faltó insumo X, merma más alta de lo esperado..."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Se produjeron {cantidadNum.toLocaleString("es-CO")} de {item.cantidad_planificada.toLocaleString("es-CO")} planificadas.
            El ítem quedará en estado &quot;Parcial&quot; y podrás generar una orden de reposición por el faltante.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Ingredientes que se consumirán (en crudo, por lote FEFO)</Label>
        {loadingPreview ? (
          <p className="text-sm text-muted-foreground">Calculando...</p>
        ) : preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingresa una cantidad para ver el consumo estimado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Cant. (crudo)</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((p, idx) => (
                  <TableRow key={`${p.insumo_id}-${p.insumo_lote_id ?? "faltante"}-${idx}`}>
                    <TableCell className="font-medium">{p.insumo_nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{p.codigo_lote ?? "— (sin stock)"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.fecha_vencimiento ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {p.cantidad_a_consumir.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {p.unidad_medida}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.suficiente ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Falta
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <p className="text-sm text-muted-foreground text-right">
          Costo estimado: <span className="font-semibold text-foreground">
            ${costoTotal.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          </span>
        </p>
      )}

      {hayFaltantes && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
          Stock insuficiente para completar este producto con la cantidad indicada.
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleConfirmar}
          disabled={confirming || loadingPreview || preview.length === 0 || hayFaltantes || motivoFaltante}
        >
          {confirming ? "Completando..." : esProduccionParcial ? "Cerrar como parcial" : "Completar producto"}
        </Button>
      </div>
    </div>
  )
}
