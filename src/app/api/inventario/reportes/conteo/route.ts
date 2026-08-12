import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"
import {
  CONTEO_COLUMNS,
  CONTEO_INSUMO_CATEGORIAS,
  CONTEO_PT_SHEET_NAME,
  fetchConteoInsumos,
  fetchConteoProductoTerminado,
} from "@/lib/inventario/reportes/conteo"
import { addFormattedSheet, createWorkbook, workbookToBuffer, xlsxHeaders } from "@/lib/inventario/reportes/workbook"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_ROLES: UserRole[] = ["admin", "logistica", "jefe_produccion"]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || !ALLOWED_ROLES.includes(profile.role as UserRole)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const workbook = createWorkbook()
  let totalRows = 0
  let truncated = false

  for (const { tipo, sheetName } of CONTEO_INSUMO_CATEGORIAS) {
    const { rows, truncated: t } = await fetchConteoInsumos(supabase, tipo)
    totalRows += rows.length
    truncated = truncated || t
    addFormattedSheet(workbook, sheetName, CONTEO_COLUMNS, rows)
  }

  const { rows: ptRows, truncated: ptTruncated } = await fetchConteoProductoTerminado(supabase)
  totalRows += ptRows.length
  truncated = truncated || ptTruncated
  addFormattedSheet(workbook, CONTEO_PT_SHEET_NAME, CONTEO_COLUMNS, ptRows)

  const buffer = await workbookToBuffer(workbook)
  const fecha = new Date().toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: xlsxHeaders(`conteo_inventario_${fecha}.xlsx`, totalRows, truncated),
  })
}
