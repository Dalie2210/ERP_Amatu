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

  const REFERIDO_SOURCES = ["referido_veterinario", "referido_entrenador", "referido_cliente"]

  function estimateCommission(
    numeroVenta: number,
    fuente: string,
    esDistribuidor: boolean,
    base: number,
    c: { venta_2_pct: number; venta_3_pct: number; venta_4_pct: number; venta_5_pct: number; venta_6_pct: number }
  ) {
    if (esDistribuidor) return { aplica: false, pct: 0, monto: 0, razon: "Cliente distribuidor" }
    const effectiveVenta = REFERIDO_SOURCES.includes(fuente) ? Math.max(numeroVenta, 2) : numeroVenta
    if (effectiveVenta === 1) return { aplica: false, pct: 0, monto: 0, razon: "Primera venta del cliente" }
    if (effectiveVenta >= 7) return { aplica: false, pct: 0, monto: 0, razon: "Venta 7 o más" }
    const pctMap: Record<number, number> = { 2: c.venta_2_pct, 3: c.venta_3_pct, 4: c.venta_4_pct, 5: c.venta_5_pct, 6: c.venta_6_pct }
    const pct = pctMap[effectiveVenta] ?? 0
    if (pct === 0) return { aplica: false, pct: 0, monto: 0, razon: "Sin comisión en rango actual" }
    return { aplica: true, pct, monto: Math.round(base * pct / 100), razon: null }
  }

  // For provisional rows, overlay estimated commission using current close rate
  const comisiones = (rawComisiones ?? []).map((c) => {
    if (!c.is_provisional) return c
    const pedido = c.pedidos as any
    const est = estimateCommission(
      c.numero_venta_cliente,
      pedido?.fuente ?? "",
      pedido?.clientes?.tipo_cliente === "distribuidor",
      Number(c.base_calculo),
      cierre
    )
    return { ...c, aplica_comision: est.aplica, pct_comision: est.pct, monto_comision: est.monto, razon_no_comision: est.razon }
  })

  // 3. Calculate live provisional totals using current close rate
  let montoGanado = 0
  let montoBloqueado = 0

  for (const c of comisiones) {
    if (!c.aplica_comision) continue
    const pedido = c.pedidos as any
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
