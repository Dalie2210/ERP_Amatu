// Builds a plain-text WhatsApp message listing all insumos below their minimum
// stock, for restocking to be requested manually via WhatsApp.

import { TIPO_INSUMO_LABELS } from "@/lib/constants/labels"
import type { TipoInsumo, UnidadMedida } from "@/types"

export interface InsumoBajoMinimoInfo {
  nombre: string
  tipo: TipoInsumo
  unidad_medida: UnidadMedida
  stock_disponible: number
  stock_minimo: number
}

function formatFechaHoy(): string {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  })
}

export function buildMensajeBajoMinimo(insumos: InsumoBajoMinimoInfo[]): string {
  const lines: string[] = []

  lines.push(`📦 *Insumos bajo mínimo* — ${formatFechaHoy()}`)
  lines.push(`Total: ${insumos.length} insumo${insumos.length !== 1 ? "s" : ""}`)

  insumos.forEach((i, idx) => {
    const tipo = TIPO_INSUMO_LABELS[i.tipo] ?? i.tipo
    lines.push("")
    lines.push(`*${idx + 1}.* ${i.nombre} (${tipo})`)
    lines.push(`Stock: ${i.stock_disponible.toLocaleString("es-CO")} ${i.unidad_medida} — Mínimo: ${i.stock_minimo.toLocaleString("es-CO")} ${i.unidad_medida}`)
  })

  return lines.join("\n")
}
