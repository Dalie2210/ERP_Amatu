"use client"

/**
 * Reusable, theme-aware chart primitives for the inventory dashboard.
 *
 * Series colors come from the dataviz validated categorical palette (fixed order,
 * CVD-safe adjacent pairs) — NOT from the brand purple/yellow `--chart-*` tokens,
 * which have poor colorblind separation. Axis/grid/text use theme CSS variables so
 * they adapt to light/dark.
 */

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts"

// dataviz validated categorical palette (light-surface steps), assigned in fixed order.
export const CHART_COLORS = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  yellow: "#eda100",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
  magenta: "#e87ba4",
  orange: "#eb6834",
} as const

export const CHART_SERIES = [
  CHART_COLORS.blue,
  CHART_COLORS.aqua,
  CHART_COLORS.yellow,
  CHART_COLORS.violet,
  CHART_COLORS.orange,
  CHART_COLORS.magenta,
  CHART_COLORS.green,
  CHART_COLORS.red,
] as const

// Signed movement palette (diverging): entries good, exits critical.
export const CHART_GOOD = "#0ca30c"
export const CHART_BAD = "#d03b3b"

const AXIS = "var(--muted-foreground)"
const GRID = "var(--border)"

const axisTick = { fontSize: 11, fill: AXIS }

interface ChartFrameProps {
  title: string
  description?: string
  action?: ReactNode
  height?: number
  isEmpty?: boolean
  emptyLabel?: string
  children: ReactNode
}

/** Card shell around a chart, with a title and consistent height. */
export function ChartFrame({
  title,
  description,
  action,
  height = 260,
  isEmpty,
  emptyLabel = "Sin datos para graficar",
  children,
}: ChartFrameProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyLabel}
          </div>
        ) : (
          <div style={{ width: "100%", height }}>{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

interface TooltipDatum {
  label: string
  value: number
}

function themedTooltip(formatter: (v: number) => string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: TooltipDatum & { color?: string; name?: string }, i: number) => (
          <div key={i} className="flex items-center gap-2 text-muted-foreground">
            {p.color && (
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            )}
            <span>{p.name ?? p.label}:</span>
            <span className="font-medium text-foreground tabular-nums">{formatter(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }
}

export interface BarDatum {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: BarDatum[]
  /** Single hue when comparing one measure across categories; per-bar color only for identity. */
  color?: string
  horizontal?: boolean
  valueFormatter?: (v: number) => string
  showLabels?: boolean
}

/** Bar chart for magnitude across categories. Single-hue by default (correct for one measure). */
export function SimpleBarChart({
  data,
  color = CHART_COLORS.blue,
  horizontal = false,
  valueFormatter = (v) => v.toLocaleString("es-CO", { maximumFractionDigits: 0 }),
  showLabels = false,
}: SimpleBarChartProps) {
  const Tip = themedTooltip(valueFormatter)
  return (
    <ResponsiveContainer width="100%" height="100%">
      {horizontal ? (
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={130} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<Tip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? color} />
            ))}
            {showLabels && (
              <LabelList dataKey="value" position="right" formatter={(v) => valueFormatter(Number(v))} style={{ fontSize: 11, fill: "var(--foreground)" }} />
            )}
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 60 : 30} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={valueFormatter} width={48} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<Tip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? color} />
            ))}
            {showLabels && (
              <LabelList dataKey="value" position="top" formatter={(v) => valueFormatter(Number(v))} style={{ fontSize: 11, fill: "var(--foreground)" }} />
            )}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

interface SimpleLineChartProps {
  data: BarDatum[]
  color?: string
  valueFormatter?: (v: number) => string
}

/** Single-series line for change-over-time (one axis, one hue). */
export function SimpleLineChart({
  data,
  color = CHART_COLORS.blue,
  valueFormatter = (v) => v.toLocaleString("es-CO", { maximumFractionDigits: 0 }),
}: SimpleLineChartProps) {
  const Tip = themedTooltip(valueFormatter)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={valueFormatter} width={56} />
        <Tooltip cursor={{ stroke: GRID }} content={<Tip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
