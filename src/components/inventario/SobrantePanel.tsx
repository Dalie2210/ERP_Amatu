"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { crudoDesdeCocido } from "@/lib/inventario/receta"
import type { InsumoMezclaRow } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenMezclaId: string | null
  dietaNombre: string
  /** Precarga desde la hoja de proceso: insumo → cocido que sobró. */
  precarga?: Record<string, number>
  onSaved: () => void
}

export function SobrantePanel({
  open, onOpenChange, ordenMezclaId, dietaNombre, precarga, onSaved,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [insumos, setInsumos] = useState<InsumoMezclaRow[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !ordenMezclaId) return
    setIsLoading(true)
    setError(null)
    supabase
      .rpc("fn_insumos_mezcla", { p_orden_mezcla_id: ordenMezclaId })
      .then(({ data, error: rpcErr }) => {
        if (rpcErr) {
          setError(rpcErr.message)
          setIsLoading(false)
          return
        }
        const filas = (data ?? []) as InsumoMezclaRow[]
        setInsumos(filas)
        // Lo ya registrado se muestra tal cual, para poder corregirlo; la
        // precarga (venida del Δ de la hoja de proceso) tiene prioridad.
        const init: Record<string, string> = {}
        for (const f of filas) {
          const pre = precarga?.[f.insumo_id]
          if (pre != null && pre > 0) init[f.insumo_id] = String(Math.round(pre * 100) / 100)
          else if (f.sobrante_actual > 0) init[f.insumo_id] = String(f.sobrante_actual)
          else init[f.insumo_id] = ""
        }
        setValores(init)
        setIsLoading(false)
      })
  }, [open, ordenMezclaId, supabase, precarga])

  async function handleGuardar() {
    if (!ordenMezclaId) return
    setError(null)
    setSaving(true)

    // Se envían también los ceros: es como se borra un sobrante registrado por
    // error ("al final no sobró nada").
    const items = insumos.map((f) => ({
      insumo_id: f.insumo_id,
      cantidad_cocido: valores[f.insumo_id]?.trim() ? Number(valores[f.insumo_id]) : 0,
    }))

    if (items.some((i) => !Number.isFinite(i.cantidad_cocido) || i.cantidad_cocido < 0)) {
      setError("Las cantidades deben ser números mayores o iguales a cero.")
      setSaving(false)
      return
    }

    const res = await fetch("/api/inventario/produccion/sobrantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "registrar", orden_mezcla_id: ordenMezclaId, items }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(json.error ?? "No se pudo registrar el sobrante.")
      return
    }

    toast.success("Sobrante registrado. Se descontará de la próxima orden.")
    onSaved()
    onOpenChange(false)
  }

  const totalRegistrado = insumos.reduce((acc, f) => {
    const v = Number(valores[f.insumo_id] ?? 0)
    return acc + (Number.isFinite(v) ? v : 0)
  }, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sobró producto — {dietaNombre}</SheetTitle>
          <SheetDescription>
            Indica cuánto sobró de cada insumo, en peso cocido. El sistema lo convierte a crudo
            con el factor de cada insumo y lo descuenta de lo que hay que cocinar en la
            siguiente orden de producción. Deja en blanco (o en cero) lo que no sobró.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 py-2 px-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : insumos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Esta dieta no tiene materias primas en su receta.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 text-xs text-muted-foreground px-1">
                <span>Insumo</span>
                <span>Sobró (cocido)</span>
                <span>Equivale en crudo</span>
              </div>
              {insumos.map((f) => {
                const cocido = Number(valores[f.insumo_id] ?? 0)
                const crudo =
                  Number.isFinite(cocido) && cocido > 0
                    ? crudoDesdeCocido(cocido, {
                        merma_pct: f.merma_pct,
                        rendimiento_pct: f.rendimiento_pct,
                      })
                    : null
                return (
                  <div key={f.insumo_id} className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-center">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{f.insumo_nombre}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Requerido: {f.cocido_requerido?.toLocaleString("es-CO", { maximumFractionDigits: 2 }) ?? "—"}{" "}
                        {f.unidad_medida} · factor{" "}
                        {f.factor_conversion?.toLocaleString("es-CO", { maximumFractionDigits: 3 }) ?? "—"}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 text-sm"
                      placeholder="0"
                      value={valores[f.insumo_id] ?? ""}
                      onChange={(e) =>
                        setValores((p) => ({ ...p, [f.insumo_id]: e.target.value }))
                      }
                    />
                    <Input
                      disabled
                      className="h-9 text-sm text-muted-foreground"
                      placeholder="Auto"
                      value={
                        crudo != null
                          ? `${crudo.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${f.unidad_medida}`
                          : ""
                      }
                    />
                  </div>
                )
              })}

              <Label className="text-xs text-muted-foreground pt-2 block">
                Total a registrar: {totalRegistrado.toLocaleString("es-CO", { maximumFractionDigits: 2 })} (cocido)
              </Label>
            </>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={saving || isLoading || insumos.length === 0}>
            {saving ? "Guardando..." : "Registrar sobrante"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
