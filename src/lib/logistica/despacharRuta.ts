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
      clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null;
      mascotas: { nombre: string } | null
    }
    const p = (a.pedidos as unknown) as PedidoRow | null

    return {
      nombreMascota: p?.mascotas?.nombre ?? "—",
      nombreCliente: p?.clientes?.nombre_completo ?? "—",
      franjaHoraria: p?.franja_horaria ?? "sin_franja",
      notasVentas: p?.notas_ventas ?? "",
      direccion: p?.clientes?.direccion ?? "",
      complementoDireccion: p?.clientes?.complemento_direccion ?? "",
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
