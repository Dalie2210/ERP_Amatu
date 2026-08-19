import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectivePermissions } from "@/lib/auth/getEffectivePermissions"
import type { UserRole } from "@/types"

// El propio usuario lee sus permisos por sección (solo tiene efecto para
// role === 'personalizado' — cubierto por la policy
// user_permisos_select_own_or_admin). Consumido por useSeccionPermisos().
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? null) as UserRole | null
  if (!role) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const permisos = await getEffectivePermissions(supabase, user.id, role)
  return NextResponse.json({ permisos })
}
