import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import type { Seccion, SeccionPermiso, UserRole } from "@/types"
import { ALL_SECCIONES } from "@/lib/permisos/secciones"

/**
 * Resuelve los permisos por sección de un usuario 'personalizado'.
 *
 * Devuelve `null` para cualquier otro rol — señal explícita de "no aplica,
 * usa la lógica estática existente (arrays de rol / usePermissions)". Esto
 * garantiza que los 4 roles fijos no cambien de comportamiento en ningún
 * punto de consumo.
 */
export async function getEffectivePermissions(
  supabase: SupabaseClient<Database>,
  userId: string,
  role: UserRole
): Promise<Record<Seccion, SeccionPermiso> | null> {
  if (role !== "personalizado") return null

  const { data } = await supabase
    .from("user_permisos")
    .select("seccion, puede_ver, puede_editar")
    .eq("user_id", userId)

  const map = Object.fromEntries(
    ALL_SECCIONES.map((s) => [s, { puede_ver: false, puede_editar: false }])
  ) as Record<Seccion, SeccionPermiso>

  for (const row of data ?? []) {
    map[row.seccion as Seccion] = { puede_ver: row.puede_ver, puede_editar: row.puede_editar }
  }

  return map
}
