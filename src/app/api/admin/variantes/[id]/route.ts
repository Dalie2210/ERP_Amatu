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

  const { data: variante } = await admin.from("producto_variantes").select("id").eq("id", id).single()
  if (!variante) return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 })

  const { count } = await admin
    .from("detalle_pedido")
    .select("id", { count: "exact", head: true })
    .eq("variante_id", id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Esta variante tiene ${count} línea(s) de pedido asociadas y no puede eliminarse.` },
      { status: 409 }
    )
  }

  const { error } = await admin.from("producto_variantes").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
