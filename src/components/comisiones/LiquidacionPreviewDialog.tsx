"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const formatCOP = (n: number) => `$${Number(n).toLocaleString("es-CO")}`

interface LiquidacionPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendedorId: string
  vendedorNombre: string
  periodoMes: string
  preview: {
    cierre: {
      total_leads: number
      total_cierres: number
      pct_cierre: number
      rango_label: string
    }
    montoGanado: number
    montoBloqueado: number
  } | null
}

export function LiquidacionPreviewDialog({
  open, onOpenChange, vendedorId, vendedorNombre, periodoMes, preview,
}: LiquidacionPreviewDialogProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/comisiones/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedor_id: vendedorId, periodo_mes: periodoMes }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(`Ya existe una liquidación para este período: ${data.error}`)
        } else {
          toast.error(data.error || "Error al crear liquidación")
        }
        return
      }
      toast.success("Liquidación creada exitosamente")
      onOpenChange(false)
      router.push(`/comisiones/liquidacion/${data.liquidacion.id}`)
    } catch {
      toast.error("Error de conexión")
    } finally {
      setCreating(false)
    }
  }

  if (!preview) return null

  const { cierre, montoGanado, montoBloqueado } = preview
  const montoTotal = montoGanado + montoBloqueado

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Liquidación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start justify-between text-sm">
            <div>
              <p className="font-medium">{vendedorNombre}</p>
              <p className="text-muted-foreground">Período: {periodoMes}</p>
            </div>
            <Badge variant="outline" className="text-xs">Borrador</Badge>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cierre Meta Ads</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted p-2">
                <p className="text-lg font-bold tabular-nums">{cierre.total_leads}</p>
                <p className="text-[10px] text-muted-foreground">Leads</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-lg font-bold tabular-nums">{cierre.total_cierres}</p>
                <p className="text-[10px] text-muted-foreground">Cierres</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-lg font-bold tabular-nums">{cierre.pct_cierre.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">{cierre.rango_label}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comisiones</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Ganado (pago confirmado)
                </span>
                <span className="font-semibold text-emerald-700">{formatCOP(montoGanado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Bloqueado (pago pendiente)
                </span>
                <span className="font-semibold text-amber-700">{formatCOP(montoBloqueado)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total comisiones</span>
                <span className="text-primary">{formatCOP(montoTotal)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            Al confirmar, se recalcularán todos los montos usando la tasa de cierre final del período y se creará la liquidación en estado <strong>Borrador</strong>.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating ? "Creando…" : "Confirmar y Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
