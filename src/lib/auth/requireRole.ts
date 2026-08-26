import "server-only"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Seccion, UserRole } from "@/types"
import { getEffectivePermissions } from "./getEffectivePermissions"

/**
 * Server-side role guard for use in Server Component layouts/pages.
 * Redirects to /login when unauthenticated or deactivated, and to /dashboard
 * when the user's role is not in `allowed`. Returns the resolved role.
 *
 * This is defense-in-depth on top of RLS and the per-route API `requireAdmin`
 * checks — it prevents non-authorized roles from ever loading a section's
 * server-rendered content or bundles.
 */
export async function requireRole(allowed: UserRole[]): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  // S4: un usuario desactivado conserva el JWT hasta que expire; aquí se le
  // corta el acceso y se termina la sesión en el navegador.
  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut()
    redirect("/login?motivo=inactivo")
  }

  const role = profile.role as UserRole | undefined
  if (!role || !allowed.includes(role)) redirect("/dashboard")

  return role
}

// Roles fijos que hoy ven cada sección, para que un usuario 'personalizado'
// se evalúe contra la misma sección con la que el sidebar/API ya la conoce,
// sin tocar el comportamiento de los 4 roles fijos (siguen resolviéndose por
// su propio requireRole([...]) donde ya existía, o no llevan guard alguno,
// exactamente como antes de este feature).
const SECCION_ROLES_FIJOS: Record<Seccion, UserRole[]> = {
  ventas: ["admin", "vendedor", "logistica"],
  catalogo: ["admin", "vendedor"],
  clientes: ["admin", "vendedor"],
  comisiones: ["admin", "contable", "vendedor"],
  aliados: ["admin", "contable"],
  logistica_tablero: ["admin", "logistica"],
  logistica_rutas: ["admin", "logistica"],
  logistica_mensajeros: ["admin", "logistica"],
  logistica_liquidacion: ["admin", "logistica"],
  inventario_dashboard: ["admin", "logistica", "jefe_produccion"],
  inventario_explosion: ["admin", "logistica"],
  inventario_ingresos: ["admin", "logistica"],
  inventario_insumos: ["admin", "logistica"],
  inventario_recetas: ["admin", "logistica", "jefe_produccion"],
  inventario_produccion: ["admin", "logistica", "jefe_produccion"],
  inventario_productos: ["admin", "logistica", "jefe_produccion"],
  inventario_remisiones: ["admin", "logistica"],
  inventario_conteo: ["admin", "logistica", "jefe_produccion"],
  inventario_desperdicio: ["admin", "logistica", "jefe_produccion"],
  admin: ["admin"],
}

/**
 * Guard por sección para Server Components (layouts/pages nuevos o que
 * quieran migrar). Para los 4 roles fijos evalúa contra SECCION_ROLES_FIJOS
 * (equivalente a un requireRole([...]) ya existente); para 'personalizado'
 * consulta user_permisos vía getEffectivePermissions.
 *
 * No reemplaza los `requireRole([...])` ya presentes en admin/layout.tsx e
 * inventario/layout.tsx — esos se dejan intactos.
 */
export async function requireSeccion(seccion: Seccion, opts?: { edit?: boolean }): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut()
    redirect("/login?motivo=inactivo")
  }

  const role = profile.role as UserRole | undefined
  if (!role) redirect("/dashboard")

  if (role === "personalizado") {
    const permisos = await getEffectivePermissions(supabase, user.id, role)
    const permiso = permisos?.[seccion]
    const tieneAcceso = opts?.edit ? permiso?.puede_editar : permiso?.puede_ver
    if (!tieneAcceso) redirect("/dashboard")
    return role
  }

  if (!SECCION_ROLES_FIJOS[seccion].includes(role)) redirect("/dashboard")
  return role
}
