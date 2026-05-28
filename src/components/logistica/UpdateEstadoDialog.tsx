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
import type { UserRole } from "@/types"

type EstadoLogistica =
  | "confirmado"
  | "en_preparacion"
  | "espera_produccion"
  | "listo_despacho"
  | "devolucion"
  | "cambio"
  | "parcial"

// All possible forward transitions
const ALL_TRANSITIONS: Record<
  string,
  { estado: EstadoLogistica; label: string; description: string; destructive?: boolean }[]
> = {
  fecha_tentativa: [
    { estado: "confirmado", label: "Confirmar Pedido", description: "Confirmar pedido y registrar pago recibido" },
  ],
  confirmado: [
    { estado: "en_preparacion", label: "En Preparación", description: "Iniciar preparación del pedido" },
    { estado: "espera_produccion", label: "En Espera Producción", description: "El alimento aún no está listo" },
    { estado: "devolucion", label: "Marcar Devolución", description: "El cliente devuelve el pedido completo", destructive: true },
    { estado: "cambio", label: "Marcar Cambio", description: "El cliente solicita cambio de producto", destructive: true },
  ],
  en_preparacion: [
    { estado: "espera_produccion", label: "En Espera Producción", description: "Pasar a espera de producción" },
    { estado: "listo_despacho", label: "Listo para Despacho", description: "Pedido empacado y listo" },
    { estado: "devolucion", label: "Marcar Devolución", description: "El cliente devuelve el pedido completo", destructive: true },
    { estado: "cambio", label: "Marcar Cambio", description: "El cliente solicita cambio de producto", destructive: true },
  ],
  espera_produccion: [
    { estado: "listo_despacho", label: "Listo para Despacho", description: "Producción completada, listo" },
    { estado: "devolucion", label: "Marcar Devolución", description: "El cliente devuelve el pedido completo", destructive: true },
  ],
  listo_despacho: [
    { estado: "devolucion", label: "Marcar Devolución", description: "El cliente devuelve el pedido antes del despacho", destructive: true },
    { estado: "cambio", label: "Marcar Cambio", description: "El cliente solicita cambio de producto", destructive: true },
  ],
  despachado: [
    { estado: "devolucion", label: "Marcar Devolución", description: "El cliente devuelve el pedido ya despachado", destructive: true },
    { estado: "cambio", label: "Marcar Cambio", description: "El cliente solicita cambio de producto", destructive: true },
    { estado: "parcial", label: "Marcar Parcial", description: "Devolución o entrega parcial del pedido", destructive: true },
  ],
}

// Logistica role can only move orders within preparation pipeline, no confirmations or devolutions
const LOGISTICA_ALLOWED: EstadoLogistica[] = [
  "en_preparacion",
  "espera_produccion",
  "listo_despacho",
]

interface Props {
  pedidoId: string
  estadoActual: string
  numeroPedido: string
  supabase: SupabaseClient
  onSuccess: () => void
  trigger: React.ReactNode
  userRole?: UserRole | null
}

export function UpdateEstadoDialog({
  pedidoId,
  estadoActual,
  numeroPedido,
  supabase,
  onSuccess,
  trigger,
  userRole,
}: Props) {
  const [open, setOpen] = useState(false)
  const [selectedEstado, setSelectedEstado] = useState<EstadoLogistica | null>(null)
  const [notasDespacho, setNotasDespacho] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const allTransitions = ALL_TRANSITIONS[estadoActual] ?? []
  const transitions =
    userRole === "logistica"
      ? allTransitions.filter((t) => LOGISTICA_ALLOWED.includes(t.estado))
      : allTransitions

  const handleSave = async () => {
    if (!selectedEstado) return
    setIsLoading(true)
    try {
      const updates: Record<string, unknown> = { estado: selectedEstado }
      if (selectedEstado === "confirmado" && estadoActual === "fecha_tentativa") {
        updates.estado_pago = "confirmado"
      }
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
        <DialogContent className="sm:max-w-[440px]">
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
                    ? t.destructive
                      ? "border-destructive bg-destructive/5"
                      : "border-primary bg-primary/5"
                    : t.destructive
                    ? "border-border hover:border-destructive/40"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className={`font-medium text-sm ${t.destructive ? "text-destructive" : ""}`}>
                  {t.label}
                </p>
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotasDespacho(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedEstado || isLoading}
              variant={selectedEstado && (ALL_TRANSITIONS[estadoActual] ?? []).find(t => t.estado === selectedEstado)?.destructive ? "destructive" : "default"}
            >
              {isLoading ? "Guardando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
