import { createClient } from "@/lib/supabase/client"

function getRangoLabel(pct: number): string {
  if (pct < 3) return "0% – 2.9%"
  if (pct < 4) return "3% – 3.9%"
  if (pct <= 5.5) return "4% – 5.5%"
  return "5.6% – 8%"
}

function getDateRange(periodoMes: string): { start: string; end: string } {
  const [year, month] = periodoMes.split("-").map(Number)
  const start = `${periodoMes}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return { start, end }
}

export async function createLiquidacion(
  supabase: ReturnType<typeof createClient>,
  vendedorId: string,
  periodoMes: string
): Promise<{ liquidacionId: string } | { error: string }> {
  const { start, end } = getDateRange(periodoMes)

  // Guard: prevent duplicate liquidacion for same vendor+period
  const { data: existing } = await supabase
    .from("liquidaciones_comision")
    .select("id")
    .eq("vendedor_id", vendedorId)
    .eq("periodo_mes", periodoMes)
    .maybeSingle()

  if (existing) {
    return { error: `Ya existe una liquidación para el período ${periodoMes}` }
  }

  // Total leads registered for this vendor/period
  const { data: leadsData } = await supabase
    .from("leads_meta_ads")
    .select("cantidad_leads")
    .eq("vendedor_id", vendedorId)
    .eq("periodo_mes", periodoMes)

  const totalLeads = leadsData?.reduce((sum: number, r: any) => sum + r.cantidad_leads, 0) ?? 0

  // Meta Ads closures = venta #1 from meta_ads source, not cancelled
  const { count: totalCierres } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("vendedor_id", vendedorId)
    .eq("fuente", "meta_ads")
    .eq("numero_venta_cliente", 1)
    .gte("created_at", start)
    .lt("created_at", end)
    .neq("estado", "devolucion")

  const pctCierre =
    totalLeads > 0
      ? Math.round(((totalCierres ?? 0) / totalLeads) * 100 * 100) / 100
      : 0

  // Fetch all pedidos for this vendor/period with their commission records
  const { data: pedidosData, error: pedidosError } = await supabase
    .from("pedidos")
    .select("id, comisiones_detalle(monto_comision, aplica_comision)")
    .eq("vendedor_id", vendedorId)
    .gte("created_at", start)
    .lt("created_at", end)

  if (pedidosError) return { error: pedidosError.message }

  const totalComisiones =
    pedidosData?.reduce((sum: number, p: any) => {
      const cd = p.comisiones_detalle?.[0]
      return cd?.aplica_comision ? sum + Number(cd.monto_comision) : sum
    }, 0) ?? 0

  // Create the liquidacion record
  const { data: liq, error: liqError } = await supabase
    .from("liquidaciones_comision")
    .insert({
      vendedor_id: vendedorId,
      periodo_mes: periodoMes,
      total_leads_meta: totalLeads,
      total_cierres_meta: totalCierres ?? 0,
      pct_cierre_meta: pctCierre,
      rango_cierre: getRangoLabel(pctCierre),
      monto_total_comisiones: totalComisiones,
    })
    .select("id")
    .single()

  if (liqError) return { error: liqError.message }

  // Link all comisiones_detalle for this vendor/period to this liquidacion
  const pedidoIds = pedidosData?.map((p: any) => p.id as string) ?? []
  if (pedidoIds.length > 0) {
    await supabase
      .from("comisiones_detalle")
      .update({ liquidacion_id: liq.id })
      .in("pedido_id", pedidoIds)
  }

  return { liquidacionId: liq.id }
}
