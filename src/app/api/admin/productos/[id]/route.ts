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

  const { data: producto } = await admin.from("productos").select("id").eq("id", id).single()
  if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })

  const { data: variantes } = await admin
    .from("producto_variantes")
    .select("id")
    .eq("producto_id", id)

  if (variantes && variantes.length > 0) {
    const varianteIds = variantes.map((v) => v.id)
    const { count } = await admin
      .from("detalle_pedido")
      .select("id", { count: "exact", head: true })
      .in("variante_id", varianteIds)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Este producto tiene ${count} línea(s) de pedido asociadas y no puede eliminarse.` },
        { status: 409 }
      )
    }

    await admin.from("producto_variantes").delete().eq("producto_id", id)
  }

  const { error } = await admin.from("productos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
