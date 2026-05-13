import { SupabaseClient } from "@supabase/supabase-js"

export interface UpdateOrderInput {
  pedidoId: string
  franjaHoraria?: string
  fechaTentativaEntrega?: string | null
  notasVentas?: string
  estadoPago?: string
  metodoPago?: string
  editorId: string
}

export async function updateOrder(
  supabase: SupabaseClient,
  input: UpdateOrderInput
): Promise<{ success: boolean; updatedAt: string }> {
  const now = new Date().toISOString()

  const updateData: Record<string, any> = {
    fue_editado: true,
    editado_por_id: input.editorId,
    editado_en: now,
  }

  if (input.franjaHoraria !== undefined) {
    updateData.franja_horaria = input.franjaHoraria
  }
  if (input.fechaTentativaEntrega !== undefined) {
    updateData.fecha_tentativa_entrega = input.fechaTentativaEntrega
  }
  if (input.notasVentas !== undefined) {
    updateData.notas_ventas = input.notasVentas
  }
  if (input.estadoPago !== undefined) {
    updateData.estado_pago = input.estadoPago
  }
  if (input.metodoPago !== undefined) {
    updateData.metodo_pago = input.metodoPago
  }

  const { error } = await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", input.pedidoId)

  if (error) throw error

  return { success: true, updatedAt: now }
}
