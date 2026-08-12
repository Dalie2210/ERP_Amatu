import { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem } from "@/types"

export interface CreateOrderInput {
  clienteId: string
  mascotaIds: string[]
  items: CartItem[]
  fuente: string | null
  fuenteSubtipo: string | null
  metodoPago: string
  franjaHoraria: string
  fechaTentativaEntrega: string | null
  notasVentas: string
  // B3: alternate delivery address (null fields = use client address)
  usaDireccionAlterna: boolean
  direccionAlterna: string | null
  complementoAlterna: string | null
  barrioAlterna: string | null
  zonaAlternaId: string | null
  // B5: aliado referido
  aliadoId: string | null
}

export interface CreateOrderOutput {
  pedidoId: string
  numeroPedido: string
  total: number
}

/**
 * Crea un pedido en UNA transacción vía `fn_crear_pedido` (I1).
 *
 * Antes eran tres escrituras independientes desde el navegador (pedidos →
 * detalle_pedido → pedido_mascotas): si la segunda fallaba quedaba un pedido
 * con `total` correcto y cero líneas, con su comisión provisional ya creada.
 *
 * Los importes ya NO se calculan aquí. La RPC deriva en el servidor las reglas
 * de descuento, el % de distribuidor, la tarifa de envío de la zona del cliente
 * y el 5% de referido veterinario — el cliente solo aporta precio × cantidad de
 * cada línea, que queda auditado en `detalle_pedido` (ver S1 en la auditoría).
 * `OrderSummaryCard` sigue usando `calcularDescuentos` para la previsualización;
 * la cifra que manda es la que devuelve la base.
 */
export async function createOrder(
  supabase: SupabaseClient,
  input: CreateOrderInput
): Promise<CreateOrderOutput> {
  const cabecera = {
    cliente_id: input.clienteId,
    fuente: input.fuente,
    fuente_subtipo: input.fuenteSubtipo,
    metodo_pago: input.metodoPago,
    franja_horaria: input.franjaHoraria,
    fecha_tentativa_entrega: input.fechaTentativaEntrega,
    notas_ventas: input.notasVentas,
    aliado_id: input.aliadoId,
    usa_direccion_alterna: input.usaDireccionAlterna,
    direccion_entrega: input.direccionAlterna,
    complemento_entrega: input.complementoAlterna,
    barrio_entrega: input.barrioAlterna,
    zona_entrega_id: input.zonaAlternaId,
  }

  const items = input.items.map((i) => ({
    producto_id: i.productoId,
    variante_id: i.varianteId ?? null,
    nombre_snapshot: i.presentacion ? `${i.nombre} - ${i.presentacion}` : i.nombre,
    precio_unitario: i.precioUnitario,
    cantidad: i.cantidad,
    aplica_descuento: i.aplicaDescuento,
    es_magistral: i.esMagistral,
    gramaje_magistral: i.gramajeMagistral ?? null,
    notas_magistral: i.notasMagistral ?? null,
    justificacion_precio: i.justificacionPrecio ?? null,
    es_promo: i.esPromo ?? false,
    promo_id: i.promoId ?? null,
  }))

  const { data, error } = await supabase.rpc("fn_crear_pedido", {
    p_cabecera: cabecera,
    p_items: items,
    p_mascotas: input.mascotaIds,
  })

  if (error) throw error

  const result = data as { pedido_id: string; numero_pedido: string; total: number } | null
  if (!result?.pedido_id) throw new Error("La base no devolvió el pedido creado")

  return {
    pedidoId: result.pedido_id,
    numeroPedido: result.numero_pedido,
    total: Number(result.total),
  }
}
