"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"

interface Props {
  donacionId: string | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function AprobarDonacionDialog({ donacionId, onOpenChange, onDone }: Props) {
  const [isSaving, setIsSaving] = useState(false)

  const handleAprobar = async () => {
    if (!donacionId) return
    setIsSaving(true)
    const res = await fetch(`/api/donaciones/${donacionId}/aprobar`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo aprobar la donación")
    } else {
      toast.success("Donación aprobada")
      onOpenChange(false)
      onDone()
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!donacionId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Aprobar donación</DialogTitle>
          <DialogDescription>
            Al confirmar, la orden pasa a confirmada y entra al tablero de logística; si la donación
            es de un lote, el stock se descuenta en ese momento. El saldo del lote se revalida al
            aprobar, porque pudo moverse desde el registro.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleAprobar()} disabled={isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
