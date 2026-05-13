import { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem, ReglaDescuento, ConfigComision } from "@/types"
import { calcularDescuentos } from "@/lib/calculators/discounts"
import { calcularComision } from "@/lib/calculators/commissions"

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
  configComisiones: ConfigComision[]
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

  // Calculate and record commission
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`

  const { data: metaLeads } = await supabase
    .from("leads_meta_ads")
    .select("cantidad_leads")
    .eq("vendedor_id", input.vendedorId)
    .eq("periodo_mes", currentMonth)
    .single()

  const { data: metaCierres } = await supabase
    .from("pedidos")
    .select("id")
    .eq("vendedor_id", input.vendedorId)
    .eq("fuente", "meta_ads")
    .eq("numero_venta_cliente", 1)
    .gte(
      "created_at",
      `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-01`
    )

  const totalLeads = metaLeads?.cantidad_leads || 1
  const totalCierres = metaCierres?.length || 0
  const pctCierreMeta = totalLeads > 0 ? (totalCierres / totalLeads) * 100 : 0

  const baseCalculo = (calculo.total - calculo.totalEnvioCobrado) * 0.95
  const calcComision = calcularComision(
    pedido.numero_venta_cliente,
    pedido.fuente,
    baseCalculo,
    pctCierreMeta,
    input.configComisiones,
    input.esDistribuidor
  )

  const { error: comErr } = await supabase.from("comisiones_detalle").insert({
    pedido_id: pedido.id,
    numero_venta_cliente: pedido.numero_venta_cliente,
    base_calculo: baseCalculo,
    pct_comision: calcComision.pctComision,
    monto_comision: calcComision.montoComision,
    aplica_comision: calcComision.aplicaComision,
    razon_no_comision: calcComision.razonNoComision || null,
  })

  if (comErr) {
    console.error("Comisión no guardada:", comErr)
    // Don't throw - the order is already created
  }

  return {
    pedidoId: pedido.id,
    numeroPedido: pedido.numero_pedido,
    total: calculo.total,
    aplicaComision: calcComision.aplicaComision,
  }
}
