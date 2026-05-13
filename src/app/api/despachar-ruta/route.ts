import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { buildDespachoPayload, marcarRutaDespachada } from "@/lib/logistica/despacharRuta"

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

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

  // Get order IDs in this route
  const { data: asignaciones } = await supabase
    .from("pedido_ruta")
    .select("pedido_id, pedidos(id)")
    .eq("ruta_id", rutaId)

  const pedidoIds = (asignaciones ?? []).map((a) => a.pedido_id as string)

  if (pedidoIds.length === 0) {
    return NextResponse.json({ error: "La ruta no tiene pedidos asignados" }, { status: 400 })
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

  // Mark as dispatched in DB
  await marcarRutaDespachada(supabase, rutaId, pedidoIds)

  return NextResponse.json({ success: true, pedidosCount: pedidoIds.length, payload })
}
