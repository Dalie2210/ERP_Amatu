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

  const admin = createAdminClient()

  const { data: cliente } = await admin.from("clientes").select("id").eq("id", id).single()
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const { count } = await admin
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Este cliente tiene ${count} pedido(s) asociado(s). Elimina los pedidos primero antes de borrar el cliente.` },
      { status: 409 }
    )
  }

  await admin.from("mascotas").delete().eq("cliente_id", id)
  await admin.from("aliados_referidos").delete().eq("cliente_id", id)

  const { error } = await admin.from("clientes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
