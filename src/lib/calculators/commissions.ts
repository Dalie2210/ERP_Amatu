/**
 * Commission period helper for Amatu ERP.
 *
 * El cálculo de comisiones vive en la base de datos como fuente única de verdad:
 *   - fn_estimar_comisiones_periodo  (estimación, solo lectura)
 *   - fn_recalcular_comisiones_periodo (persiste al liquidar)
 * Este archivo solo expone el mapeo de fecha → periodo_mes (regla 25-a-25).
 */

/**
 * Maps a JS Date to its commission periodo_mes (YYYY-MM) using the 25-to-25 rule.
 * Dates on or after the 25th belong to NEXT month's period.
 */
export function getPeriodoMes(date: Date = new Date()): string {
  const bogota = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Bogota" })
  )
  const day = bogota.getDate()
  if (day >= 25) {
    const next = new Date(bogota.getFullYear(), bogota.getMonth() + 1, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  }
  return `${bogota.getFullYear()}-${String(bogota.getMonth() + 1).padStart(2, "0")}`
}

