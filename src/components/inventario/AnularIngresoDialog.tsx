"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

interface AnularIngresoDialogProps {
  trigger: React.ReactElement
  ingresoId: string
  numero: string | null
  onAnulado?: () => void
}

export function AnularIngresoDialog({ trigger, ingresoId, numero, onAnulado }: AnularIngresoDialogProps) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isValid = motivo.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSaving(true)

    const { error } = await supabase.rpc("fn_anular_ingreso", {
      p_ingreso_id: ingresoId,
      p_motivo: motivo.trim(),
    })

    if (error) {
      toast.error("Error al anular el ingreso: " + error.message)
      setIsSaving(false)
      return
    }

    toast.success(`Ingreso ${numero ?? ""} anulado correctamente.`)
    setMotivo("")
    setIsSaving(false)
    setOpen(false)
    onAnulado?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Anular Ingreso {numero}</DialogTitle>
          <DialogDescription>
            Esto revierte el lote y el stock generados por este ingreso y lo marca como
            anulado. El registro y su historial de movimientos se conservan para
            trazabilidad. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="motivo-anular">Motivo</Label>
          <Textarea
            id="motivo-anular"
            placeholder="Ej: cantidad registrada por error, se debe anular"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!isValid || isSaving} onClick={handleSubmit}>
            {isSaving ? "Anulando..." : "Anular Ingreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
