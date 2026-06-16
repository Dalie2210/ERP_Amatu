"use client"

import { useEffect, useState } from "react"
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
import type { SupabaseClient } from "@supabase/supabase-js"

export interface MensajeroRow {
  id: string
  nombre: string
  placa_vehiculo: string | null
  telefono: string
  zona_id: string | null
}

interface ZonaOption {
  id: string
  nombre: string
}

interface Props {
  supabase: SupabaseClient
  mensajero?: MensajeroRow
  trigger: React.ReactNode
  onSaved: () => void
}

export function MensajeroDialog({ supabase, mensajero, trigger, onSaved }: Props) {
  const isEdit = !!mensajero
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [zonas, setZonas] = useState<ZonaOption[]>([])

  const [nombre, setNombre] = useState("")
  const [placa, setPlaca] = useState("")
  const [telefono, setTelefono] = useState("")
  const [zonaId, setZonaId] = useState<string | null>(null)

  // Load zones once dialog is opened
  useEffect(() => {
    if (!open) return
    const fetchZonas = async () => {
      const { data } = await supabase
        .from("zonas_envio")
        .select("id, nombre")
        .eq("is_active", true)
        .order("nombre")
      if (data) setZonas(data as ZonaOption[])
    }
    fetchZonas()
  }, [open, supabase])

  // Reset form fields each time the dialog opens
  useEffect(() => {
    if (!open) return
    setNombre(mensajero?.nombre ?? "")
    setPlaca(mensajero?.placa_vehiculo ?? "")
    setTelefono(mensajero?.telefono ?? "")
    setZonaId(mensajero?.zona_id ?? null)
  }, [open, mensajero])

  const handleSave = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      toast.error("Nombre y teléfono son requeridos")
      return
    }
    setIsLoading(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        placa_vehiculo: placa.trim() || null,
        telefono: telefono.trim(),
        zona_id: zonaId,
      }
      const { error } = isEdit
        ? await supabase.from("mensajeros").update(payload).eq("id", mensajero!.id)
        : await supabase.from("mensajeros").insert(payload)

      if (error) throw error

      toast.success(isEdit ? "Mensajero actualizado" : "Mensajero creado")
      setOpen(false)
      onSaved()
    } catch {
      toast.error(isEdit ? "Error al actualizar el mensajero" : "Error al crear el mensajero")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Mensajero" : "Nuevo Mensajero"}</DialogTitle>
          <DialogDescription>
            Datos del mensajero que se usarán al asignarlo a una ruta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Teléfono *</Label>
              <Input
                placeholder="300 000 0000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Placa del Vehículo</Label>
              <Input
                placeholder="ABC123"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Zona Asignada</Label>
            <Select
              value={zonaId ?? ""}
              onValueChange={(v: string | null) => setZonaId(v ?? null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona...">
                  {zonaId ? (zonas.find((z) => z.id === zonaId)?.nombre ?? null) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {zonas.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear Mensajero"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
