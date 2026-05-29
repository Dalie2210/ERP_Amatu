import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { adminOk: false, status: 401, msg: "No autorizado" }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { adminOk: false, status: 403, msg: "Acceso denegado" }
  return { adminOk: true, status: 200, msg: "" }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { adminOk, status, msg } = await requireAdmin()
  if (!adminOk) return NextResponse.json({ error: msg }, { status })

  const { id } = await params

  // Use admin client to bypass RLS — anon key may silently block deletes
  const admin = createAdminClient()

  const { data: pedido } = await admin.from("pedidos").select("id").eq("id", id).single()
  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })

  // Cascade: delete child records in dependency order, log any errors
  const cascadeErrors: string[] = []

  // Nullify nullable FK in aliados_referidos before deleting the pedido
  const { error: e0 } = await admin
    .from("aliados_referidos")
    .update({ pedido_primera_entrega_id: null })
    .eq("pedido_primera_entrega_id", id)
  if (e0) cascadeErrors.push(`aliados_referidos: ${e0.message}`)

  const { error: e1 } = await admin.from("pedido_ruta").delete().eq("pedido_id", id)
  if (e1) cascadeErrors.push(`pedido_ruta: ${e1.message}`)

  const { error: e2 } = await admin.from("comisiones_aliado").delete().eq("pedido_id", id)
  if (e2) cascadeErrors.push(`comisiones_aliado: ${e2.message}`)

  const { error: e3 } = await admin.from("comisiones_detalle").delete().eq("pedido_id", id)
  if (e3) cascadeErrors.push(`comisiones_detalle: ${e3.message}`)

  const { error: e4 } = await admin.from("detalle_pedido").delete().eq("pedido_id", id)
  if (e4) cascadeErrors.push(`detalle_pedido: ${e4.message}`)

  if (cascadeErrors.length > 0) {
    return NextResponse.json({ error: `Error en cascade: ${cascadeErrors.join("; ")}` }, { status: 500 })
  }

  const { error } = await admin.from("pedidos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
