"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { toast } from "sonner"
import { formatGramaje } from "@/lib/inventario/mezcla"
import type { ConfigProduccion } from "@/types"

type EditableConfig = Pick<
  ConfigProduccion,
  | "nombre"
  | "porcion_estandar_g"
  | "mezcla_min_g"
  | "mezcla_max_g"
  | "duracion_mezcla_min"
  | "tolerancia_ajuste_g"
>

const CAMPOS: { key: keyof Omit<EditableConfig, "nombre">; label: string; ayuda: string; step: number }[] = [
  {
    key: "porcion_estandar_g",
    label: "Porción estándar (g)",
    ayuda: "Base sobre la que se calibran las recetas y las mezclas.",
    step: 100,
  },
  {
    key: "mezcla_min_g",
    label: "Mezcla mínima (g)",
    ayuda: "Por debajo de esto la mezcladora no trabaja bien.",
    step: 100,
  },
  {
    key: "mezcla_max_g",
    label: "Mezcla máxima (g)",
    ayuda: "Capacidad física del tambor.",
    step: 1000,
  },
  {
    key: "duracion_mezcla_min",
    label: "Duración por mezcla (min)",
    ayuda: "Lo que cuesta cada corrida; es el costo que se minimiza al dividir.",
    step: 5,
  },
  {
    key: "tolerancia_ajuste_g",
    label: "Tolerancia de ajuste (g)",
    ayuda: "Residuo que se acepta sin alertar al no cuadrar a múltiplo.",
    step: 50,
  },
]

function toEditable(c: ConfigProduccion): EditableConfig {
  return {
    nombre: c.nombre,
    porcion_estandar_g: c.porcion_estandar_g,
    mezcla_min_g: c.mezcla_min_g,
    mezcla_max_g: c.mezcla_max_g,
    duracion_mezcla_min: c.duracion_mezcla_min,
    tolerancia_ajuste_g: c.tolerancia_ajuste_g,
  }
}

export default function ProduccionConfigPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<ConfigProduccion[]>([])
  const [edits, setEdits] = useState<Record<string, EditableConfig>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("config_produccion")
      .select("*")
      .order("is_default", { ascending: false })
      .order("nombre")

    if (error) {
      toast.error("Error cargando la configuración: " + error.message)
      setIsLoading(false)
      return
    }

    const typed = (data as ConfigProduccion[]) ?? []
    setRows(typed)
    const init: Record<string, EditableConfig> = {}
    typed.forEach((r) => { init[r.id] = toEditable(r) })
    setEdits(init)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async (id: string) => {
    const payload = edits[id]
    if (!payload) return

    // Se valida aquí además del CHECK de la base para dar un mensaje útil en
    // vez del error crudo de Postgres.
    if (payload.mezcla_max_g < payload.mezcla_min_g) {
      toast.error("La mezcla máxima no puede ser menor que la mínima.")
      return
    }
    if (payload.mezcla_min_g < payload.porcion_estandar_g) {
      toast.error("La mezcla mínima no puede ser menor que una porción estándar.")
      return
    }

    setSavingId(id)
    const { error } = await supabase.from("config_produccion").update(payload).eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Configuración guardada.")
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)))
    }
    setSavingId(null)
  }

  const setField = (id: string, field: keyof EditableConfig, value: string | number) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-start gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Config Producción</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Capacidad de la mezcladora y porción estándar. Estos valores no están fijos en el
            sistema porque dependen del equipo físico de la planta: al cambiar de mezcladora se
            ajustan aquí. Cada orden de mezcla puede además sobrescribir los límites a mano.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay configuraciones de producción registradas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const edit = edits[row.id]
            if (!edit) return null
            const isDirty = JSON.stringify(edit) !== JSON.stringify(toEditable(row))

            return (
              <Card key={row.id} className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-heading">{row.nombre}</CardTitle>
                      {row.is_default && (
                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                          Predeterminada
                        </span>
                      )}
                      <StatusBadge active={row.is_active} />
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={!isDirty || savingId === row.id}
                      onClick={() => handleSave(row.id)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingId === row.id ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Mezclas entre {formatGramaje(edit.mezcla_min_g)} y {formatGramaje(edit.mezcla_max_g)},
                    en porciones de {formatGramaje(edit.porcion_estandar_g)} (
                    {Math.floor(edit.mezcla_max_g / (edit.porcion_estandar_g || 1))} porciones por mezcla
                    como máximo).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 max-w-sm">
                    <p className="text-xs text-muted-foreground font-medium">Nombre</p>
                    <Input
                      value={edit.nombre}
                      onChange={(e) => setField(row.id, "nombre", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {CAMPOS.map(({ key, label, ayuda, step }) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        <Input
                          type="number"
                          min={0}
                          step={step}
                          value={edit[key]}
                          onChange={(e) => setField(row.id, key, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground leading-tight">{ayuda}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
