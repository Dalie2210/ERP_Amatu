import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Solo admin/logística pueden despachar rutas (descuenta stock por FEFO).
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "logistica"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await req.json()
  const { rutaId } = body as { rutaId: string }

  if (!rutaId) {
    return NextResponse.json({ error: "rutaId requerido" }, { status: 400 })
  }

  // Verify route exists and is not already dispatched
  const { data: ruta, error: rutaErr } = await supabase
    .from("rutas")
    .select("id, estado")
    .eq("id", rutaId)
    .single()

  if (rutaErr || !ruta) {
    return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 })
  }

  if (ruta.estado === "despachada") {
    return NextResponse.json({ error: "La ruta ya fue despachada" }, { status: 409 })
  }

  // Get order IDs in this route and validate dispatch readiness
  const { data: asignaciones } = await supabase
    .from("pedido_ruta")
    .select(`
      pedido_id,
      numero_bolsas,
      pedidos(id, numero_pedido, clientes(celular, direccion))
    `)
    .eq("ruta_id", rutaId)

  const pedidoIds = (asignaciones ?? []).map((a) => a.pedido_id as string)

  if (pedidoIds.length === 0) {
    return NextResponse.json({ error: "La ruta no tiene pedidos asignados" }, { status: 400 })
  }

  // Validate each order has bolsas and client contact info
  type AsignacionRow = {
    pedido_id: string
    numero_bolsas: number
    pedidos: { id: string; numero_pedido: string; clientes: { celular: string | null; direccion: string | null } | null } | null
  }
  const erroresValidacion: { numeroPedido: string; error: string }[] = []
  for (const a of (asignaciones as unknown as AsignacionRow[]) ?? []) {
    const numeroPedido = a.pedidos?.numero_pedido ?? "?"
    if (!a.numero_bolsas || a.numero_bolsas <= 0) {
      erroresValidacion.push({ numeroPedido, error: "Sin número de bolsas" })
    }
    if (!a.pedidos?.clientes?.celular) {
      erroresValidacion.push({ numeroPedido, error: "Sin celular del cliente" })
    }
  }
  if (erroresValidacion.length > 0) {
    return NextResponse.json(
      { error: "Faltan datos antes de despachar", errores: erroresValidacion },
      { status: 400 }
    )
  }

  // Despacho atómico: remisiones (FEFO) + marcar ruta/pedidos en una sola
  // transacción (fn_despachar_ruta). No bloquea por faltantes; los informa.
  const { data: warnings, error: despErr } = await supabase.rpc("fn_despachar_ruta", {
    p_ruta_id: rutaId,
  })
  if (despErr) {
    return NextResponse.json({ error: `Error al despachar: ${despErr.message}` }, { status: 500 })
  }

  type WarnRow = { numero_pedido: string; producto_nombre: string | null; mensaje: string | null }
  const advertenciasStock = ((warnings ?? []) as WarnRow[]).map((w) => ({
    numeroPedido: w.numero_pedido,
    productoNombre: w.producto_nombre,
    mensaje: w.mensaje ?? "Advertencia de stock",
  }))

  return NextResponse.json({
    success: true,
    pedidosCount: pedidoIds.length,
    advertenciasStock,
  })
}
