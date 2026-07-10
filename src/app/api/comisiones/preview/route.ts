import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodoMes = searchParams.get("periodo")
  const vendedorIdParam = searchParams.get("vendedor_id")

  if (!periodoMes) return NextResponse.json({ error: "Falta parámetro: periodo" }, { status: 400 })

  // Determine which vendor to show
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  const role = profile?.role
  let targetVendedorId = user.id
  if ((role === "admin" || role === "contable") && vendedorIdParam) {
    targetVendedorId = vendedorIdParam
  }

  // 1. Get close rate stats for this period
  const { data: cierreRows, error: cierreErr } = await supabase.rpc("fn_get_cierre_meta_actual", {
    p_vendedor_id: targetVendedorId,
    p_periodo_mes: periodoMes,
  })
  if (cierreErr) return NextResponse.json({ error: cierreErr.message }, { status: 500 })

  const cierre = cierreRows?.[0] ?? {
    total_leads: 0, total_cierres: 0, pct_cierre: 0,
    rango_label: "0% – 2.9%", config_id: null,
    venta_2_pct: 5, venta_3_pct: 8, venta_4_pct: 0, venta_5_pct: 0, venta_6_pct: 0,
  }

  // 2. Get all commission records for this vendor/period with order data
  const { data: rawComisiones, error: comErr } = await supabase
    .from("comisiones_detalle")
    .select(`
      id, pedido_id, numero_venta_cliente, base_calculo, pct_comision,
      monto_comision, aplica_comision, razon_no_comision, is_provisional,
      liquidacion_id, created_at,
      pedidos (
        numero_pedido, fuente, estado_pago, total, total_envio_cobrado,
        clientes ( nombre_completo, tipo_cliente )
      )
    `)
    .eq("vendedor_id", targetVendedorId)
    .eq("periodo_mes", periodoMes)
    .order("created_at", { ascending: false })

  if (comErr) return NextResponse.json({ error: comErr.message }, { status: 500 })

  // Fuente única de estimación (misma lógica que fn_recalcular_comisiones_periodo).
  const { data: estimaciones, error: estErr } = await supabase.rpc("fn_estimar_comisiones_periodo", {
    p_vendedor_id: targetVendedorId,
    p_periodo_mes: periodoMes,
  })
  if (estErr) return NextResponse.json({ error: estErr.message }, { status: 500 })

  type EstRow = {
    comision_id: string
    pct_comision: number
    monto_comision: number
    aplica_comision: boolean
    razon_no_comision: string | null
  }
  const estPorComision = new Map<string, EstRow>(
    ((estimaciones ?? []) as EstRow[]).map((e) => [e.comision_id, e])
  )

  // Overlay estimated commission (provisional) or stored value (liquidated) por id.
  const comisiones = (rawComisiones ?? []).map((c) => {
    const est = estPorComision.get(c.id)
    if (!est) return c
    return {
      ...c,
      aplica_comision: est.aplica_comision,
      pct_comision: est.pct_comision,
      monto_comision: est.monto_comision,
      razon_no_comision: est.razon_no_comision,
    }
  })

  // 3. Totales provisionales con la tasa de cierre vigente
  let montoGanado = 0
  let montoBloqueado = 0

  for (const c of comisiones) {
    if (!c.aplica_comision) continue
    const pedido = c.pedidos as { estado_pago?: string } | null
    if (pedido?.estado_pago === "confirmado") montoGanado += Number(c.monto_comision)
    else montoBloqueado += Number(c.monto_comision)
  }

  // 4. Get past liquidations for this vendor
  const { data: liquidaciones } = await supabase
    .from("liquidaciones_comision")
    .select("id, periodo_mes, estado, monto_total_comisiones, pct_cierre_meta, rango_cierre, fecha_liquidacion, created_at")
    .eq("vendedor_id", targetVendedorId)
    .order("periodo_mes", { ascending: false })
    .limit(12)

  return NextResponse.json({
    cierre,
    montoGanado,
    montoBloqueado,
    comisiones: comisiones ?? [],
    liquidaciones: liquidaciones ?? [],
  })
}
