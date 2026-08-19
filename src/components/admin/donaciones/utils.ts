import type { EstadoDonacion, OrigenDonacion } from "@/types"

/**
 * Select compartido por el panel de aprobaciones y el histórico, para que las
 * dos vistas muestren exactamente los mismos datos de una donación.
 */
export const DONACION_SELECT = `
  id, origen, destinatario, motivo, cantidad, valor_comercial, estado,
  motivo_rechazo, revisado_at, created_at,
  users!donaciones_created_by_fkey(full_name),
  pedidos(numero_pedido, clientes(nombre_completo), detalle_pedido(nombre_snapshot, cantidad, subtotal)),
  producto_lotes(codigo_lote, cantidad_disponible, productos(nombre), producto_variantes(presentacion))
`

interface LineaPedido {
  nombre_snapshot: string
  cantidad: number
  subtotal: number
}

export interface DonacionRow {
  id: string
  origen: OrigenDonacion
  destinatario: string
  motivo: string
  cantidad: number | null
  valor_comercial: number
  estado: EstadoDonacion
  motivo_rechazo: string | null
  revisado_at: string | null
  created_at: string
  users: { full_name: string } | null
  pedidos: {
    numero_pedido: string
    clientes: { nombre_completo: string } | null
    detalle_pedido: LineaPedido[]
  } | null
  producto_lotes: {
    codigo_lote: string
    cantidad_disponible: number
    productos: { nombre: string } | null
    producto_variantes: { presentacion: string } | null
  } | null
}

/** Alias para el panel de pendientes, donde `estado` siempre es 'pendiente'. */
export type PendienteRow = DonacionRow

export const formatCOP = (n: number) => `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`

/** Descripción corta de qué se donó, para las filas del histórico. */
export function resumenDonacion(d: DonacionRow): string {
  if (d.origen === "lote_pt") {
    const nombre = d.producto_lotes?.productos?.nombre ?? "—"
    const pres = d.producto_lotes?.producto_variantes?.presentacion
    return `${Number(d.cantidad ?? 0).toLocaleString("es-CO")} × ${nombre}${pres ? ` — ${pres}` : ""}`
  }
  const lineas = d.pedidos?.detalle_pedido ?? []
  if (lineas.length === 0) return "—"
  const primera = `${lineas[0].cantidad} × ${lineas[0].nombre_snapshot}`
  return lineas.length === 1 ? primera : `${primera} +${lineas.length - 1} más`
}
