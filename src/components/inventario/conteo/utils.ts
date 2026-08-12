export interface ConteoItemRow {
  key: string
  codigo: string | null
  nombre: string
  detalle: string
  stockMinimo: number | null
  cantidadSistema: number
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
}

export interface ConteoDraftItem {
  item: ConteoItemRow
  cantidadContada: number
  nota: string | null
}

// Rango de diacríticos combinantes que deja `normalize("NFD")`.
const DIACRITICOS = /[\u0300-\u036f]/g

/** Minúsculas y sin tildes, para que "azucar" encuentre "Azúcar". */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICOS, "")
}

export function formatCantidad(n: number): string {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 })
}
