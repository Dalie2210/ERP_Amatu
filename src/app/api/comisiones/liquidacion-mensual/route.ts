import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPeriodoMes } from "@/lib/calculators/commissions"

// Protected by a shared secret so only n8n (or manual trigger) can call this.
// Set N8N_WEBHOOK_SECRET in .env.local.
export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    const authHeader = req.headers.get("x-webhook-secret")
    if (authHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const periodo_mes: string = body.periodo_mes ?? getPeriodoMes()

  const supabase = await createClient()

  // Get all active vendors
  const { data: vendors, error: vendorErr } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "vendedor")
    .eq("is_active", true)

  if (vendorErr) {
    return NextResponse.json({ error: vendorErr.message }, { status: 500 })
  }

  const results: {
    vendedor_id: string
    nombre: string
    monto_confirmado: number
    comisiones_trasladadas: number
    liquidacion_id: string | null
    error?: string
  }[] = []

  for (const vendor of vendors ?? []) {
    const { data, error } = await supabase.rpc("fn_liquidar_periodo_mensual", {
      p_vendedor_id: vendor.id,
      p_periodo_mes: periodo_mes,
    })

    if (error) {
      results.push({
        vendedor_id: vendor.id,
        nombre: vendor.full_name ?? vendor.email,
        monto_confirmado: 0,
        comisiones_trasladadas: 0,
        liquidacion_id: null,
        error: error.message,
      })
    } else {
      const row = Array.isArray(data) ? data[0] : data
      results.push({
        vendedor_id: vendor.id,
        nombre: vendor.full_name ?? vendor.email,
        monto_confirmado: row?.monto_confirmado ?? 0,
        comisiones_trasladadas: row?.comisiones_trasladadas ?? 0,
        liquidacion_id: row?.liquidacion_id ?? null,
      })
    }
  }

  return NextResponse.json({
    periodo_mes,
    total_vendedores: results.length,
    results,
  })
}
