"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TipoAliado } from "@/types"

interface AliadoFormData {
  nombre: string
  tipo: TipoAliado
  celular: string
  correo: string
}

interface AliadoFormDialogProps {
  trigger: React.ReactNode
  initialData?: AliadoFormData & { id?: string }
  onSave: (data: AliadoFormData, id?: string) => Promise<void>
}

const TIPO_LABELS: Record<TipoAliado, string> = {
  veterinario: "Veterinario",
  entrenador_canino: "Entrenador Canino",
  otro: "Otro",
}

export function AliadoFormDialog({ trigger, initialData, onSave }: AliadoFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<AliadoFormData>({
    nombre: "",
    tipo: "veterinario",
    celular: "",
    correo: "",
  })

  useEffect(() => {
    if (open && initialData) {
      setForm({
        nombre: initialData.nombre,
        tipo: initialData.tipo,
        celular: initialData.celular,
        correo: initialData.correo,
      })
    } else if (open) {
      setForm({ nombre: "", tipo: "veterinario", celular: "", correo: "" })
    }
    setError(null)
  }, [open, initialData])

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave(form, initialData?.id)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {initialData?.id ? "Editar Aliado" : "Nuevo Aliado"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Dr. Juan García"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={form.tipo}
              onValueChange={(v: string | null) => setForm({ ...form, tipo: (v ?? "veterinario") as TipoAliado })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo">
                  {TIPO_LABELS[form.tipo]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veterinario">Veterinario</SelectItem>
                <SelectItem value="entrenador_canino">Entrenador Canino</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Celular</Label>
            <Input
              placeholder="3001234567"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Correo</Label>
            <Input
              type="email"
              placeholder="aliado@correo.com"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
