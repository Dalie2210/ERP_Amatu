"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, HeartHandshake } from "lucide-react"

export interface LotePreset {
  id: string
  codigoLote: string
  disponible: number
}

interface Props {
  lote: LotePreset | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

/**
 * ERP-DON-02: marcar como donación stock que ya existe y que no se concibió
 * como donación al producirlo. No descuenta nada todavía — la RPC solo deja el
 * registro pendiente y un admin lo aprueba (ERP-DON-03).
 */
export function DonarLoteDialog({ lote, onOpenChange, onDone }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [cantidad, setCantidad] = useState("")
  const [destinatario, setDestinatario] = useState("")
  const [motivo, setMotivo] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const cerrar = (v: boolean) => {
    if (!v) {
      setCantidad("")
      setDestinatario("")
      setMotivo("")
    }
    onOpenChange(v)
  }

  const cantidadNum = Number(cantidad)
  const isValid =
    !!lote &&
    cantidad.trim() !== "" &&
    Number.isFinite(cantidadNum) &&
    cantidadNum > 0 &&
    cantidadNum <= lote.disponible &&
    destinatario.trim() !== "" &&
    motivo.trim() !== ""

  const handleDonar = async () => {
    if (!lote || !isValid) return
    setIsSaving(true)
    const { error } = await supabase.rpc("fn_donar_lote_pt", {
      p_lote_id: lote.id,
      p_cantidad: cantidadNum,
      p_destinatario: destinatario.trim(),
      p_motivo: motivo.trim(),
    })
    setIsSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Donación registrada; queda pendiente de aprobación")
    cerrar(false)
    onDone()
  }

  return (
    <Dialog open={!!lote} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Marcar como donación</DialogTitle>
          <DialogDescription>
            Lote <span className="font-mono">{lote?.codigoLote}</span> ·{" "}
            {lote?.disponible.toLocaleString("es-CO")} disponibles. El stock se descuenta cuando un
            administrador apruebe la donación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="donacion-cantidad">Cantidad a donar *</Label>
            <Input
              id="donacion-cantidad"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
            />
            {cantidad.trim() !== "" && lote && cantidadNum > lote.disponible && (
              <p className="text-xs text-destructive">
                El lote solo tiene {lote.disponible.toLocaleString("es-CO")} disponibles.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donacion-destinatario">Destinatario *</Label>
            <Input
              id="donacion-destinatario"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              placeholder="Fundación, refugio, persona..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donacion-motivo">Motivo *</Label>
            <Textarea
              id="donacion-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué se dona este lote"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleDonar()} disabled={!isValid || isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
            Registrar donación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
