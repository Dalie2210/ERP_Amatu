import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireSeccionApi } from "@/lib/auth/requireSeccionApi"
import type { UserRole } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 60

// Roles fijos con acceso a producción. requireSeccionApi solo resuelve el caso
// del rol 'personalizado'; para los fijos sigue mandando esta lista.
const ALLOWED_ROLES: UserRole[] = ["admin", "logistica", "jefe_produccion"]

const SobranteItemSchema = z.object({
  insumo_id: z.string().uuid("Insumo inválido"),
  // 0 = "no sobró nada": borra el registro previo.
  cantidad_cocido: z.number().min(0, "La cantidad no puede ser negativa"),
  nota: z.string().trim().max(500).optional(),
})

const RegistrarSchema = z.object({
  accion: z.literal("registrar"),
  orden_mezcla_id: z.string().uuid("Hoja de mezcla inválida"),
  items: z.array(SobranteItemSchema).min(1, "No hay insumos que registrar"),
})

const AplicarSchema = z.object({
  accion: z.literal("aplicar"),
  orden_id: z.string().uuid("Orden inválida"),
})

const LiberarSchema = z.object({
  accion: z.literal("liberar"),
  orden_id: z.string().uuid("Orden inválida"),
})

const BodySchema = z.discriminatedUnion("accion", [
  RegistrarSchema,
  AplicarSchema,
  LiberarSchema,
])

export async function POST(req: NextRequest) {
  const auth = await requireSeccionApi("inventario_produccion", { edit: true })
  if (!auth.ok) return auth.response
  if (auth.role !== "personalizado" && !ALLOWED_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { supabase } = auth

  if (parsed.data.accion === "registrar") {
    const { data, error } = await supabase.rpc("fn_registrar_sobrante_mezcla", {
      p_orden_mezcla_id: parsed.data.orden_mezcla_id,
      p_items: parsed.data.items,
    })
    // Los RAISE EXCEPTION de las RPC están redactados para el usuario final.
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ registrados: data })
  }

  if (parsed.data.accion === "aplicar") {
    const { data, error } = await supabase.rpc("fn_aplicar_saldos_orden", {
      p_orden_id: parsed.data.orden_id,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ aplicados: data })
  }

  const { error } = await supabase.rpc("fn_liberar_saldos_orden", {
    p_orden_id: parsed.data.orden_id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ liberados: true })
}
