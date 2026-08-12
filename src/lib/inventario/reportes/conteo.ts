import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type { TipoInsumo } from "@/types"
import { UNIDAD_MEDIDA_LABELS } from "@/lib/constants/labels"
import { fetchAll } from "./fetchAll"
import type { ColumnSpec } from "./workbook"

export const CONTEO_COLUMNS: ColumnSpec[] = [
  { header: "Código", key: "codigo", minWidth: 12 },
  { header: "Nombre", key: "nombre", minWidth: 24 },
  { header: "Stock Disponible", key: "stockDisponible", format: "number", minWidth: 14 },
  { header: "Unidad de Medida", key: "unidadMedida", minWidth: 16 },
  { header: "Conteo Físico", key: "conteoFisico", format: "number", minWidth: 14 },
  { header: "Observaciones", key: "observaciones", minWidth: 28 },
]

export interface ConteoRow {
  codigo: string
  nombre: string
  stockDisponible: number
  unidadMedida: string
  conteoFisico: string
  observaciones: string
}

export const CONTEO_INSUMO_CATEGORIAS: { tipo: TipoInsumo; sheetName: string }[] = [
  { tipo: "materia_prima", sheetName: "Materia Prima" },
  { tipo: "producto_seco", sheetName: "Producto Seco" },
  { tipo: "aseo", sheetName: "Aseo" },
  { tipo: "empaque", sheetName: "Empaque" },
]

export const CONTEO_PT_SHEET_NAME = "Producto Terminado"

interface VStockInsumoRow {
  codigo: string | null
  nombre: string | null
  unidad_medida: Database["public"]["Enums"]["unidad_medida"] | null
  stock_disponible: number | null
}

export async function fetchConteoInsumos(
  supabase: SupabaseClient<Database>,
  tipo: TipoInsumo
): Promise<{ rows: ConteoRow[]; truncated: boolean }> {
  const { rows, truncated } = await fetchAll<VStockInsumoRow>((from, to) =>
    supabase
      .from("v_stock_insumos")
      .select("codigo, nombre, unidad_medida, stock_disponible")
      .eq("tipo", tipo)
      .order("nombre")
      .range(from, to)
  )

  return {
    rows: rows.map((r) => ({
      codigo: r.codigo ?? "",
      nombre: r.nombre ?? "",
      stockDisponible: Number(r.stock_disponible ?? 0),
      unidadMedida: (r.unidad_medida && UNIDAD_MEDIDA_LABELS[r.unidad_medida]) ?? r.unidad_medida ?? "",
      conteoFisico: "",
      observaciones: "",
    })),
    truncated,
  }
}

interface VarianteRow {
  id: string
  presentacion: string
  sku: string
  productos: { nombre: string } | null
}

interface StockProductoRow {
  variante_id: string | null
  estado: Database["public"]["Enums"]["estado_pt"] | null
  stock_disponible: number | null
}

export async function fetchConteoProductoTerminado(
  supabase: SupabaseClient<Database>
): Promise<{ rows: ConteoRow[]; truncated: boolean }> {
  const [{ rows: variantes, truncated: t1 }, { rows: stockRows, truncated: t2 }] = await Promise.all([
    fetchAll<VarianteRow>((from, to) =>
      supabase
        .from("producto_variantes")
        .select("id, presentacion, sku, productos(nombre)")
        .eq("is_active", true)
        .order("presentacion")
        .range(from, to)
    ),
    fetchAll<StockProductoRow>((from, to) =>
      supabase.from("v_stock_productos").select("variante_id, estado, stock_disponible").range(from, to)
    ),
  ])

  const stockByVariante = new Map<string, number>()
  for (const r of stockRows) {
    if (!r.variante_id || r.estado === "despachado") continue
    stockByVariante.set(r.variante_id, (stockByVariante.get(r.variante_id) ?? 0) + Number(r.stock_disponible ?? 0))
  }

  const rows: ConteoRow[] = variantes.map((v) => ({
    codigo: v.sku,
    nombre: v.productos?.nombre ?? "—",
    stockDisponible: stockByVariante.get(v.id) ?? 0,
    unidadMedida: v.presentacion,
    conteoFisico: "",
    observaciones: "",
  }))

  return { rows, truncated: t1 || t2 }
}
