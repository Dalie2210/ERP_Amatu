"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"

interface Props {
  conteoId: string | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function AprobarConteoDialog({ conteoId, onOpenChange, onDone }: Props) {
  const [isSaving, setIsSaving] = useState(false)

  const handleAprobar = async () => {
    if (!conteoId) return
    setIsSaving(true)
    const res = await fetch(`/api/inventario/conteo/${conteoId}/aprobar`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo aprobar el conteo")
    } else {
      toast.success("Conteo aprobado: ajustes aplicados al stock")
      onOpenChange(false)
      onDone()
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!conteoId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Aprobar conteo</DialogTitle>
          <DialogDescription>
            Las diferencias se recalculan al aprobar; el stock pudo cambiar desde el registro.
            Al confirmar, los ajustes se aplican de inmediato al inventario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleAprobar()} disabled={isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aprobar y aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
