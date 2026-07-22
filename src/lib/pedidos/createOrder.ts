import { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem, ReglaDescuento } from "@/types"
import { calcularDescuentos } from "@/lib/calculators/discounts"
import { confirmarPedido } from "@/lib/logistica/transitions"

export interface CreateOrderInput {
  clienteId: string
  mascotaIds: string[]
  vendedorId: string
  items: CartItem[]
  fuente: string | null
  fuenteSubtipo: string | null
  metodoPago: string
  franjaHoraria: string
  fechaTentativaEntrega: string | null
  notasVentas: string
  esDistribuidor: boolean
  pctDescuentoDistribuidor: number
  tarifaEnvioBase: number
  reglas: ReglaDescuento[]
  // B3: alternate delivery address (null fields = use client address)
  usaDireccionAlterna: boolean
  direccionAlterna: string | null
  complementoAlterna: string | null
  barrioAlterna: string | null
  zonaAlternaId: string | null
  // B5: aliado referido
  aliadoId: string | null
  // B6: referido vet discount
  descuentoReferidoVet: number
}

export interface CreateOrderOutput {
  pedidoId: string
  numeroPedido: string
  total: number
  aplicaComision: boolean
}

export async function createOrder(
  supabase: SupabaseClient,
  input: CreateOrderInput
): Promise<CreateOrderOutput> {
  // Calculate totals and discounts
  const subAlim = input.items
    .filter((i) => i.aplicaDescuento)
    .reduce((acc, i) => acc + i.subtotal, 0)

  const subSnk = input.items
    .filter((i) => i.categoria === "snacks")
    .reduce((acc, i) => acc + i.subtotal, 0)

  const subOtr = input.items
    .filter((i) => i.categoria !== "snacks" && !i.aplicaDescuento)
    .reduce((acc, i) => acc + i.subtotal, 0)

  const calculo = calcularDescuentos(
    subAlim,
    subSnk,
    subOtr,
    input.tarifaEnvioBase,
    input.reglas,
    input.esDistribuidor,
    input.pctDescuentoDistribuidor,
    input.descuentoReferidoVet
  )

  const esContraentrega = input.metodoPago === "contraentrega"
  const estadoInicial = esContraentrega ? "confirmado" : "fecha_tentativa"

  // Create order header
  const { data: pedido, error: pedErr } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: input.clienteId,
      vendedor_id: input.vendedorId,
      estado: estadoInicial,
      estado_pago: "pendiente",
      fuente: input.fuente,
      fuente_subtipo: input.fuenteSubtipo,
      metodo_pago: input.metodoPago,
      franja_horaria: input.franjaHoraria,
      es_contraentrega: esContraentrega,
      fecha_tentativa_entrega: input.fechaTentativaEntrega,
      notas_ventas: input.notasVentas,
      subtotal_alimento: calculo.subtotalAlimento,
      subtotal_snacks: calculo.subtotalSnacks,
      subtotal_otros: calculo.subtotalOtros,
      monto_descuento_compra: calculo.montoDescuentoCompra,
      pct_descuento_compra: calculo.pctDescuentoCompra,
      tarifa_envio_cliente: calculo.tarifaEnvioBase,
      descuento_envio: calculo.descuentoEnvio,
      total_envio_cobrado: calculo.totalEnvioCobrado,
      total: calculo.total,
      aliado_id: input.aliadoId,
      // B3: only persist alternate address when toggle is on; coerce "" to null
      ...(input.usaDireccionAlterna
        ? {
            direccion_entrega: input.direccionAlterna || null,
            complemento_entrega: input.complementoAlterna || null,
            barrio_entrega: input.barrioAlterna || null,
            zona_entrega_id: input.zonaAlternaId,
          }
        : {}),
    })
    .select()
    .single()

  if (pedErr) throw pedErr

  // Create order line items
  const detalles = input.items.map((i) => ({
    pedido_id: pedido.id,
    producto_id: i.productoId,
    variante_id: i.varianteId || null,
    cantidad: i.cantidad,
    precio_unitario_snapshot: i.precioUnitario,
    subtotal: i.subtotal,
    es_magistral: i.esMagistral,
    gramaje_magistral: i.gramajeMagistral || null,
    notas_magistral: i.notasMagistral || null,
    justificacion_precio: i.justificacionPrecio ?? null,
    aplica_descuento: i.aplicaDescuento,
    nombre_snapshot: i.presentacion ? `${i.nombre} - ${i.presentacion}` : i.nombre,
    es_promo: i.esPromo ?? false,
    promo_id: i.promoId ?? null,
  }))

  const { error: detErr } = await supabase.from("detalle_pedido").insert(detalles)
  if (detErr) throw detErr

  const { error: mascErr } = await supabase
    .from("pedido_mascotas")
    .insert(input.mascotaIds.map((mascotaId) => ({ pedido_id: pedido.id, mascota_id: mascotaId })))
  if (mascErr) throw mascErr

  // The provisional commission stub is created automatically by the DB trigger
  // trg_crear_comision_provisional (AFTER INSERT ON pedidos, SECURITY DEFINER).
  // pct/monto stay 0 until liquidation runs fn_recalcular_comisiones_periodo.

  // Contraentrega orders start life already "confirmado" — register the
  // demand reservation (INV-08). Payment stays pending until delivery.
  if (estadoInicial === "confirmado") {
    try {
      await confirmarPedido(supabase, pedido.id, false)
    } catch (err) {
      console.error("Reserva de demanda no registrada:", err)
      // Don't throw - the order is already created
    }
  }

  return {
    pedidoId: pedido.id,
    numeroPedido: pedido.numero_pedido,
    total: calculo.total,
    aplicaComision: false,
  }
}
