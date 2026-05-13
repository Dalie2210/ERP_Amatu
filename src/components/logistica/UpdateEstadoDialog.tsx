"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { SupabaseClient } from "@supabase/supabase-js"

type EstadoLogistica =
  | "en_preparacion"
  | "espera_produccion"
  | "listo_despacho"

const TRANSITIONS: Record<string, { estado: EstadoLogistica; label: string; description: string }[]> = {
  confirmado: [
    { estado: "en_preparacion", label: "En Preparación", description: "Iniciar preparación del pedido" },
    { estado: "espera_produccion", label: "En Espera Producción", description: "El alimento aún no está listo" },
  ],
  en_preparacion: [
    { estado: "espera_produccion", label: "En Espera Producción", description: "Pasar a espera de producción" },
    { estado: "listo_despacho", label: "Listo para Despacho", description: "Pedido empacado y listo" },
  ],
  espera_produccion: [
    { estado: "listo_despacho", label: "Listo para Despacho", description: "Producción completada, listo" },
  ],
}

interface Props {
  pedidoId: string
  estadoActual: string
  numeroPedido: string
  supabase: SupabaseClient
  onSuccess: () => void
  trigger: React.ReactNode
}

export function UpdateEstadoDialog({ pedidoId, estadoActual, numeroPedido, supabase, onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedEstado, setSelectedEstado] = useState<EstadoLogistica | null>(null)
  const [notasDespacho, setNotasDespacho] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const transitions = TRANSITIONS[estadoActual] ?? []

  const handleSave = async () => {
    if (!selectedEstado) return
    setIsLoading(true)
    try {
      const updates: Record<string, unknown> = { estado: selectedEstado }
      if (notasDespacho.trim()) updates.notas_despacho = notasDespacho.trim()

      const { error } = await supabase
        .from("pedidos")
        .update(updates)
        .eq("id", pedidoId)

      if (error) throw error

      toast.success(`Pedido ${numeroPedido} actualizado`)
      setOpen(false)
      setSelectedEstado(null)
      setNotasDespacho("")
      onSuccess()
    } catch {
      toast.error("Error al actualizar el estado")
    } finally {
      setIsLoading(false)
    }
  }

  if (transitions.length === 0) return null

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Actualizar Estado — {numeroPedido}</DialogTitle>
          <DialogDescription>Selecciona el nuevo estado del pedido.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {transitions.map((t) => (
            <button
              key={t.estado}
              onClick={() => setSelectedEstado(t.estado)}
              className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                selectedEstado === t.estado
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-medium text-sm">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notas-despacho">Notas de Despacho (opcional)</Label>
          <Textarea
            id="notas-despacho"
            placeholder="Indicaciones para el mensajero, portería, etc."
            value={notasDespacho}
            onChange={(e) => setNotasDespacho(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedEstado || isLoading}>
            {isLoading ? "Guardando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
