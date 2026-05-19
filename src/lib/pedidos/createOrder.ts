import { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem, ReglaDescuento } from "@/types"
import { calcularDescuentos } from "@/lib/calculators/discounts"

export interface CreateOrderInput {
  clienteId: string
  mascotaId: string
  vendedorId: string
  items: CartItem[]
  fuente: string | null
  fuenteSubtipo: string | null
  metodoPago: string
  franjaHoraria: string
  esContraentrega: boolean
  fechaTentativaEntrega: string | null
  notasVentas: string
  esDistribuidor: boolean
  pctDescuentoDistribuidor: number
  tarifaEnvioBase: number
  reglas: ReglaDescuento[]
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
    input.pctDescuentoDistribuidor
  )

  // Create order header
  const { data: pedido, error: pedErr } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: input.clienteId,
      mascota_id: input.mascotaId,
      vendedor_id: input.vendedorId,
      estado: "fecha_tentativa",
      estado_pago: "pendiente",
      fuente: input.fuente,
      fuente_subtipo: input.fuenteSubtipo,
      metodo_pago: input.metodoPago,
      franja_horaria: input.franjaHoraria,
      es_contraentrega: input.esContraentrega,
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
    aplica_descuento: i.aplicaDescuento,
    nombre_snapshot: i.presentacion ? `${i.nombre} - ${i.presentacion}` : i.nombre,
  }))

  const { error: detErr } = await supabase.from("detalle_pedido").insert(detalles)
  if (detErr) throw detErr

  // Record provisional commission stub — pct/monto will be set at liquidation time
  // by fn_recalcular_comisiones_periodo using the month-end close rate.
  // vendedor_id and periodo_mes are auto-filled by the DB trigger.
  const baseCalculo = Math.round((calculo.total - calculo.totalEnvioCobrado) * 0.95)
  const { error: comErr } = await supabase.from("comisiones_detalle").insert({
    pedido_id: pedido.id,
    numero_venta_cliente: pedido.numero_venta_cliente,
    base_calculo: baseCalculo,
    pct_comision: 0,
    monto_comision: 0,
    aplica_comision: false,
    razon_no_comision: null,
    is_provisional: true,
  })

  if (comErr) {
    console.error("Comisión provisional no guardada:", comErr)
    // Don't throw - the order is already created
  }

  return {
    pedidoId: pedido.id,
    numeroPedido: pedido.numero_pedido,
    total: calculo.total,
    aplicaComision: false,
  }
}
