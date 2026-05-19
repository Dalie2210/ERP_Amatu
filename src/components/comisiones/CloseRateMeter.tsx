"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const TIERS = [
  { label: "0% – 2.9%", min: 0, max: 2.9, color: "bg-slate-300", textColor: "text-slate-600", rates: [5, 8, 0, 0, 0] },
  { label: "3% – 3.9%", min: 3, max: 3.9, color: "bg-amber-400", textColor: "text-amber-700", rates: [10, 18, 10, 0, 0] },
  { label: "4% – 5.5%", min: 4, max: 5.5, color: "bg-orange-400", textColor: "text-orange-700", rates: [15, 25, 15, 15, 0] },
  { label: "5.6% – 8%", min: 5.6, max: 8, color: "bg-emerald-500", textColor: "text-emerald-700", rates: [18, 30, 18, 18, 18] },
]

const TOTAL_RANGE = 8

interface CloseRateMeterProps {
  totalLeads: number
  totalCierres: number
  pctCierre: number
  rangoLabel: string
}

export function CloseRateMeter({ totalLeads, totalCierres, pctCierre, rangoLabel }: CloseRateMeterProps) {
  const clampedPct = Math.min(pctCierre, TOTAL_RANGE)
  const markerLeft = `${(clampedPct / TOTAL_RANGE) * 100}%`

  const currentTierIdx = TIERS.findIndex(
    (t) => pctCierre >= t.min && pctCierre <= t.max
  )
  const nextTier = TIERS[currentTierIdx + 1]

  const closuresNeededForNext = nextTier && totalLeads > 0
    ? Math.ceil(nextTier.min / 100 * totalLeads) - totalCierres
    : null

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Stats row */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Leads:</span>
            <span className="font-semibold tabular-nums">{totalLeads}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Cierres:</span>
            <span className="font-semibold tabular-nums">{totalCierres}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">% Cierre:</span>
            <span className={cn("font-bold tabular-nums", currentTierIdx >= 2 ? "text-emerald-600" : currentTierIdx === 1 ? "text-amber-600" : "text-slate-600")}>
              {pctCierre.toFixed(1)}%
            </span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Rango actual: <span className="font-medium text-foreground">{rangoLabel}</span>
          </div>
        </div>

        {/* Tier bar */}
        <div className="relative">
          <div className="flex rounded-full overflow-hidden h-5 gap-0.5">
            {TIERS.map((tier, i) => {
              const width = ((tier.max - tier.min) / TOTAL_RANGE) * 100
              const isActive = currentTierIdx === i
              return (
                <Tooltip key={tier.label}>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        "relative h-5 cursor-pointer transition-opacity",
                        tier.color,
                        isActive ? "opacity-100 ring-2 ring-offset-1 ring-current" : "opacity-50 hover:opacity-75"
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs space-y-1 p-3 max-w-[180px]">
                    <p className="font-semibold">{tier.label}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                      {["V2","V3","V4","V5","V6"].map((v, vi) => (
                        <span key={v}>{v}: <span className="text-foreground font-medium">{tier.rates[vi]}%</span></span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {/* Position marker */}
          <div
            className="absolute -top-1 w-3 h-7 -translate-x-1/2 pointer-events-none"
            style={{ left: markerLeft }}
          >
            <div className="w-0.5 h-full bg-foreground mx-auto rounded-full shadow-sm" />
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full shadow" />
          </div>
        </div>

        {/* Tier labels */}
        <div className="flex text-[10px] text-muted-foreground">
          {TIERS.map((tier) => {
            const width = ((tier.max - tier.min) / TOTAL_RANGE) * 100
            return (
              <div key={tier.label} className="truncate text-center" style={{ width: `${width}%` }}>
                {tier.label}
              </div>
            )
          })}
        </div>

        {/* Next tier hint */}
        {closuresNeededForNext !== null && closuresNeededForNext > 0 && (
          <p className="text-xs text-muted-foreground">
            Faltan <span className="font-semibold text-foreground">{closuresNeededForNext} cierres</span> para alcanzar el rango <span className="font-medium">{nextTier.label}</span>
          </p>
        )}
        {nextTier && closuresNeededForNext !== null && closuresNeededForNext <= 0 && (
          <p className="text-xs text-emerald-600 font-medium">¡Ya alcanzas el rango {nextTier.label}!</p>
        )}
        {totalLeads === 0 && (
          <p className="text-xs text-muted-foreground">Registra leads de Meta Ads para calcular tu rango de cierre.</p>
        )}
      </div>
    </TooltipProvider>
  )
}
