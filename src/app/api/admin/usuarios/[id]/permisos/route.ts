import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ALL_SECCIONES } from "@/lib/permisos/secciones"
import type { Seccion, SeccionPermiso } from "@/types"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, adminOk: false as const, status: 401, msg: "No autorizado" }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { supabase, adminOk: false as const, status: 403, msg: "Acceso denegado" }
  return { supabase, adminOk: true as const, userId: user.id }
}

const SeccionEnum = z.enum(ALL_SECCIONES as [Seccion, ...Seccion[]])

const PermisosSchema = z.object({
  permisos: z.array(
    z.object({
      seccion: SeccionEnum,
      puede_ver: z.boolean(),
      puede_editar: z.boolean(),
    })
  ),
})

// GET — permisos de un usuario, con default false/false para secciones sin fila
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requireAdmin()
  if (!guard.adminOk) return NextResponse.json({ error: guard.msg }, { status: guard.status })

  const { data } = await guard.supabase
    .from("user_permisos")
    .select("seccion, puede_ver, puede_editar")
    .eq("user_id", id)

  const map = Object.fromEntries(
    ALL_SECCIONES.map((s) => [s, { puede_ver: false, puede_editar: false }])
  ) as Record<Seccion, SeccionPermiso>

  for (const row of data ?? []) {
    map[row.seccion as Seccion] = { puede_ver: row.puede_ver, puede_editar: row.puede_editar }
  }

  return NextResponse.json({ permisos: map })
}

// PUT — reemplaza los permisos del usuario (upsert por sección)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requireAdmin()
  if (!guard.adminOk) return NextResponse.json({ error: guard.msg }, { status: guard.status })

  const body = await req.json().catch(() => ({}))
  const parsed = PermisosSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const rows = parsed.data.permisos.map((p) => ({
    user_id: id,
    seccion: p.seccion,
    puede_ver: p.puede_ver,
    puede_editar: p.puede_editar && p.puede_ver,
    updated_by: guard.userId,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await guard.supabase
    .from("user_permisos")
    .upsert(rows, { onConflict: "user_id,seccion" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
