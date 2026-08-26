"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Save } from "lucide-react"
import type { Seccion, SeccionPermiso } from "@/types"
import { SECCION_LABELS, SECCION_GRUPOS } from "@/lib/constants/labels"

interface Props {
  userId: string | null
  userLabel: string
  onOpenChange: (open: boolean) => void
}

type PermisosMap = Record<string, SeccionPermiso>

export function PermisosPersonalizadoDialog({ userId, userLabel, onOpenChange }: Props) {
  const [permisos, setPermisos] = useState<PermisosMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchPermisos = useCallback(async (id: string) => {
    setIsLoading(true)
    const res = await fetch(`/api/admin/usuarios/${id}/permisos`)
    if (res.ok) {
      const data = await res.json()
      setPermisos(data.permisos ?? {})
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (userId) void fetchPermisos(userId)
  }, [userId, fetchPermisos])

  const toggleVer = (seccion: Seccion, value: boolean) => {
    setPermisos((prev) => ({
      ...prev,
      [seccion]: {
        puede_ver: value,
        puede_editar: value ? (prev[seccion]?.puede_editar ?? false) : false,
      },
    }))
  }

  const toggleEditar = (seccion: Seccion, value: boolean) => {
    setPermisos((prev) => ({
      ...prev,
      [seccion]: { puede_ver: prev[seccion]?.puede_ver ?? false, puede_editar: value },
    }))
  }

  const handleSave = async () => {
    if (!userId) return
    setIsSaving(true)
    const body = {
      permisos: Object.entries(permisos).map(([seccion, p]) => ({
        seccion,
        puede_ver: p.puede_ver,
        puede_editar: p.puede_editar,
      })),
    }
    const res = await fetch(`/api/admin/usuarios/${userId}/permisos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success("Permisos actualizados.")
      onOpenChange(false)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Error al guardar permisos.")
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!userId} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Permisos — {userLabel}</DialogTitle>
          <DialogDescription>
            Define qué secciones puede ver y editar este usuario. &quot;Editar&quot; solo aplica a
            flujos ya conectados a operaciones seguras (ej. conteo de inventario); las demás
            secciones marcadas como editables quedan documentadas para habilitarse más adelante.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {SECCION_GRUPOS.map((grupo) => (
              <div key={grupo.label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {grupo.label}
                </p>
                <div className="space-y-2">
                  {grupo.secciones.map((seccion) => {
                    const p = permisos[seccion] ?? { puede_ver: false, puede_editar: false }
                    return (
                      <div key={seccion} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                        <Label className="text-sm font-normal flex-1">{SECCION_LABELS[seccion]}</Label>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Ver</Label>
                          <Switch
                            size="sm"
                            checked={p.puede_ver}
                            onCheckedChange={(v) => toggleVer(seccion as Seccion, !!v)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Editar</Label>
                          <Switch
                            size="sm"
                            checked={p.puede_editar}
                            disabled={!p.puede_ver}
                            onCheckedChange={(v) => toggleEditar(seccion as Seccion, !!v)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving || isLoading} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
