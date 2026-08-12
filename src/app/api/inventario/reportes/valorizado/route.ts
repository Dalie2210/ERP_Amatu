import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"
import {
  INSUMOS_COLUMNS,
  PT_COLUMNS,
  RESUMEN_COLUMNS,
  ValorizadoFiltersSchema,
  buildResumen,
  fetchInsumoLotes,
  fetchProductoLotes,
  shouldIncludePT,
} from "@/lib/inventario/reportes/valorizado"
import { addFormattedSheet, createWorkbook, workbookToBuffer, xlsxHeaders } from "@/lib/inventario/reportes/workbook"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_ROLES: UserRole[] = ["admin", "logistica", "jefe_produccion"]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || !ALLOWED_ROLES.includes(profile.role as UserRole)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = ValorizadoFiltersSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const filters = parsed.data

  const { rows: insumoRows, truncated: insumosTruncated } = await fetchInsumoLotes(supabase, filters)

  const incluirPT = shouldIncludePT(filters)
  const { rows: ptRows, truncated: ptTruncated } = incluirPT
    ? await fetchProductoLotes(supabase, filters)
    : { rows: [], truncated: false }

  const workbook = createWorkbook()
  addFormattedSheet(workbook, "Insumos", INSUMOS_COLUMNS, insumoRows)
  if (incluirPT) {
    addFormattedSheet(workbook, "Producto Terminado", PT_COLUMNS, ptRows)
  }
  const resumen = buildResumen(insumoRows, incluirPT ? ptRows : null)
  addFormattedSheet(workbook, "Resumen", RESUMEN_COLUMNS, resumen, {
    highlightRow: (row) => row.categoria === "TOTAL GENERAL",
  })

  const buffer = await workbookToBuffer(workbook)
  const fecha = new Date().toISOString().slice(0, 10)
  const rango = filters.fechaDesde || filters.fechaHasta ? `_${filters.fechaDesde ?? "inicio"}_${filters.fechaHasta ?? "hoy"}` : ""

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: xlsxHeaders(
      `inventario_valorizado_${fecha}${rango}.xlsx`,
      insumoRows.length + ptRows.length,
      insumosTruncated || ptTruncated
    ),
  })
}
