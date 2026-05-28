import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/logistica/liquidacion-mensajero?fecha=YYYY-MM-DD
// Returns per-courier daily settlement for the given date.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get("fecha")

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      { error: "Parámetro 'fecha' requerido en formato YYYY-MM-DD" },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: rutas, error } = await supabase
    .from("rutas")
    .select(`
      id,
      nombre,
      mensajero_nombre,
      mensajero_celular,
      ajuste_extra_mensajero,
      motivo_ajuste,
      estado,
      pedido_ruta(
        numero_bolsas,
        pedidos(
          id,
          numero_pedido,
          total,
          total_envio_cobrado,
          es_contraentrega,
          estado,
          clientes(nombre_completo, direccion)
        )
      )
    `)
    .eq("fecha", fecha)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type PedidoRow = {
    id: string
    numero_pedido: string
    total: number
    total_envio_cobrado: number
    es_contraentrega: boolean
    estado: string
    clientes: { nombre_completo: string; direccion: string } | null
  }

  type PedidoRutaRow = {
    numero_bolsas: number
    pedidos: PedidoRow | null
  }

  type RutaRow = {
    id: string
    nombre: string
    mensajero_nombre: string
    mensajero_celular: string
    ajuste_extra_mensajero: number
    motivo_ajuste: string | null
    estado: string
    pedido_ruta: PedidoRutaRow[]
  }

  const resultado = (rutas as unknown as RutaRow[]).map((ruta) => {
    const pedidos = ruta.pedido_ruta
      .map((pr) => pr.pedidos)
      .filter((p): p is PedidoRow => p !== null)

    const pedidosEntregados = pedidos.filter((p) =>
      ["despachado", "parcial"].includes(p.estado)
    )

    const totalCobradoCliente = pedidosEntregados.reduce(
      (sum, p) => sum + (p.es_contraentrega ? p.total : 0),
      0
    )

    const totalEnvioMensajero = pedidosEntregados.reduce(
      (sum, p) => sum + (p.total_envio_cobrado ?? 0),
      0
    )

    const totalAdeudadoMensajero = totalEnvioMensajero + (ruta.ajuste_extra_mensajero ?? 0)

    return {
      ruta_id: ruta.id,
      nombre_ruta: ruta.nombre,
      mensajero_nombre: ruta.mensajero_nombre,
      mensajero_celular: ruta.mensajero_celular,
      estado_ruta: ruta.estado,
      pedidos_totales: pedidos.length,
      pedidos_entregados: pedidosEntregados.length,
      total_cobrado_cliente: totalCobradoCliente,
      total_envio_mensajero: totalEnvioMensajero,
      ajuste_extra: ruta.ajuste_extra_mensajero ?? 0,
      motivo_ajuste: ruta.motivo_ajuste,
      total_adeudado_mensajero: totalAdeudadoMensajero,
      pedidos: pedidosEntregados.map((p) => ({
        numero_pedido: p.numero_pedido,
        cliente: p.clientes?.nombre_completo ?? "—",
        direccion: p.clientes?.direccion ?? "—",
        total: p.total,
        envio: p.total_envio_cobrado,
        es_contraentrega: p.es_contraentrega,
      })),
    }
  })

  return NextResponse.json({ fecha, rutas: resultado })
}
