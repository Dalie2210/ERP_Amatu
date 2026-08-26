"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Clock, Settings2, Wand2 } from "lucide-react"
import {
  planMezclas,
  sugerirAjuste,
  formatGramaje,
  type PresentacionAjuste,
  type SugerenciaAjuste,
} from "@/lib/inventario/mezcla"

interface Props {
  totalGramos: number | null
  porcionEstandar: number
  /** Límites efectivos (override de la orden, o los de la configuración). */
  minG: number
  maxG: number
  duracionMezclaMin: number
  toleranciaG: number
  /** Si la orden tiene overrides propios, para mostrarlos como tales. */
  overrideMinG: number | null
  overrideMaxG: number | null
  numMezclas: number | null
  presentaciones: PresentacionAjuste[]
  editable: boolean
  onNumMezclasChange: (valor: string) => void
  onLimitesChange: (min: number | null, max: number | null) => void
  onAplicarSugerencia: (s: SugerenciaAjuste) => void
}

export function PlanMezclasCard({
  totalGramos,
  porcionEstandar,
  minG,
  maxG,
  duracionMezclaMin,
  toleranciaG,
  overrideMinG,
  overrideMaxG,
  numMezclas,
  presentaciones,
  editable,
  onNumMezclasChange,
  onLimitesChange,
  onAplicarSugerencia,
}: Props) {
  const [mostrarLimites, setMostrarLimites] = useState(false)

  const plan = useMemo(
    () =>
      planMezclas({
        totalGramos: totalGramos ?? 0,
        porcionG: porcionEstandar,
        minG,
        maxG,
        duracionMezclaMin,
        toleranciaG,
      }),
    [totalGramos, porcionEstandar, minG, maxG, duracionMezclaMin, toleranciaG]
  )

  // El residuo se corrige moviendo unidades reales. Al QUITAR solo se puede
  // tocar lo que está planificado (el tope que trae `presentaciones`); al
  // AGREGAR no hay tope, así que se descarta para no limitar las sugerencias.
  const sugerencias = useMemo(() => {
    if (plan.ajusteG === 0 || Math.abs(plan.ajusteG) <= toleranciaG) return []
    const disponibles: PresentacionAjuste[] =
      plan.ajusteG > 0
        ? presentaciones.map(({ presentacion, gramajeG }) => ({ presentacion, gramajeG }))
        : presentaciones
    return sugerirAjuste({ ajusteG: plan.ajusteG, presentaciones: disponibles })
  }, [plan.ajusteG, presentaciones, toleranciaG])

  const desbalance = Math.abs(plan.ajusteG) > toleranciaG

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Plan sugerido</Label>
          {plan.factible ? (
            <>
              <div className="text-2xl font-bold tabular-nums leading-tight">
                {plan.numMezclas} mezcla{plan.numMezclas === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground">
                {plan.mezclas.map((m) => m.porciones).join(" + ")} porciones ={" "}
                {plan.mezclas
                  .map((m) => formatGramaje(m.gramos))
                  .filter((g, i, arr) => arr.indexOf(g) === i)
                  .join(" / ")}
              </div>
            </>
          ) : (
            <div className="text-sm font-medium text-destructive">No se puede planificar</div>
          )}
        </div>

        {plan.factible && duracionMezclaMin > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
            <Clock className="h-3.5 w-3.5" />
            ≈ {plan.tiempoEstimadoMin} min de mezclado
          </div>
        )}

        <div className="w-40">
          <Label htmlFor="nm-final" className="text-xs">
            N.º de mezclas (final)
          </Label>
          <Input
            id="nm-final"
            type="number"
            className="mt-1"
            placeholder={plan.factible ? String(plan.numMezclas) : "—"}
            value={numMezclas ?? ""}
            disabled={!editable}
            onChange={(e) => onNumMezclasChange(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground"
          onClick={() => setMostrarLimites((v) => !v)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Límites: {formatGramaje(minG)} – {formatGramaje(maxG)}
          {(overrideMinG != null || overrideMaxG != null) && " (ajustados)"}
        </Button>
      </div>

      {mostrarLimites && (
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          <div className="w-36">
            <Label className="text-[11px] text-muted-foreground">Mínimo (g)</Label>
            <Input
              type="number"
              className="mt-0.5 h-8 text-sm"
              placeholder={String(minG)}
              value={overrideMinG ?? ""}
              disabled={!editable}
              onChange={(e) =>
                onLimitesChange(
                  e.target.value.trim() === "" ? null : Number(e.target.value),
                  overrideMaxG
                )
              }
            />
          </div>
          <div className="w-36">
            <Label className="text-[11px] text-muted-foreground">Máximo (g)</Label>
            <Input
              type="number"
              className="mt-0.5 h-8 text-sm"
              placeholder={String(maxG)}
              value={overrideMaxG ?? ""}
              disabled={!editable}
              onChange={(e) =>
                onLimitesChange(
                  overrideMinG,
                  e.target.value.trim() === "" ? null : Number(e.target.value)
                )
              }
            />
          </div>
          <p className="text-[11px] text-muted-foreground pb-2 flex-1 min-w-48">
            Vacío = usa la capacidad configurada de la mezcladora. Sobrescríbelo solo para
            esta orden.
          </p>
        </div>
      )}

      {!plan.factible && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            {plan.motivo === "menor_al_minimo" && (
              <>
                El total no llega al mínimo de la mezcladora: faltan{" "}
                <strong>{plan.porcionesFaltantes}</strong> porción
                {plan.porcionesFaltantes === 1 ? "" : "es"} (
                {formatGramaje((plan.porcionesFaltantes ?? 0) * porcionEstandar)}). Puedes
                combinar esta dieta con otra de la misma receta, subir la producción o ajustar
                el mínimo para esta orden.
              </>
            )}
            {plan.motivo === "sin_particion_factible" &&
              "No hay forma de repartir este total respetando el mínimo y el máximo. Ajusta los límites de esta orden."}
            {plan.motivo === "limites_invalidos" &&
              "Los límites de mezcla no son válidos (el máximo debe ser mayor o igual que el mínimo y que una porción)."}
            {plan.motivo === "sin_producto" &&
              "Esta dieta no tiene gramos planificados. Verifica que sus presentaciones tengan gramaje."}
          </div>
        </div>
      )}

      {desbalance && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              El total no es múltiplo exacto de {formatGramaje(porcionEstandar)}:{" "}
              {plan.ajusteG > 0 ? "faltan" : "sobran"}{" "}
              <strong>{formatGramaje(Math.abs(plan.ajusteG))}</strong>.
              {sugerencias.length > 0 && " Para cuadrar:"}
            </div>
          </div>
          {sugerencias.length > 0 && (
            <ul className="space-y-1 pl-6">
              {sugerencias.map((s, i) => (
                <li key={i} className="flex items-center gap-2 flex-wrap">
                  <span>
                    {s.direccion === "agregar" ? "Agregar" : "Quitar"} {s.texto}
                    {s.sobraG !== 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        (queda {formatGramaje(Math.abs(s.sobraG))} sin cuadrar)
                      </span>
                    )}
                  </span>
                  {editable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 text-[11px]"
                      onClick={() => onAplicarSugerencia(s)}
                    >
                      <Wand2 className="h-3 w-3" />
                      Aplicar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
