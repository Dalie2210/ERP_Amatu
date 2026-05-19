import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "contable"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await req.json()
  const { vendedor_id, periodo_mes } = body

  if (!vendedor_id || !periodo_mes) {
    return NextResponse.json({ error: "Faltan campos: vendedor_id, periodo_mes" }, { status: 400 })
  }

  // Guard: no duplicate liquidation for this vendor+period
  const { data: existing } = await supabase
    .from("liquidaciones_comision")
    .select("id, estado")
    .eq("vendedor_id", vendedor_id)
    .eq("periodo_mes", periodo_mes)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `Ya existe una liquidación para este período (${existing.estado})`, liquidacionId: existing.id },
      { status: 409 }
    )
  }

  // Step 1: Recalculate all commissions for vendor/period using FINAL close rate
  const { data: recalcRows, error: recalcErr } = await supabase.rpc(
    "fn_recalcular_comisiones_periodo",
    { p_vendedor_id: vendedor_id, p_periodo_mes: periodo_mes }
  )
  if (recalcErr) return NextResponse.json({ error: recalcErr.message }, { status: 500 })

  const recalc = recalcRows?.[0] ?? {
    total_leads: 0, total_cierres: 0, pct_cierre: 0, rango_label: "0% – 2.9%",
    monto_total: 0, monto_confirmado: 0, monto_bloqueado: 0, ordenes_count: 0,
  }

  // Step 2: Insert the liquidation record
  const { data: liquidacion, error: liqErr } = await supabase
    .from("liquidaciones_comision")
    .insert({
      vendedor_id,
      periodo_mes,
      total_leads_meta: recalc.total_leads,
      total_cierres_meta: recalc.total_cierres,
      pct_cierre_meta: recalc.pct_cierre,
      rango_cierre: recalc.rango_label,
      monto_total_comisiones: recalc.monto_total,
      estado: "borrador",
    })
    .select()
    .single()

  if (liqErr) return NextResponse.json({ error: liqErr.message }, { status: 500 })

  // Step 3: Link all comisiones_detalle to this liquidation + mark not provisional
  await supabase
    .from("comisiones_detalle")
    .update({ liquidacion_id: liquidacion.id, is_provisional: false })
    .eq("vendedor_id", vendedor_id)
    .eq("periodo_mes", periodo_mes)

  return NextResponse.json({ liquidacion, recalc }, { status: 201 })
}
