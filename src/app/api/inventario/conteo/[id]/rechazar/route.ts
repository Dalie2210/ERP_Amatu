import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

const RechazarSchema = z.object({
  motivo: z.string().trim().min(1, "El motivo de rechazo es requerido").max(500),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || profile.is_active === false || profile.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = RechazarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { error } = await supabase.rpc("fn_rechazar_conteo", {
    p_conteo_id: id,
    p_motivo: parsed.data.motivo,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
