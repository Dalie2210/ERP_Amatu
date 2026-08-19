"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, X } from "lucide-react"

interface Props {
  donacionId: string | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function RechazarDonacionDialog({ donacionId, onOpenChange, onDone }: Props) {
  const [motivo, setMotivo] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const cerrar = (v: boolean) => {
    if (!v) setMotivo("")
    onOpenChange(v)
  }

  const handleRechazar = async () => {
    if (!donacionId || !motivo.trim()) return
    setIsSaving(true)
    const res = await fetch(`/api/donaciones/${donacionId}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo rechazar la donación")
    } else {
      toast.success("Donación rechazada")
      cerrar(false)
      onDone()
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!donacionId} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Rechazar donación</DialogTitle>
          <DialogDescription>
            No se descuenta stock y el pedido sigue esperando. Indica el motivo para que quede en el
            historial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo-rechazo-donacion">Motivo *</Label>
          <Textarea
            id="motivo-rechazo-donacion"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. No corresponde al plan de donaciones del mes"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleRechazar()}
            disabled={isSaving || !motivo.trim()}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Rechazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
