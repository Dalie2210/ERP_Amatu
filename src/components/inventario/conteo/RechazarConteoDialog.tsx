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
  conteoId: string | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function RechazarConteoDialog({ conteoId, onOpenChange, onDone }: Props) {
  const [motivo, setMotivo] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const cerrar = (v: boolean) => {
    if (!v) setMotivo("")
    onOpenChange(v)
  }

  const handleRechazar = async () => {
    if (!conteoId || !motivo.trim()) return
    setIsSaving(true)
    const res = await fetch(`/api/inventario/conteo/${conteoId}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo rechazar el conteo")
    } else {
      toast.success("Conteo rechazado")
      cerrar(false)
      onDone()
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!conteoId} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Rechazar conteo</DialogTitle>
          <DialogDescription>
            El stock no se modifica. Indica el motivo para que quede en el historial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo-rechazo">Motivo *</Label>
          <Textarea
            id="motivo-rechazo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Diferencia sospechosa, se solicita recontar"
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
