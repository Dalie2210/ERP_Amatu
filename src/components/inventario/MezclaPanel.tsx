"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Blend, RotateCcw, PackageMinus } from "lucide-react"
import { toast } from "sonner"
import type {
  OrdenProduccionItemExpanded,
  OrdenMezclaExpanded,
  DesglosePresentacion,
  ConfigProduccion,
  PlanMezclasGuardado,
  GrupoMezclaSugerido,
} from "@/types"
import type { Json } from "@/types/database.types"
import {
  PORCION_ESTANDAR_G,
  formatGramaje,
  sugerirDesglose,
  sumaKgDesglose,
  planMezclas,
  evaluarFusiones,
  type PresentacionAjuste,
  type SugerenciaAjuste,
} from "@/lib/inventario/mezcla"
import { PlanMezclasCard } from "@/components/inventario/PlanMezclasCard"
import { SobrantePanel } from "@/components/inventario/SobrantePanel"
import { useConfigProduccion } from "@/hooks/useConfigProduccion"

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
  mezcla_min_g: "Mínimo de mezcla (g)",
  mezcla_max_g: "Máximo de mezcla (g)",
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

// Snapshot auditable del plan aplicado a una dieta: qué límites regían, en
// cuántas mezclas se dividió y cuánto residuo quedó.
function planGuardado(
  r: OrdenMezclaExpanded,
  config: ConfigProduccion | null
): PlanMezclasGuardado | null {
  const porcionG = r.porcion_estandar || config?.porcion_estandar_g || PORCION_ESTANDAR_G
  const minG = r.mezcla_min_g ?? config?.mezcla_min_g ?? 0
  const maxG = r.mezcla_max_g ?? config?.mezcla_max_g ?? 0
  if (r.total_gramos == null || minG <= 0 || maxG <= 0) return null

  const plan = planMezclas({
    totalGramos: r.total_gramos,
    porcionG,
    minG,
    maxG,
    duracionMezclaMin: config?.duracion_mezcla_min ?? 0,
    toleranciaG: config?.tolerancia_ajuste_g ?? 0,
  })
  if (!plan.factible) return null

  return {
    porciones_totales: plan.porcionesTotales,
    num_mezclas: r.num_mezclas ?? plan.numMezclas,
    mezclas: plan.mezclas,
    min_g: minG,
    max_g: maxG,
    porcion_estandar_g: porcionG,
    ajuste_g: plan.ajusteG,
    generado_en: new Date().toISOString(),
  }
}

// Presentaciones disponibles para cuadrar el residuo. El tope al QUITAR es lo
// que hay planificado: sin él se sugerirían retiros imposibles.
function presentacionesAjuste(desglose: DesglosePresentacion[]): PresentacionAjuste[] {
  return desglose
    .filter((d) => d.gramaje > 0)
    .map((d) => ({
      presentacion: d.presentacion,
      gramajeG: d.gramaje,
      maxUnidades: d.unidades,
    }))
}

// Resume un desglose como "300g×10, 500g×5" para el historial (legible, no JSON).
function resumirDesglose(desglose: DesglosePresentacion[] | null): string | null {
  if (!desglose || desglose.length === 0) return null
  return desglose.map((d) => `${d.presentacion}×${d.unidades}`).join(", ")
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
    const antesDesglose = resumirDesglose(orig.desglose_presentaciones)
    const despuesDesglose = resumirDesglose(r.desglose_presentaciones)
    if (antesDesglose !== despuesDesglose) {
      cambios.push({
        entidad: r.producto?.nombre ?? "—",
        campo: "desglose_presentaciones",
        campo_label: "Desglose de presentaciones",
        anterior: antesDesglose,
        nuevo: despuesDesglose,
      })
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
  const { config } = useConfigProduccion()

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

  // Rellena el desglose por presentación si aún no se ha guardado uno (fila
  // recién generada): lo sugiere escalando el mix planificado al nº de
  // mezclas ya fijado (o sugerido, si el final aún no se ha diligenciado).
  function hidratar(lista: OrdenMezclaExpanded[]): OrdenMezclaExpanded[] {
    return lista.map((m) => {
      if (m.desglose_presentaciones && m.desglose_presentaciones.length > 0) return m
      const porciones = porcionesPorDieta.get(m.producto_id) ?? []
      return {
        ...m,
        desglose_presentaciones: sugerirDesglose(porciones, m.num_mezclas ?? m.num_mezclas_sugerido),
      }
    })
  }

  const [rows, setRows] = useState<OrdenMezclaExpanded[]>(() => hidratar(mezclas))
  // Snapshot de la hoja de mezcla tal como se cargó, para poder calcular el
  // diff (qué cambió, valor anterior/nuevo) al guardar.
  const [original, setOriginal] = useState<OrdenMezclaExpanded[]>(() => hidratar(mezclas))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  // Dieta cuyo panel de sobrantes está abierto (ERP-PROD-01).
  const [sobranteDe, setSobranteDe] = useState<{ id: string; nombre: string } | null>(null)
  // Firmas de receta por dieta, para detectar cuáles pueden mezclarse juntas.
  const [firmas, setFirmas] = useState<GrupoMezclaSugerido[]>([])
  const [agrupando, setAgrupando] = useState(false)

  useEffect(() => {
    let cancelado = false
    supabase.rpc("fn_sugerir_grupos_mezcla", { p_orden_id: ordenId }).then(({ data }) => {
      if (!cancelado) setFirmas((data ?? []) as unknown as GrupoMezclaSugerido[])
    })
    return () => { cancelado = true }
  }, [supabase, ordenId])

  // Fusiones que el sistema propone por sí solo: solo las que ahorran mezclas
  // sin empeorar el desperdicio, o las que rescatan una dieta que no llega al
  // mínimo. Nunca se aplican solas.
  const fusiones = useMemo(() => {
    if (!config || firmas.length < 2) return []
    const yaAgrupados = new Set(rows.filter((r) => r.grupo_id).map((r) => r.producto_id))
    const candidatos = firmas
      .filter((f) => !yaAgrupados.has(f.producto_id))
      .map((f) => ({
        productoId: f.producto_id,
        totalGramos: f.total_gramos ?? 0,
        firma: f.firma,
      }))
    return evaluarFusiones(candidatos, {
      porcionG: config.porcion_estandar_g,
      minG: config.mezcla_min_g,
      maxG: config.mezcla_max_g,
      duracionMezclaMin: config.duracion_mezcla_min,
      toleranciaG: config.tolerancia_ajuste_g,
    }).filter((e) => e.conviene)
  }, [config, firmas, rows])

  const nombrePorProducto = useMemo(
    () => new Map(firmas.map((f) => [f.producto_id, f.producto_nombre])),
    [firmas]
  )

  // Se envía el estado completo de agrupación deseado, no una operación suelta:
  // así el servidor no depende de una secuencia que pueda desincronizarse.
  async function guardarGrupos(grupos: string[][]) {
    setAgrupando(true)
    const { error } = await supabase.rpc("fn_agrupar_mezclas", {
      p_orden_id: ordenId,
      p_grupos: grupos.map((producto_ids) => ({ producto_ids })),
    })
    setAgrupando(false)
    if (error) {
      toast.error("No se pudo cambiar la agrupación: " + error.message)
      return
    }
    await onLog({ tipo_evento: "mezcla_agrupada", grupos: grupos.length })
    toast.success("Agrupación de mezclas actualizada.")
    onSaved()
  }

  /** Agrupación vigente, indexada por grupo_id. */
  function gruposActuales(): Map<string, string[]> {
    const map = new Map<string, string[]>()
    for (const r of rows) {
      if (!r.grupo_id) continue
      map.set(r.grupo_id, [...(map.get(r.grupo_id) ?? []), r.producto_id])
    }
    return map
  }

  function combinar(productoIds: string[]) {
    void guardarGrupos([...gruposActuales().values(), productoIds])
  }

  function separar(grupoId: string) {
    const grupos = gruposActuales()
    grupos.delete(grupoId)
    void guardarGrupos([...grupos.values()])
  }
  // Referencia de la última prop `mezclas` procesada, para detectar cuándo el
  // padre recargó datos frescos (carga inicial y tras guardar) y resincronizar
  // durante el render, sin pisar ediciones locales en curso.
  const [prevMezclas, setPrevMezclas] = useState(mezclas)
  if (mezclas !== prevMezclas) {
    setPrevMezclas(mezclas)
    const hidratadas = hidratar(mezclas)
    setRows(hidratadas)
    setOriginal(hidratadas)
    setDirty(false)
  }

  const editable = canEdit && !bloqueado

  // Al fijar/ajustar el nº de mezclas final, re-sugiere el desglose por
  // presentación escalando proporcionalmente el mix planificado (pisa
  // cualquier ajuste manual previo en esa fila; ver `resetDesglose` para
  // volver a pedirlo explícitamente y el input de unidades para editar a mano
  // sin volver a tocar el nº de mezclas).
  function updateNumMezclas(id: string, valor: string) {
    const num = valor.trim() === "" ? null : Number(valor)
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const porciones = porcionesPorDieta.get(r.producto_id) ?? []
        return { ...r, num_mezclas: num, desglose_presentaciones: sugerirDesglose(porciones, num) }
      })
    )
    setDirty(true)
  }
  // Edición manual de las unidades de una presentación puntual del desglose.
  function updateUnidadDesglose(id: string, presentacion: string, valor: string) {
    const unidades = valor.trim() === "" ? 0 : Number(valor)
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id || !r.desglose_presentaciones) return r
        return {
          ...r,
          desglose_presentaciones: r.desglose_presentaciones.map((d) =>
            d.presentacion === presentacion
              ? { ...d, unidades: Number.isFinite(unidades) ? unidades : 0 }
              : d
          ),
        }
      })
    )
    setDirty(true)
  }
  // Descarta ajustes manuales y vuelve a pedir la sugerencia automática
  // (escalado proporcional del mix planificado al nº de mezclas actual).
  function resetDesglose(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const porciones = porcionesPorDieta.get(r.producto_id) ?? []
        return {
          ...r,
          desglose_presentaciones: sugerirDesglose(porciones, r.num_mezclas ?? r.num_mezclas_sugerido),
        }
      })
    )
    setDirty(true)
  }
  // Overrides de capacidad para esta orden (null = usa la configuración).
  function updateLimites(id: string, min: number | null, max: number | null) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              mezcla_min_g: min != null && Number.isFinite(min) ? min : null,
              mezcla_max_g: max != null && Number.isFinite(max) ? max : null,
            }
          : r
      )
    )
    setDirty(true)
  }

  // Aplica una sugerencia de ajuste (ERP-PROD-06) sumando o restando unidades
  // sobre el desglose existente. No se deja bajar de cero: la sugerencia de
  // "quitar" ya viene acotada por lo planificado, pero el desglose pudo cambiar
  // a mano entre que se calculó y que se pulsó el botón.
  function aplicarSugerencia(id: string, s: SugerenciaAjuste) {
    const signo = s.direccion === "agregar" ? 1 : -1
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id || !r.desglose_presentaciones) return r
        return {
          ...r,
          desglose_presentaciones: r.desglose_presentaciones.map((d) => {
            const u = s.unidades.find((x) => x.gramajeG === d.gramaje)
            if (!u) return d
            return { ...d, unidades: Math.max(0, d.unidades + signo * u.n) }
          }),
        }
      })
    )
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
      // Se congela el plan con los límites que regían al guardar: si mañana
      // cambia la mezcladora, la hoja de esta orden debe seguir explicando por
      // qué se dividió como se dividió.
      plan_mezclas: planGuardado(r, config) as unknown as Json,
      id: r.id,
      orden_id: r.orden_id,
      producto_id: r.producto_id,
      total_gramos: r.total_gramos,
      num_mezclas_sugerido: r.num_mezclas_sugerido,
      num_mezclas: r.num_mezclas,
      porcion_estandar: r.porcion_estandar,
      config_produccion_id: r.config_produccion_id,
      mezcla_min_g: r.mezcla_min_g,
      mezcla_max_g: r.mezcla_max_g,
      desglose_presentaciones: r.desglose_presentaciones as unknown as Json,
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
          El sistema propone la división en el menor número de mezclas posible, respetando la
          capacidad de la mezcladora y dejando cada mezcla en múltiplos de{" "}
          {formatGramaje(config?.porcion_estandar_g ?? PORCION_ESTANDAR_G)}. Las mezclas no tienen
          que ser todas del mismo tamaño. Puedes fijar el número final a mano, ajustar los límites
          solo para esta orden y editar las unidades por presentación. Registra las firmas de
          trazabilidad.
        </p>
        {editable && (
          <Button onClick={handleGuardar} disabled={saving || !dirty} className="gap-2 shrink-0">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}
      </div>

      {/* Sugerencias de combinación entre dietas con la misma receta */}
      {fusiones.map((f) => (
        <div
          key={f.firma}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
        >
          <div className="flex items-start gap-2">
            <Blend className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <p>
                <strong>
                  {f.productoIds.map((id) => nombrePorProducto.get(id) ?? "—").join(" y ")}
                </strong>{" "}
                comparten receta: pueden mezclarse juntas.
              </p>
              <p className="text-xs text-muted-foreground">{f.motivo}</p>
            </div>
          </div>
          {editable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={agrupando}
              onClick={() => combinar(f.productoIds)}
            >
              <Blend className="h-3.5 w-3.5" />
              Combinar
            </Button>
          )}
        </div>
      ))}

      <div className="grid gap-4">
        {rows.map((r) => {
          const desglose = r.desglose_presentaciones ?? []
          const targetKg = r.num_mezclas != null ? (r.num_mezclas * r.porcion_estandar) / 1000 : null
          const actualKg = sumaKgDesglose(desglose)
          const deltaKg = targetKg != null ? actualKg - targetKg : null
          const deltaSignificativo = deltaKg != null && Math.abs(deltaKg) > 0.5
          return (
            <div key={r.id} className="border rounded-lg bg-white p-4 space-y-4">
              {/* Encabezado de la dieta */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">{r.producto?.nombre ?? "—"}</h3>
                  {r.grupo_id && (
                    <>
                      <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 flex items-center gap-1">
                        <Blend className="h-3 w-3" />
                        Mezcla combinada con{" "}
                        {rows
                          .filter((o) => o.grupo_id === r.grupo_id && o.id !== r.id)
                          .map((o) => o.producto?.nombre ?? "—")
                          .join(", ")}
                      </span>
                      {editable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px] text-muted-foreground"
                          disabled={agrupando}
                          onClick={() => separar(r.grupo_id!)}
                        >
                          Separar
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    Total requerido:{" "}
                    <span className="font-medium text-foreground">{formatGramaje(r.total_gramos)}</span>
                  </div>
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setSobranteDe({ id: r.id, nombre: r.producto?.nombre ?? "—" })}
                    >
                      <PackageMinus className="h-3.5 w-3.5" />
                      Sobró producto
                    </Button>
                  )}
                </div>
              </div>

              {/* Plan de división en mezclas + ajuste a múltiplo de la porción */}
              <PlanMezclasCard
                totalGramos={r.total_gramos}
                porcionEstandar={r.porcion_estandar || PORCION_ESTANDAR_G}
                minG={r.mezcla_min_g ?? config?.mezcla_min_g ?? 0}
                maxG={r.mezcla_max_g ?? config?.mezcla_max_g ?? 0}
                duracionMezclaMin={config?.duracion_mezcla_min ?? 0}
                toleranciaG={config?.tolerancia_ajuste_g ?? 0}
                overrideMinG={r.mezcla_min_g}
                overrideMaxG={r.mezcla_max_g}
                numMezclas={r.num_mezclas}
                presentaciones={presentacionesAjuste(desglose)}
                editable={editable}
                onNumMezclasChange={(v) => updateNumMezclas(r.id, v)}
                onLimitesChange={(min, max) => updateLimites(r.id, min, max)}
                onAplicarSugerencia={(s) => aplicarSugerencia(r.id, s)}
              />

              {/* Desglose de unidades por presentación */}
              {desglose.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Unidades a empacar por presentación
                    </Label>
                    {editable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs text-muted-foreground"
                        onClick={() => resetDesglose(r.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restablecer sugerido
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {desglose.map((d) => (
                      <div key={d.presentacion}>
                        <Label htmlFor={`ud-${r.id}-${d.presentacion}`} className="text-[11px] text-muted-foreground">
                          {d.presentacion} (plan.: {d.unidades_planificadas.toLocaleString("es-CO")})
                        </Label>
                        {/*
                          Input nativo (no el wrapper de Field.Control): ese wrapper decide si
                          el campo es controlado en su PRIMER render y lo deja fijo para
                          siempre (useControlled con useRef). Con un array dinámico como este,
                          una instancia que alguna vez montó sin `value` definido queda pegada en
                          modo no controlado y ya no vuelve a reflejar cambios de estado. Un
                          <input> nativo controlado evita ese riesgo por completo.
                        */}
                        <input
                          id={`ud-${r.id}-${d.presentacion}`}
                          type="number"
                          className="mt-0.5 h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={d.unidades}
                          disabled={!editable}
                          onChange={(e) => updateUnidadDesglose(r.id, d.presentacion, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs ${deltaSignificativo ? "text-amber-600" : "text-muted-foreground"}`}>
                    Total empacado: {actualKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg
                    {targetKg != null && (
                      <>
                        {" "}vs. {targetKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg de mezclas fijadas
                        {deltaSignificativo && (
                          <> (diferencia de {deltaKg!.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg)</>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}

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

      <SobrantePanel
        open={sobranteDe !== null}
        onOpenChange={(v) => { if (!v) setSobranteDe(null) }}
        ordenMezclaId={sobranteDe?.id ?? null}
        dietaNombre={sobranteDe?.nombre ?? ""}
        onSaved={() => {
          void onLog({ tipo_evento: "sobrante_registrado", dieta: sobranteDe?.nombre ?? null })
          onSaved()
        }}
      />
    </div>
  )
}
