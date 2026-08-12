import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type { TipoInsumo } from "@/types"
import { TIPO_INSUMO_LABELS, UNIDAD_MEDIDA_LABELS, ESTADO_PT_LABELS } from "@/lib/constants/labels"
import { fetchAll } from "./fetchAll"
import type { ColumnSpec } from "./workbook"

export const ValorizadoFiltersSchema = z.object({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  tipos: z.array(z.enum(["materia_prima", "producto_seco", "aseo", "empaque"])).default([]),
  insumoIds: z.array(z.string().uuid()).default([]),
  proveedores: z.array(z.string()).default([]),
  soloConStock: z.boolean().default(true),
  vencimiento: z.enum(["todos", "vigentes", "por_vencer", "vencidos"]).default("todos"),
  incluirPT: z.boolean().default(true),
})

export type ValorizadoFilters = z.infer<typeof ValorizadoFiltersSchema>

/** Filtros de insumo (tipo/insumo/proveedor) no aplican a PT: incluirla sería engañoso. */
export function shouldIncludePT(filters: ValorizadoFilters): boolean {
  if (!filters.incluirPT) return false
  return filters.tipos.length === 0 && filters.insumoIds.length === 0 && filters.proveedores.length === 0
}

export const INSUMOS_COLUMNS: ColumnSpec[] = [
  { header: "Código", key: "codigo", minWidth: 12 },
  { header: "Nombre", key: "nombre", minWidth: 24 },
  { header: "Lote", key: "lote", minWidth: 14 },
  { header: "Unidad de Medida", key: "unidadMedida", minWidth: 16 },
  { header: "Stock Disponible", key: "stockDisponible", format: "number", minWidth: 14 },
  { header: "Costo Promedio", key: "costoPromedio", format: "currency", minWidth: 14 },
  { header: "Total", key: "total", format: "currency", minWidth: 14 },
]

export const PT_COLUMNS: ColumnSpec[] = [
  ...INSUMOS_COLUMNS,
  { header: "Estado", key: "estado", minWidth: 14 },
]

export const RESUMEN_COLUMNS: ColumnSpec[] = [
  { header: "Categoría", key: "categoria", minWidth: 22 },
  { header: "Ítems", key: "items", format: "integer", minWidth: 10 },
  { header: "Lotes", key: "lotes", format: "integer", minWidth: 10 },
  { header: "Valor Total", key: "valorTotal", format: "currency", minWidth: 16 },
]

export interface InsumoLoteRow {
  codigo: string
  nombre: string
  lote: string
  unidadMedida: string
  stockDisponible: number
  costoPromedio: number
  total: number
  _tipo: TipoInsumo
}

export interface PTLoteRow {
  codigo: string
  nombre: string
  lote: string
  unidadMedida: string
  stockDisponible: number
  costoPromedio: number
  total: number
  estado: string
}

export interface ResumenRow {
  categoria: string
  items: number
  lotes: number
  valorTotal: number
}

function fechaVencimientoRange() {
  const hoy = new Date().toISOString().slice(0, 10)
  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { hoy, en30dias }
}

interface InsumoLoteQueryRow {
  codigo_lote: string
  cantidad_disponible: number
  costo_unitario: number
  proveedor: string | null
  fecha_ingreso: string
  fecha_vencimiento: string | null
  insumos: { codigo: string; nombre: string; tipo: TipoInsumo; unidad_medida: Database["public"]["Enums"]["unidad_medida"] } | null
}

export async function fetchInsumoLotes(
  supabase: SupabaseClient<Database>,
  filters: ValorizadoFilters
): Promise<{ rows: InsumoLoteRow[]; truncated: boolean }> {
  const { hoy, en30dias } = fechaVencimientoRange()

  const { rows, truncated } = await fetchAll<InsumoLoteQueryRow>((from, to) => {
    let query = supabase
      .from("insumo_lotes")
      .select(
        "codigo_lote, cantidad_disponible, costo_unitario, proveedor, fecha_ingreso, fecha_vencimiento, insumos!inner(codigo, nombre, tipo, unidad_medida, is_active)"
      )
      .eq("insumos.is_active", true)
      .order("fecha_ingreso")
      .range(from, to)

    if (filters.fechaDesde) query = query.gte("fecha_ingreso", filters.fechaDesde)
    if (filters.fechaHasta) query = query.lte("fecha_ingreso", filters.fechaHasta)
    if (filters.tipos.length > 0) query = query.in("insumos.tipo", filters.tipos)
    if (filters.insumoIds.length > 0) query = query.in("insumo_id", filters.insumoIds)
    if (filters.proveedores.length > 0) query = query.in("proveedor", filters.proveedores)
    if (filters.soloConStock) query = query.gt("cantidad_disponible", 0)

    if (filters.vencimiento === "vencidos") {
      query = query.lt("fecha_vencimiento", hoy)
    } else if (filters.vencimiento === "por_vencer") {
      query = query.gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", en30dias)
    } else if (filters.vencimiento === "vigentes") {
      query = query.or(`fecha_vencimiento.is.null,fecha_vencimiento.gt.${en30dias}`)
    }

    return query
  })

  return {
    rows: rows
      .filter((r) => r.insumos)
      .map((r) => ({
        codigo: r.insumos!.codigo,
        nombre: r.insumos!.nombre,
        lote: r.codigo_lote,
        unidadMedida: UNIDAD_MEDIDA_LABELS[r.insumos!.unidad_medida] ?? r.insumos!.unidad_medida,
        stockDisponible: Number(r.cantidad_disponible),
        costoPromedio: Number(r.costo_unitario),
        total: Number(r.cantidad_disponible) * Number(r.costo_unitario),
        _tipo: r.insumos!.tipo,
      })),
    truncated,
  }
}

interface ProductoLoteQueryRow {
  codigo_lote: string
  cantidad_disponible: number
  costo_unitario: number
  estado: Database["public"]["Enums"]["estado_pt"]
  fecha_produccion: string
  producto_variantes: { sku: string; presentacion: string } | null
  productos: { nombre: string } | null
}

export async function fetchProductoLotes(
  supabase: SupabaseClient<Database>,
  filters: ValorizadoFilters
): Promise<{ rows: PTLoteRow[]; truncated: boolean }> {
  const { rows, truncated } = await fetchAll<ProductoLoteQueryRow>((from, to) => {
    let query = supabase
      .from("producto_lotes")
      .select(
        "codigo_lote, cantidad_disponible, costo_unitario, estado, fecha_produccion, producto_variantes(sku, presentacion), productos(nombre)"
      )
      .neq("estado", "despachado")
      .order("fecha_produccion")
      .range(from, to)

    if (filters.fechaDesde) query = query.gte("fecha_produccion", filters.fechaDesde)
    if (filters.fechaHasta) query = query.lte("fecha_produccion", filters.fechaHasta)
    if (filters.soloConStock) query = query.gt("cantidad_disponible", 0)

    return query
  })

  return {
    rows: rows.map((r) => ({
      codigo: r.producto_variantes?.sku ?? "—",
      nombre: r.productos?.nombre ?? "—",
      lote: r.codigo_lote,
      unidadMedida: r.producto_variantes?.presentacion ?? "—",
      stockDisponible: Number(r.cantidad_disponible),
      costoPromedio: Number(r.costo_unitario),
      total: Number(r.cantidad_disponible) * Number(r.costo_unitario),
      estado: ESTADO_PT_LABELS[r.estado] ?? r.estado,
    })),
    truncated,
  }
}

export function buildResumen(insumoRows: InsumoLoteRow[], ptRows: PTLoteRow[] | null): ResumenRow[] {
  const resumen: ResumenRow[] = []

  for (const tipo of Object.keys(TIPO_INSUMO_LABELS) as TipoInsumo[]) {
    const rowsDeTipo = insumoRows.filter((r) => r._tipo === tipo)
    if (rowsDeTipo.length === 0) continue
    resumen.push({
      categoria: TIPO_INSUMO_LABELS[tipo],
      items: new Set(rowsDeTipo.map((r) => r.codigo)).size,
      lotes: rowsDeTipo.length,
      valorTotal: rowsDeTipo.reduce((sum, r) => sum + r.total, 0),
    })
  }

  if (ptRows && ptRows.length > 0) {
    resumen.push({
      categoria: "Producto Terminado",
      items: new Set(ptRows.map((r) => r.codigo)).size,
      lotes: ptRows.length,
      valorTotal: ptRows.reduce((sum, r) => sum + r.total, 0),
    })
  }

  resumen.push({
    categoria: "TOTAL GENERAL",
    items: resumen.reduce((sum, r) => sum + r.items, 0),
    lotes: resumen.reduce((sum, r) => sum + r.lotes, 0),
    valorTotal: resumen.reduce((sum, r) => sum + r.valorTotal, 0),
  })

  return resumen
}
