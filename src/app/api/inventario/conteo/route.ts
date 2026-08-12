import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_ROLES: UserRole[] = ["admin", "logistica", "jefe_produccion"]

const ConteoItemSchema = z
  .object({
    insumo_id: z.string().uuid().nullable().optional(),
    producto_id: z.string().uuid().nullable().optional(),
    variante_id: z.string().uuid().nullable().optional(),
    cantidad_contada: z.number().finite().min(0, "La cantidad contada no puede ser negativa"),
    nota: z.string().max(300).nullable().optional(),
  })
  .refine(
    (it) => (it.insumo_id ? !it.producto_id : !!it.producto_id),
    "Cada ítem debe referenciar exactamente un insumo o un producto"
  )
  .refine(
    (it) => !it.producto_id || !!it.variante_id,
    "Debe indicar la variante del producto"
  )

const ConteoSchema = z.object({
  categoria: z.enum(["materia_prima", "producto_seco", "aseo", "producto_terminado"]),
  motivo: z.string().trim().min(1, "El motivo del conteo es requerido").max(500),
  items: z.array(ConteoItemSchema).min(1, "El conteo no tiene ítems"),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // A diferencia de las rutas de reportes (solo lectura), aquí se escribe:
  // un usuario desactivado con JWT vigente no debe poder ajustar inventario.
  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || profile.is_active === false || !ALLOWED_ROLES.includes(profile.role as UserRole)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = ConteoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { categoria, motivo, items } = parsed.data

  const { data, error } = await supabase.rpc("fn_registrar_conteo", {
    p_categoria: categoria,
    p_motivo: motivo,
    p_items: items.map((it) => ({
      insumo_id: it.insumo_id ?? null,
      producto_id: it.producto_id ?? null,
      variante_id: it.variante_id ?? null,
      cantidad_contada: it.cantidad_contada,
      nota: it.nota ?? null,
    })),
  })

  if (error) {
    // Los RAISE EXCEPTION de la función son mensajes accionables para el usuario.
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ conteo_id: data })
}
