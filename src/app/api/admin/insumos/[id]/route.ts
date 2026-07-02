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

  const { data: insumo } = await admin.from("insumos").select("id").eq("id", id).single()
  if (!insumo) return NextResponse.json({ error: "Insumo no encontrado" }, { status: 404 })

  const [{ count: lotesCount }, { count: recetaCount }, { count: movCount }] = await Promise.all([
    admin.from("insumo_lotes").select("id", { count: "exact", head: true }).eq("insumo_id", id),
    admin.from("receta_items").select("id", { count: "exact", head: true }).eq("insumo_id", id),
    admin.from("movimientos_inventario").select("id", { count: "exact", head: true }).eq("insumo_id", id),
  ])

  if ((lotesCount ?? 0) > 0 || (recetaCount ?? 0) > 0 || (movCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "Este insumo tiene lotes, movimientos o recetas asociadas y no puede eliminarse." },
      { status: 409 }
    )
  }

  const { error } = await admin.from("insumos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
