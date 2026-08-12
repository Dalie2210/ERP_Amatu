import { SupabaseClient } from "@supabase/supabase-js"

export interface UpdateOrderInput {
  pedidoId: string
  franjaHoraria?: string
  fechaTentativaEntrega?: string | null
  notasVentas?: string
  estadoPago?: string
  metodoPago?: string
  editorId: string
  editorNombre?: string | null
}

export async function updateOrder(
  supabase: SupabaseClient,
  input: UpdateOrderInput
): Promise<{ success: boolean; updatedAt: string }> {
  const now = new Date().toISOString()

  const updateData: Record<string, unknown> = {
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
  if (input.metodoPago !== undefined) {
    updateData.metodo_pago = input.metodoPago
  }

  const { error } = await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", input.pedidoId)

  if (error) throw error

  // S1: `estado_pago` ya no es escribible por PostgREST (era el vector directo
  // de fraude de comisiones: confirmarse el pago a sí mismo desbloquea el monto
  // ganado). La confirmación pasa por una RPC que autoriza, sella la fecha y
  // deja rastro en pedido_actividad. Es de un solo sentido: no se des-confirma.
  if (input.estadoPago === "confirmado") {
    const { error: pagoErr } = await supabase.rpc("fn_confirmar_pago_pedido", {
      p_pedido_id: input.pedidoId,
      p_metodo_pago: input.metodoPago ?? null,
    })
    if (pagoErr) throw pagoErr
  }

  // Bitácora unificada en pedido_actividad (misma que usa logística). No es
  // fatal si falla, pero se registra el error para no perderlo en silencio.
  const cambios: Record<string, unknown> = {}
  if (input.franjaHoraria !== undefined) cambios.franja_horaria = input.franjaHoraria
  if (input.fechaTentativaEntrega !== undefined) cambios.fecha_tentativa_entrega = input.fechaTentativaEntrega
  if (input.notasVentas !== undefined) cambios.notas_ventas = input.notasVentas
  if (input.estadoPago !== undefined) cambios.estado_pago = input.estadoPago
  if (input.metodoPago !== undefined) cambios.metodo_pago = input.metodoPago

  const { error: actErr } = await supabase.from("pedido_actividad").insert({
    pedido_id: input.pedidoId,
    tipo: "pedido_editado",
    usuario_id: input.editorId,
    usuario_nombre: input.editorNombre ?? null,
    payload: { cambios },
  })
  if (actErr) console.error("No se registró la actividad de edición:", actErr.message)

  return { success: true, updatedAt: now }
}
