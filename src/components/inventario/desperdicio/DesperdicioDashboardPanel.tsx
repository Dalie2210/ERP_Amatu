"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { MotivoDesperdicio } from "@/types"
import { MOTIVO_DESPERDICIO_LABELS } from "@/lib/constants/labels"
import {
  ChartFrame, SimpleBarChart, SimpleLineChart, CHART_COLORS, type BarDatum,
} from "../dashboard/InvChart"
import { formatKg } from "./utils"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function primerDiaDelAno(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
}

interface ResumenRow {
  fecha: string
  motivo: MotivoDesperdicio
  proveedor: string | null
  item_nombre: string | null
  kg: number
  eventos: number
}

const kgFormatter = (v: number) => `${formatKg(v)} kg`

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function DesperdicioDashboardPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [fechaDesde, setFechaDesde] = useState(primerDiaDelAno())
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ResumenRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchResumen = useCallback(async () => {
    setIsLoading(true)
    let query = supabase.from("v_desperdicio_resumen").select("*")
    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)

    const { data, error } = await query
    if (error) {
      toast.error("No se pudo cargar el dashboard de desperdicio")
      console.error(error)
    } else {
      setRows(
        ((data ?? []) as ResumenRow[]).map((r) => ({
          ...r,
          kg: Number(r.kg),
          eventos: Number(r.eventos),
        }))
      )
    }
    setIsLoading(false)
  }, [supabase, fechaDesde, fechaHasta])

  useEffect(() => { void fetchResumen() }, [fetchResumen])

  const { totalKg, totalEventos, porItem, porMotivo, porMes } = useMemo(() => {
    const acumular = (clave: (r: ResumenRow) => string) => {
      const m = new Map<string, number>()
      for (const r of rows) m.set(clave(r), (m.get(clave(r)) ?? 0) + r.kg)
      return m
    }

    const items = [...acumular((r) => r.item_nombre ?? "—")]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map<BarDatum>(([label, value]) => ({ label, value }))

    const motivos = [...acumular((r) => MOTIVO_DESPERDICIO_LABELS[r.motivo] ?? r.motivo)]
      .sort((a, b) => b[1] - a[1])
      .map<BarDatum>(([label, value]) => ({ label, value }))

    // Serie mensual: se ordena por la clave AAAA-MM y se rotula con el mes.
    const meses = [...acumular((r) => r.fecha.slice(0, 7))]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map<BarDatum>(([ym, value]) => {
        const [ano, mes] = ym.split("-")
        return { label: `${MESES[Number(mes) - 1]} ${ano.slice(2)}`, value }
      })

    return {
      totalKg: rows.reduce((acc, r) => acc + r.kg, 0),
      totalEventos: rows.reduce((acc, r) => acc + r.eventos, 0),
      porItem: items,
      porMotivo: motivos,
      porMes: meses,
    }
  }, [rows])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label className="text-sm">Desde</Label>
              <Input type="date" className="w-full sm:w-[160px]" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Hasta</Label>
              <Input type="date" className="w-full sm:w-[160px]" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Alimento perdido" value={`${formatKg(totalKg)} kg`} hint="En el rango seleccionado" />
            <KpiCard label="Eventos registrados" value={totalEventos.toLocaleString("es-CO")} />
            <KpiCard
              label="Motivo más frecuente"
              value={porMotivo[0]?.label ?? "—"}
              hint={porMotivo[0] ? `${formatKg(porMotivo[0].value)} kg` : undefined}
            />
          </div>

          <ChartFrame
            title="Insumos más desperdiciados"
            description="Kilos perdidos por producto en el rango, de mayor a menor."
            height={340}
            isEmpty={porItem.length === 0}
          >
            <SimpleBarChart data={porItem} horizontal color={CHART_COLORS.red} valueFormatter={kgFormatter} showLabels />
          </ChartFrame>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartFrame
              title="Pérdida por motivo"
              description="Para saber si el problema es la cadena de frío, el empaque o el vencimiento."
              isEmpty={porMotivo.length === 0}
            >
              <SimpleBarChart data={porMotivo} color={CHART_COLORS.orange} valueFormatter={kgFormatter} />
            </ChartFrame>

            <ChartFrame
              title="Evolución mensual"
              description="Kilos perdidos por mes, para auditar la pérdida por período."
              isEmpty={porMes.length === 0}
            >
              <SimpleLineChart data={porMes} color={CHART_COLORS.red} valueFormatter={kgFormatter} />
            </ChartFrame>
          </div>
        </>
      )}
    </div>
  )
}
