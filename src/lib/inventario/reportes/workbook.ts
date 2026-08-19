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

export interface PrintColumnSpec {
  header: string
  key: string
  width: number
  format?: ColumnFormat
  /** Columna en blanco de anotación a mano: texto ajustado, alineado arriba, fila alta. */
  handwritten?: boolean
  /** Casilla "limpia" que se digitaliza (ej. Total): recuadro grueso y resaltado. */
  totalBox?: boolean
}

interface PrintSheetOpts {
  /** Texto de instrucciones impreso arriba de la tabla, sobre cómo diligenciar la hoja a mano. */
  instructions: string
  /** Alto de las filas de datos (en puntos); grande para permitir varias anotaciones por celda. */
  rowHeight?: number
}

/**
 * Hoja pensada para imprimirse y diligenciarse a mano (formato de conteo físico):
 * filas altas, una casilla ancha para anotar varias ubicaciones y una casilla de
 * TOTAL separada y limpia que es el único valor que luego se digitaliza.
 */
export function addPrintableSheet<T extends object>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: PrintColumnSpec[],
  rows: T[],
  opts: PrintSheetOpts
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 2 }],
  })

  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }))

  // Fila 1: instrucciones de diligenciamiento, en texto legible para imprimir.
  sheet.mergeCells(1, 1, 1, columns.length)
  const instructionsCell = sheet.getCell(1, 1)
  instructionsCell.value = opts.instructions
  instructionsCell.font = { italic: true, size: 10, color: { argb: "FF4B5563" } }
  instructionsCell.alignment = { vertical: "middle", wrapText: true }
  sheet.getRow(1).height = 30

  // Fila 2: encabezados de columna.
  const headerRow = sheet.getRow(2)
  columns.forEach((c, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = c.header
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_DARK } } }
  })
  headerRow.height = 28

  const dataRowHeight = opts.rowHeight ?? 60

  rows.forEach((row) => {
    const rowValues = row as Record<string, unknown>
    const excelRow = sheet.addRow(columns.map((c) => rowValues[c.key] ?? ""))
    excelRow.height = dataRowHeight

    columns.forEach((c, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1)
      const fmt = c.format && NUMBER_FORMATS[c.format]
      if (fmt) cell.numFmt = fmt

      if (c.handwritten) {
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true }
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        }
      } else if (c.totalBox) {
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIGHLIGHT_ROW } }
        cell.border = {
          top: { style: "medium", color: { argb: BRAND } },
          bottom: { style: "medium", color: { argb: BRAND } },
          left: { style: "medium", color: { argb: BRAND } },
          right: { style: "medium", color: { argb: BRAND } },
        }
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" }
        cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } }
      }
    })
  })

  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }
  sheet.headerFooter.oddFooter = "&P / &N"

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
