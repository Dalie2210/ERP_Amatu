import "server-only"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Seccion, UserRole } from "@/types"
import { getEffectivePermissions } from "./getEffectivePermissions"

interface RequireSeccionApiOk {
  ok: true
  role: UserRole
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

interface RequireSeccionApiFail {
  ok: false
  response: NextResponse
}

/**
 * Análogo de requireSeccion() para rutas /api/**: en vez de redirigir,
 * devuelve un NextResponse de error listo para retornar. Pensado para que
 * cada guard local existente (requireAdmin() y similares) agregue SOLO una
 * rama `else if (role === "personalizado")` sin reescribir su lógica actual
 * para los 4 roles fijos — ver src/lib/auth/requireRole.ts para el mapa
 * SECCION_ROLES_FIJOS que ambos comparten conceptualmente.
 */
export async function requireSeccionApi(
  seccion: Seccion,
  opts?: { edit?: boolean }
): Promise<RequireSeccionApiOk | RequireSeccionApiFail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || profile.is_active === false) {
    return { ok: false, response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
  }

  const role = profile.role as UserRole

  if (role === "personalizado") {
    const permisos = await getEffectivePermissions(supabase, user.id, role)
    const permiso = permisos?.[seccion]
    const tieneAcceso = opts?.edit ? permiso?.puede_editar : permiso?.puede_ver
    if (!tieneAcceso) {
      return { ok: false, response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
    }
  }

  return { ok: true, role, userId: user.id, supabase }
}
