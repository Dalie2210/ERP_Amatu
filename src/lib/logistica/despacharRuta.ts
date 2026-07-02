import type { SupabaseClient } from "@supabase/supabase-js"
import type { RutaDespachoPayload, PedidoDespachoPayload } from "@/types"

export interface DespacharResult {
  success: boolean
  payload: RutaDespachoPayload | null
  error?: string
}

export async function buildDespachoPayload(
  supabase: SupabaseClient,
  rutaId: string
): Promise<RutaDespachoPayload | null> {
  const { data: ruta, error: rutaErr } = await supabase
    .from("rutas")
    .select("id, nombre, fecha, franja, mensajero_nombre, mensajero_celular")
    .eq("id", rutaId)
    .single()

  if (rutaErr || !ruta) return null

  const { data: asignaciones, error: asigErr } = await supabase
    .from("pedido_ruta")
    .select(`
      numero_bolsas, orden_entrega,
      pedidos(
        id, total, notas_ventas, notas_despacho, franja_horaria, es_contraentrega,
        direccion_entrega, complemento_entrega, barrio_entrega,
        clientes(nombre_completo, celular, direccion, complemento_direccion),
        mascotas(nombre)
      )
    `)
    .eq("ruta_id", rutaId)
    .order("orden_entrega", { ascending: true, nullsFirst: false })

  if (asigErr || !asignaciones) return null

  const pedidos: PedidoDespachoPayload[] = asignaciones.map((a) => {
    type PedidoRow = {
      id: string; total: number; notas_ventas: string | null; notas_despacho: string | null;
      franja_horaria: string; es_contraentrega: boolean;
      direccion_entrega: string | null; complemento_entrega: string | null; barrio_entrega: string | null;
      clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null;
      mascotas: { nombre: string } | null
    }
    const p = (a.pedidos as unknown) as PedidoRow | null

    // B3: use alternate address when set, fall back to client address
    const direccion = p?.direccion_entrega ?? p?.clientes?.direccion ?? ""
    const complemento = p?.complemento_entrega ?? p?.clientes?.complemento_direccion ?? ""

    return {
      nombreMascota: p?.mascotas?.nombre ?? "—",
      nombreCliente: p?.clientes?.nombre_completo ?? "—",
      franjaHoraria: p?.franja_horaria ?? "sin_franja",
      notasVentas: p?.notas_ventas ?? "",
      direccion,
      complementoDireccion: complemento,
      notasDespacho: p?.notas_despacho ?? "",
      celular: p?.clientes?.celular ?? "",
      numeroBolsas: a.numero_bolsas,
      esContraentrega: p?.es_contraentrega ?? false,
      total: p?.total ?? 0,
    }
  })

  return {
    rutaId: ruta.id,
    nombreRuta: ruta.nombre,
    fecha: ruta.fecha,
    franja: ruta.franja,
    mensajeroNombre: ruta.mensajero_nombre,
    mensajeroCelular: ruta.mensajero_celular,
    pedidos,
  }
}

export interface RemisionWarning {
  numeroPedido: string
  productoNombre: string | null
  mensaje: string
}

// Despacha PT por FEFO para cada pedido de la ruta vía fn_despachar_remision
// (INV-06/12): entrega el remanente pendiente de cada ítem. No bloquea el
// despacho si hay faltantes — solo recolecta advertencias para informar.
export async function despacharRemisionesRuta(
  supabase: SupabaseClient,
  pedidoIds: string[]
): Promise<RemisionWarning[]> {
  const warnings: RemisionWarning[] = []

  const { data: pedidosInfo } = await supabase
    .from("pedidos")
    .select("id, numero_pedido")
    .in("id", pedidoIds)
  const numeroPorPedido = new Map(
    (pedidosInfo ?? []).map((p: { id: string; numero_pedido: string }) => [p.id, p.numero_pedido])
  )

  for (const pedidoId of pedidoIds) {
    const { data: detalles } = await supabase
      .from("detalle_pedido")
      .select("id, cantidad, cantidad_entregada")
      .eq("pedido_id", pedidoId)

    const pendientes = (detalles ?? [])
      .map((d: { id: string; cantidad: number; cantidad_entregada: number | null }) => ({
        detalle_id: d.id,
        cantidad: d.cantidad - (d.cantidad_entregada ?? 0),
      }))
      .filter((d) => d.cantidad > 0)

    if (pendientes.length === 0) continue

    const { data: resultado, error } = await supabase.rpc("fn_despachar_remision", {
      p_pedido_id: pedidoId,
      p_items: pendientes,
    })

    if (error) {
      warnings.push({
        numeroPedido: numeroPorPedido.get(pedidoId) ?? pedidoId,
        productoNombre: null,
        mensaje: `Error al despachar remisión: ${error.message}`,
      })
      continue
    }

    type ResultRow = { advertencia: boolean; mensaje: string | null; producto_nombre: string | null }
    for (const row of (resultado as ResultRow[]) ?? []) {
      if (row.advertencia) {
        warnings.push({
          numeroPedido: numeroPorPedido.get(pedidoId) ?? pedidoId,
          productoNombre: row.producto_nombre,
          mensaje: row.mensaje ?? "Stock insuficiente",
        })
      }
    }
  }

  return warnings
}

export async function marcarRutaDespachada(
  supabase: SupabaseClient,
  rutaId: string,
  pedidoIds: string[]
): Promise<void> {
  const now = new Date().toISOString()

  await supabase
    .from("rutas")
    .update({ estado: "despachada", despachada_en: now })
    .eq("id", rutaId)

  await supabase
    .from("pedidos")
    .update({ estado: "despachado", fecha_entrega_real: now })
    .in("id", pedidoIds)
}
