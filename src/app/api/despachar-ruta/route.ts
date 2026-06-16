import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildDespachoPayload, marcarRutaDespachada } from "@/lib/logistica/despacharRuta"
import { moveLeadToStage } from "@/lib/integrations/kommo"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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

  // Build payload
  const payload = await buildDespachoPayload(supabase, rutaId)
  if (!payload) {
    return NextResponse.json({ error: "Error al construir el payload" }, { status: 500 })
  }

  // Call n8n webhook if configured
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!webhookRes.ok) {
        console.error("n8n webhook error:", webhookRes.status, await webhookRes.text())
      }
    } catch (err) {
      console.error("Failed to reach n8n webhook:", err)
      // Not fatal — mark as dispatched even if webhook fails; ops can retry
    }
  }

  // Move Kommo leads to "En Camino" stage (non-fatal)
  const kommoStageId = process.env.KOMMO_STAGE_EN_CAMINO_ID
  if (kommoStageId) {
    const { data: kommoRows } = await supabase
      .from("pedidos")
      .select("kommo_lead_id")
      .in("id", pedidoIds)
      .not("kommo_lead_id", "is", null)

    for (const row of kommoRows ?? []) {
      if (row.kommo_lead_id) {
        try {
          await moveLeadToStage(String(row.kommo_lead_id), kommoStageId)
        } catch (err) {
          console.error("[Kommo] Failed to move lead:", err)
        }
      }
    }
  }

  // Mark as dispatched in DB
  await marcarRutaDespachada(supabase, rutaId, pedidoIds)

  return NextResponse.json({ success: true, pedidosCount: pedidoIds.length, payload })
}
