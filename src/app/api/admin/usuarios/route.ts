import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, adminOk: false, status: 401, msg: "No autorizado" }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { supabase, adminOk: false, status: 403, msg: "Acceso denegado" }
  return { supabase, adminOk: true, status: 200, msg: "" }
}

// GET — list all users
export async function GET() {
  const { supabase, adminOk, status, msg } = await requireAdmin()
  if (!adminOk) return NextResponse.json({ error: msg }, { status })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Fallback: return only public profiles (no email)
    const { data: profiles } = await supabase
      .from("users")
      .select("id, full_name, role, is_active, created_at")
      .order("created_at")
    return NextResponse.json({ users: profiles ?? [], noEmail: true })
  }

  const admin = createAdminClient()
  const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await supabase
    .from("users")
    .select("id, full_name, role, is_active, created_at")

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const users = authData.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: profileMap.get(u.id)?.full_name ?? "",
    role: profileMap.get(u.id)?.role ?? "vendedor",
    is_active: profileMap.get(u.id)?.is_active ?? true,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

// POST — create user
export async function POST(req: NextRequest) {
  const { supabase, adminOk, status, msg } = await requireAdmin()
  if (!adminOk) return NextResponse.json({ error: msg }, { status })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado" }, { status: 503 })
  }

  const { email, full_name, role, password } = await req.json()
  if (!email || !full_name || !role || !password) {
    return NextResponse.json({ error: "email, full_name, role y password son requeridos" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message ?? "Error creando usuario" }, { status: 500 })
  }

  // Upsert public profile (trigger may already handle this)
  await supabase.from("users").upsert({
    id: newUser.user.id,
    full_name,
    role,
    is_active: true,
  })

  return NextResponse.json({ user: { id: newUser.user.id, email } }, { status: 201 })
}

// PATCH — update role / is_active / full_name / password reset
export async function PATCH(req: NextRequest) {
  const { supabase, adminOk, status, msg } = await requireAdmin()
  if (!adminOk) return NextResponse.json({ error: msg }, { status })

  const { id, full_name, role, is_active, newPassword } = await req.json()
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  // Password reset path — requires service role key
  if (newPassword !== undefined) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado" }, { status: 503 })
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener mínimo 8 caracteres" }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password: newPassword })
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const update: Record<string, unknown> = {}
  if (full_name !== undefined) update.full_name = full_name
  if (role !== undefined) update.role = role
  if (is_active !== undefined) update.is_active = is_active

  const { error } = await supabase.from("users").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
