import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "contable"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  // Expire stale windows before loading
  await supabase.rpc("fn_expirar_periodos_aliado")

  // Fetch all aliados with their referral windows and commission totals
  const { data: aliados, error: aliadosErr } = await supabase
    .from("aliados")
    .select(`
      id, nombre, tipo, celular, correo, is_active,
      aliados_referidos (
        id, periodo_activo, fecha_inicio_comision, fecha_fin_comision,
        pedido_primera_entrega_id,
        clientes ( id, nombre_completo, codigo_cliente ),
        comisiones_aliado (
          id, tipo, base_calculo, porcentaje, monto, estado, created_at,
          pedidos ( numero_pedido, created_at )
        )
      )
    `)
    .eq("is_active", true)
    .order("nombre")

  if (aliadosErr) return NextResponse.json({ error: aliadosErr.message }, { status: 500 })

  return NextResponse.json({ aliados: aliados ?? [] })
}
