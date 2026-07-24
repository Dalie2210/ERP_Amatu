"use client"

import { useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Save, Blend } from "lucide-react"
import { toast } from "sonner"
import type { OrdenProduccionItemExpanded, OrdenMezclaExpanded } from "@/types"
import { PORCION_ESTANDAR_G, formatGramaje } from "@/lib/inventario/mezcla"

// Firmas de trazabilidad exigidas por control de calidad (una por dieta).
const FIRMAS = [
  { campo: "firma_mezclo", label: "Mezcló" },
  { campo: "firma_empaco", label: "Empacó" },
  { campo: "firma_fecho", label: "Fechó" },
  { campo: "firma_sello", label: "Selló" },
  { campo: "firma_verifico", label: "Verificó" },
] as const

type FirmaCampo = (typeof FIRMAS)[number]["campo"]

// Etiquetas legibles de los campos editables de la hoja de mezcla, usadas para
// construir el diff al guardar (mismo patrón que la hoja de proceso).
const CAMPO_LABELS: Record<string, string> = {
  num_mezclas: "N.º de mezclas",
  firma_mezclo: "Mezcló",
  firma_empaco: "Empacó",
  firma_fecho: "Fechó",
  firma_sello: "Selló",
  firma_verifico: "Verificó",
  observaciones: "Observaciones",
}

const CAMPOS_EDITABLES = Object.keys(CAMPO_LABELS) as (keyof OrdenMezclaExpanded)[]

interface CambioMezcla {
  entidad: string
  campo: string
  campo_label: string
  anterior: string | number | null
  nuevo: string | number | null
}

// Compara la hoja de mezcla original (tal como se cargó) contra la actual y
// arma la lista de cambios campo por campo, para el historial detallado
// (misma estructura que diffProcesos en el detalle de la orden).
function diffMezclas(
  original: OrdenMezclaExpanded[],
  actual: OrdenMezclaExpanded[]
): CambioMezcla[] {
  const cambios: CambioMezcla[] = []
  for (const r of actual) {
    const orig = original.find((o) => o.id === r.id)
    if (!orig) continue
    for (const campo of CAMPOS_EDITABLES) {
      const antes = (orig[campo] as string | number | null) ?? null
      const despues = (r[campo] as string | number | null) ?? null
      if (antes !== despues) {
        cambios.push({
          entidad: r.producto?.nombre ?? "—",
          campo: campo as string,
          campo_label: CAMPO_LABELS[campo as string],
          anterior: antes,
          nuevo: despues,
        })
      }
    }
  }
  return cambios
}

interface MezclaPanelProps {
  ordenId: string
  items: OrdenProduccionItemExpanded[]
  mezclas: OrdenMezclaExpanded[]
  canEdit: boolean
  // La orden ya está cerrada (completada/cancelada): solo lectura.
  bloqueado: boolean
  onLog: (payload: Record<string, unknown>) => Promise<void>
  onSaved: () => void
}

export function MezclaPanel({
  ordenId, items, mezclas, canEdit, bloqueado, onLog, onSaved,
}: MezclaPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<OrdenMezclaExpanded[]>(mezclas)
  // Snapshot de la hoja de mezcla tal como se cargó, para poder calcular el
  // diff (qué cambió, valor anterior/nuevo) al guardar.
  const [original, setOriginal] = useState<OrdenMezclaExpanded[]>(mezclas)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  // Referencia de la última prop `mezclas` procesada, para detectar cuándo el
  // padre recargó datos frescos (carga inicial y tras guardar) y resincronizar
  // durante el render, sin pisar ediciones locales en curso.
  const [prevMezclas, setPrevMezclas] = useState(mezclas)
  if (mezclas !== prevMezclas) {
    setPrevMezclas(mezclas)
    setRows(mezclas)
    setOriginal(mezclas)
    setDirty(false)
  }

  const editable = canEdit && !bloqueado

  // Desglose de porciones por dieta → presentación (calculado desde los ítems,
  // no se persiste). Ej.: { [productoId]: [{ presentacion: "1200g", cantidad: 10 }] }
  const porcionesPorDieta = useMemo(() => {
    const map = new Map<string, { presentacion: string; cantidad: number }[]>()
    for (const it of items) {
      const pres = it.variante?.presentacion ?? "—"
      const lista = map.get(it.producto_id) ?? []
      const existente = lista.find((l) => l.presentacion === pres)
      if (existente) existente.cantidad += it.cantidad_planificada
      else lista.push({ presentacion: pres, cantidad: it.cantidad_planificada })
      map.set(it.producto_id, lista)
    }
    return map
  }, [items])

  function updateNumMezclas(id: string, valor: string) {
    const num = valor.trim() === "" ? null : Number(valor)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, num_mezclas: num } : r)))
    setDirty(true)
  }
  function updateFirma(id: string, campo: FirmaCampo, valor: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor === "" ? null : valor } : r)))
    setDirty(true)
  }
  function updateObservaciones(id: string, valor: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, observaciones: valor === "" ? null : valor } : r)))
    setDirty(true)
  }

  async function handleGuardar() {
    if (!editable) return
    setSaving(true)
    const cambios = diffMezclas(original, rows)
    const payload = rows.map((r) => ({
      id: r.id,
      orden_id: r.orden_id,
      producto_id: r.producto_id,
      total_gramos: r.total_gramos,
      num_mezclas_sugerido: r.num_mezclas_sugerido,
      num_mezclas: r.num_mezclas,
      porcion_estandar: r.porcion_estandar,
      firma_mezclo: r.firma_mezclo,
      firma_empaco: r.firma_empaco,
      firma_fecho: r.firma_fecho,
      firma_sello: r.firma_sello,
      firma_verifico: r.firma_verifico,
      observaciones: r.observaciones,
      orden_index: r.orden_index,
    }))

    const { error } = await supabase.from("orden_mezcla").upsert(payload)
    if (error) {
      setSaving(false)
      toast.error("Error al guardar: " + error.message)
      return
    }
    // Bump de auditoría en la orden (el trigger fija updated_by = auth.uid()).
    await supabase.from("ordenes_produccion").update({ updated_at: new Date().toISOString() }).eq("id", ordenId)
    if (cambios.length > 0) {
      await onLog({ cambios: cambios as unknown as Record<string, unknown>[] })
    }
    setSaving(false)
    setDirty(false)
    toast.success("Hoja de mezcla guardada.")
    onSaved()
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <Blend className="h-10 w-10 opacity-30" />
        <p>Esta orden no tiene dietas para calcular mezclas.</p>
        <p className="text-xs">Verifica que sus productos tengan variantes con gramaje (300g/500g/1200g).</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Nº de mezclas por dieta = total requerido ÷ {PORCION_ESTANDAR_G.toLocaleString("es-CO")} g.
          Ajusta el número final (redondeo a múltiplo de 12 y división en lotes según la mezcladora)
          y registra las firmas de trazabilidad.
        </p>
        {editable && (
          <Button onClick={handleGuardar} disabled={saving || !dirty} className="gap-2 shrink-0">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {rows.map((r) => {
          const porciones = porcionesPorDieta.get(r.producto_id) ?? []
          return (
            <div key={r.id} className="border rounded-lg bg-white p-4 space-y-4">
              {/* Encabezado de la dieta */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-base">{r.producto?.nombre ?? "—"}</h3>
                <div className="text-sm text-muted-foreground">
                  Total requerido:{" "}
                  <span className="font-medium text-foreground">{formatGramaje(r.total_gramos)}</span>
                </div>
              </div>

              {/* Porciones por presentación */}
              {porciones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {porciones.map((p) => (
                    <Badge key={p.presentacion} variant="secondary" className="font-normal">
                      {p.presentacion} × {p.cantidad.toLocaleString("es-CO")}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Nº de mezclas */}
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nº de mezclas sugerido</Label>
                  <div className="text-2xl font-bold tabular-nums">
                    {r.num_mezclas_sugerido != null
                      ? r.num_mezclas_sugerido.toLocaleString("es-CO", { maximumFractionDigits: 2 })
                      : "—"}
                  </div>
                </div>
                <div className="w-40">
                  <Label htmlFor={`nm-${r.id}`} className="text-xs">
                    Nº de mezclas (final)
                  </Label>
                  <Input
                    id={`nm-${r.id}`}
                    type="number"
                    className="mt-1"
                    placeholder="p. ej. 84"
                    value={r.num_mezclas ?? ""}
                    disabled={!editable}
                    onChange={(e) => updateNumMezclas(r.id, e.target.value)}
                  />
                </div>
              </div>

              {/* Firmas de trazabilidad */}
              <div>
                <Label className="text-xs text-muted-foreground">Firmas de trazabilidad</Label>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {FIRMAS.map((f) => (
                    <div key={f.campo}>
                      <Label htmlFor={`${f.campo}-${r.id}`} className="text-[11px] text-muted-foreground">
                        {f.label}
                      </Label>
                      <Input
                        id={`${f.campo}-${r.id}`}
                        className="mt-0.5 h-8 text-sm"
                        value={(r[f.campo] as string | null) ?? ""}
                        disabled={!editable}
                        onChange={(e) => updateFirma(r.id, f.campo, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <Label htmlFor={`obs-${r.id}`} className="text-[11px] text-muted-foreground">
                  Observaciones
                </Label>
                <Textarea
                  id={`obs-${r.id}`}
                  className="mt-0.5 min-h-16 text-sm"
                  value={r.observaciones ?? ""}
                  disabled={!editable}
                  onChange={(e) => updateObservaciones(r.id, e.target.value)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
