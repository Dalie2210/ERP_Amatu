import ExcelJS from "exceljs"

export type ColumnFormat = "text" | "number" | "currency" | "integer"

export interface ColumnSpec {
  header: string
  key: string
  format?: ColumnFormat
  minWidth?: number
}

// Misma paleta morada de marca que ya usa el PDF de liquidación de comisiones.
const BRAND = "FF7C3AED"
const BRAND_DARK = "FF5B21B6"
const ALT_ROW = "FFF5F3FF"
const HIGHLIGHT_ROW = "FFEDE9FE"

const NUMBER_FORMATS: Record<ColumnFormat, string | undefined> = {
  text: undefined,
  number: "#,##0.##",
  integer: "#,##0",
  currency: '"$"#,##0',
}

export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Amatu ERP"
  workbook.created = new Date()
  return workbook
}

interface AddSheetOpts {
  /** Filas que deben resaltarse (p. ej. "TOTAL GENERAL" en el Resumen), en vez del alterno normal. */
  highlightRow?: (row: Record<string, unknown>) => boolean
}

export function addFormattedSheet<T extends object>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: ColumnSpec[],
  rows: T[],
  opts: AddSheetOpts = {}
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key }))

  const headerRow = sheet.getRow(1)
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } }
    cell.alignment = { vertical: "middle" }
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_DARK } } }
  })

  rows.forEach((row, i) => {
    const rowValues = row as Record<string, unknown>
    const excelRow = sheet.addRow(rowValues)
    const highlighted = opts.highlightRow?.(rowValues) ?? false

    columns.forEach((c, colIdx) => {
      const fmt = c.format && NUMBER_FORMATS[c.format]
      if (fmt) excelRow.getCell(colIdx + 1).numFmt = fmt
    })

    if (highlighted) {
      excelRow.eachCell((cell) => {
        cell.font = { bold: true }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIGHLIGHT_ROW } }
        cell.border = { top: { style: "thin", color: { argb: BRAND } } }
      })
    } else if (i % 2 === 1) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } }
      })
    }
  })

  columns.forEach((c, idx) => {
    let widest = c.header.length
    for (const row of rows) {
      const value = (row as Record<string, unknown>)[c.key]
      const len = value === null || value === undefined ? 0 : String(value).length
      if (len > widest) widest = len
    }
    sheet.getColumn(idx + 1).width = Math.min(Math.max(widest + 2, c.minWidth ?? 10), 40)
  })

  if (columns.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  }

  return sheet
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export function xlsxHeaders(filename: string, rowCount: number, truncated: boolean): HeadersInit {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "X-Row-Count": String(rowCount),
    "X-Truncated": truncated ? "1" : "0",
  }
}
