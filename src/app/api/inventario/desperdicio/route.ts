import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_ROLES: UserRole[] = ["admin", "logistica", "jefe_produccion"]

// Espejo de las columnas de la hoja que reemplaza este módulo. Solo fecha,
// producto, cantidad y razón son obligatorios: las filas reales del Excel
// llegan sin proveedor ni lote con frecuencia.
const DesperdicioItemSchema = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    insumo_id: z.string().uuid().nullable().optional(),
    producto_id: z.string().uuid().nullable().optional(),
    variante_id: z.string().uuid().nullable().optional(),
    cantidad_kg: z.number().finite().positive("La cantidad en kilos debe ser mayor a cero"),
    temperatura_c: z.number().finite().nullable().optional(),
    proveedor: z.string().trim().max(200).nullable().optional(),
    codigo_lote: z.string().trim().max(120).nullable().optional(),
    insumo_lote_id: z.string().uuid().nullable().optional(),
    producto_lote_id: z.string().uuid().nullable().optional(),
    motivo: z.enum([
      "vencimiento", "quemado", "cambio_temperatura",
      "nevera_danada", "bolsa_rota", "contaminacion", "otro",
    ]),
    razon_dano: z.string().trim().min(1, "La razón por la que se dañó es obligatoria").max(1000),
    accion_correctiva: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (it) => (it.insumo_id ? !it.producto_id : !!it.producto_id),
    "Cada fila debe referenciar exactamente un insumo o un producto"
  )

const DesperdicioSchema = z.object({
  items: z.array(DesperdicioItemSchema).min(1, "No hay filas para registrar"),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || profile.is_active === false || !ALLOWED_ROLES.includes(profile.role as UserRole)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = DesperdicioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data, error } = await supabase.rpc("fn_registrar_desperdicio", {
    p_items: parsed.data.items.map((it) => ({
      fecha: it.fecha,
      insumo_id: it.insumo_id ?? null,
      producto_id: it.producto_id ?? null,
      variante_id: it.variante_id ?? null,
      cantidad_kg: it.cantidad_kg,
      temperatura_c: it.temperatura_c ?? null,
      proveedor: it.proveedor || null,
      codigo_lote: it.codigo_lote || null,
      insumo_lote_id: it.insumo_lote_id ?? null,
      producto_lote_id: it.producto_lote_id ?? null,
      motivo: it.motivo,
      razon_dano: it.razon_dano,
      accion_correctiva: it.accion_correctiva || null,
    })),
  })

  if (error) {
    // Los RAISE EXCEPTION de la función son mensajes accionables para el usuario.
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ registradas: data })
}
