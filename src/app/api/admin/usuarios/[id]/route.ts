import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, adminOk: false, status: 401, msg: "No autorizado" }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { supabase, user, adminOk: false, status: 403, msg: "Acceso denegado" }
  return { supabase, user, adminOk: true, status: 200, msg: "" }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, adminOk, status, msg } = await requireAdmin()
  if (!adminOk) return NextResponse.json({ error: msg }, { status })

  const { id } = await params

  if (user?.id === id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado — no se puede eliminar el usuario." }, { status: 503 })
  }

  const admin = createAdminClient()

  // Block if user has associated records (pedidos, comisiones, leads)
  const [{ count: pedidosCount }, { count: comisionesCount }, { count: leadsCount }] = await Promise.all([
    admin.from("pedidos").select("id", { count: "exact", head: true }).eq("vendedor_id", id),
    admin.from("comisiones_detalle").select("id", { count: "exact", head: true }).eq("vendedor_id", id),
    admin.from("leads_meta_ads").select("id", { count: "exact", head: true }).eq("vendedor_id", id),
  ])

  const total = (pedidosCount ?? 0) + (comisionesCount ?? 0) + (leadsCount ?? 0)
  if (total > 0) {
    return NextResponse.json(
      { error: `Este usuario tiene registros asociados (${pedidosCount ?? 0} pedido(s), ${comisionesCount ?? 0} comisión(es), ${leadsCount ?? 0} lead(s)) y no puede eliminarse definitivamente. Usa "Desactivar" para bloquearlo sin borrar el historial.` },
      { status: 409 }
    )
  }

  // Check at least one other active admin remains
  const { count: activeAdminCount } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", id)

  if (!activeAdminCount || activeAdminCount === 0) {
    return NextResponse.json(
      { error: "No puedes eliminar al único administrador activo." },
      { status: 400 }
    )
  }

  // Delete from public.users first (to avoid FK violation on auth delete)
  await admin.from("users").delete().eq("id", id)

  // Hard delete from Supabase Auth — permanently removes login credentials
  const { error: authError } = await admin.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
