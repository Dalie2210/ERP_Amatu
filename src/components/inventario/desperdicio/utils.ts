import type { MotivoDesperdicio } from "@/types"

/**
 * Una opción del desplegable "PRODUCTO" de la hoja. Unifica insumos y
 * variantes de producto terminado en una sola lista, porque en la hoja
 * original todo convivía en la misma columna (Zanahoria, Corazón De Res,
 * Yogurt Griego… son insumos, pero también se desecha PT empacado).
 */
export interface ItemOption {
  key: string
  nombre: string
  detalle: string
  codigo: string | null
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
}

/** Un lote existente ofrecido para la columna LOTE. */
export interface LoteOption {
  id: string
  codigo: string
  proveedor: string | null
}

/** Una fila de la grilla de captura (espejo de una fila del Excel). */
export interface FilaDesperdicio {
  /** Identidad local de la fila; no viaja al servidor. */
  uid: string
  fecha: string
  item: ItemOption | null
  cantidadKg: string
  temperaturaC: string
  proveedor: string
  codigoLote: string
  insumoLoteId: string | null
  motivo: MotivoDesperdicio
  razonDano: string
  accionCorrectiva: string
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

let uidSeq = 0
export function nuevaFila(fecha: string = hoyISO()): FilaDesperdicio {
  uidSeq += 1
  return {
    uid: `f${uidSeq}`,
    fecha,
    item: null,
    cantidadKg: "",
    temperaturaC: "",
    proveedor: "",
    codigoLote: "",
    insumoLoteId: null,
    motivo: "otro",
    razonDano: "",
    accionCorrectiva: "",
  }
}

/** Una fila cuenta como diligenciada apenas se elige el producto. */
export function filaTocada(f: FilaDesperdicio): boolean {
  return (
    f.item !== null ||
    f.cantidadKg.trim() !== "" ||
    f.razonDano.trim() !== "" ||
    f.accionCorrectiva.trim() !== "" ||
    f.temperaturaC.trim() !== "" ||
    f.proveedor.trim() !== "" ||
    f.codigoLote.trim() !== ""
  )
}

/**
 * Devuelve el primer error de la fila, o null si está lista para enviarse.
 * Las columnas opcionales del Excel (proveedor, lote, temperatura, acción
 * correctiva) siguen siendo opcionales aquí a propósito: las filas reales de
 * la hoja llegan incompletas.
 */
export function errorDeFila(f: FilaDesperdicio): string | null {
  if (!f.fecha) return "Falta la fecha"
  if (!f.item) return "Falta el producto"
  const kg = Number(f.cantidadKg)
  if (!f.cantidadKg.trim() || !Number.isFinite(kg) || kg <= 0) return "La cantidad en kilos debe ser mayor a cero"
  if (f.temperaturaC.trim() !== "" && !Number.isFinite(Number(f.temperaturaC))) return "Temperatura inválida"
  if (!f.razonDano.trim()) return "Falta la razón por la que se dañó"
  return null
}

export function formatKg(n: number): string {
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
