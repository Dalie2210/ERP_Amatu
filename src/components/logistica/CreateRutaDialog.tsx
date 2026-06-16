"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { FRANJA_LABELS } from "@/lib/constants/labels"
import { MensajeroSelect, type MensajeroOption } from "@/components/logistica/MensajeroSelect"
import type { SupabaseClient } from "@supabase/supabase-js"

interface Props {
  supabase: SupabaseClient
  userId: string
  onCreated: (rutaId: string) => void
}

export function CreateRutaDialog({ supabase, userId, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const [nombre, setNombre] = useState("")
  const [fecha, setFecha] = useState(today)
  const [franja, setFranja] = useState("AM")
  const [mensajero, setMensajero] = useState<MensajeroOption | null>(null)

  const handleCreate = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre de la ruta es requerido")
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("rutas")
        .insert({
          nombre: nombre.trim(),
          fecha,
          franja,
          mensajero_id: mensajero?.id ?? null,
          mensajero_nombre: mensajero?.nombre ?? null,
          mensajero_celular: mensajero?.telefono ?? null,
          created_by: userId,
        })
        .select("id")
        .single()

      if (error) throw error

      toast.success("Ruta creada exitosamente")
      setOpen(false)
      setNombre("")
      setMensajero(null)
      onCreated(data.id)
    } catch {
      toast.error("Error al crear la ruta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" /> Nueva Ruta
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Ruta</DialogTitle>
          <DialogDescription>
            Agrupa pedidos listos para despacho en una ruta de entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Nombre de la Ruta *</Label>
            <Input
              placeholder="Ej: Ruta Norte AM"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Franja</Label>
              <Select value={franja} onValueChange={(v) => setFranja(v ?? "AM")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar...">
                    {franja ? (FRANJA_LABELS[franja] ?? franja) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM (Mañana)</SelectItem>
                  <SelectItem value="PM">PM (Tarde)</SelectItem>
                  <SelectItem value="intermedia">Intermedia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Mensajero</Label>
            <MensajeroSelect
              supabase={supabase}
              value={mensajero?.id ?? null}
              onChange={setMensajero}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Puedes asignarlo o cambiarlo luego al gestionar la ruta.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creando..." : "Crear Ruta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
