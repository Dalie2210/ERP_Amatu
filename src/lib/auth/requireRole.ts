import "server-only"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"

/**
 * Server-side role guard for use in Server Component layouts/pages.
 * Redirects to /login when unauthenticated and to /dashboard when the user's
 * role is not in `allowed`. Returns the resolved role for convenience.
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
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role as UserRole | undefined
  if (!role || !allowed.includes(role)) redirect("/dashboard")

  return role
}
