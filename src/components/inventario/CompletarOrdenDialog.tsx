"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/useDebounce"
import type { OrdenProduccionExpanded, PreviewConsumoProduccion } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  orden: OrdenProduccionExpanded | null
  onCompleted: () => void
}

export function CompletarOrdenDialog({ open, onOpenChange, orden, onCompleted }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [cantidad, setCantidad] = useState("")
  const [preview, setPreview] = useState<PreviewConsumoProduccion[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open || !orden) return
    setCantidad(String(orden.cantidad_planificada))
    setError(null)
    setPreview([])
  }, [open, orden])

  const debouncedCantidad = useDebounce(cantidad, 400)

  const fetchPreview = useCallback(async () => {
    if (!orden) return
    const cant = parseFloat(debouncedCantidad)
    if (isNaN(cant) || cant <= 0) { setPreview([]); return }

    setLoadingPreview(true)
    const { data, error: rpcError } = await supabase.rpc("fn_preview_consumo_produccion", {
      p_orden_id: orden.id,
      p_cantidad_producida: cant,
    })
    setLoadingPreview(false)
    if (rpcError) { setError(rpcError.message); setPreview([]); return }
    setError(null)
    setPreview(data ?? [])
  }, [orden, debouncedCantidad, supabase])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  const hayFaltantes = preview.some((p) => !p.suficiente)
  const costoTotal = preview.reduce((sum, p) => sum + p.cantidad_a_consumir * p.costo_unitario, 0)

  async function handleConfirmar() {
    if (!orden) return
    const cant = parseFloat(cantidad)
    if (isNaN(cant) || cant <= 0) { setError("La cantidad debe ser mayor a cero."); return }
    if (hayFaltantes) { setError("No hay stock suficiente de uno o más insumos para completar la orden."); return }

    setConfirming(true)
    const { error: rpcError } = await supabase.rpc("fn_completar_produccion", {
      p_orden_id: orden.id,
      p_cantidad_producida: cant,
    })
    setConfirming(false)

    if (rpcError) { setError(rpcError.message); return }

    toast.success("Producción completada. Lote de PT creado.")
    onCompleted()
    onOpenChange(false)
  }

  if (!orden) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar Orden {orden.numero}</DialogTitle>
          <DialogDescription>
            {orden.producto?.nombre} — {orden.variante?.presentacion ?? "Todas"} · Receta: {orden.receta?.nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 max-w-[220px]">
            <Label>Cantidad Realmente Producida</Label>
            <Input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Planificada: {orden.cantidad_planificada}</p>
          </div>

          <div className="space-y-2">
            <Label>Ingredientes que se consumirán (en crudo, por lote FEFO)</Label>
            {loadingPreview ? (
              <p className="text-sm text-muted-foreground">Calculando...</p>
            ) : preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingresa una cantidad para ver el consumo estimado.</p>
            ) : (
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
                      <TableCell className="text-muted-foreground">
                        {p.codigo_lote ?? "— (sin stock)"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.fecha_vencimiento ?? "—"}
                      </TableCell>
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
              Stock insuficiente para completar esta orden con la cantidad indicada.
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={confirming || loadingPreview || preview.length === 0 || hayFaltantes}>
            {confirming ? "Completando..." : "Confirmar y Completar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
