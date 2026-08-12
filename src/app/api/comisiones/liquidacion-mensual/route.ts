import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPeriodoMes } from "@/lib/calculators/commissions"
import type { Database } from "@/types/database.types"

// Endpoint que MUTA DINERO para todos los vendedores: liquida el período
// completo. Dos vías de acceso, ambas explícitas:
//   1. Job programado — cabecera `x-cron-secret` que coincide con CRON_SECRET.
//   2. Disparo manual — sesión autenticada con rol admin.
// Si CRON_SECRET no está definida, la vía 1 queda deshabilitada (503) en lugar
// de dejar el endpoint abierto, que era el comportamiento anterior.
export async function POST(req: NextRequest) {
  const cronHeader = req.headers.get("x-cron-secret")
  const secret = process.env.CRON_SECRET

  // `supabase` es el cliente con el que se ejecutará la liquidación.
  let supabase: SupabaseClient<Database>

  if (cronHeader !== null) {
    // Vía 1 — job programado.
    if (!secret) {
      return NextResponse.json(
        { error: "CRON_SECRET no está configurado en el servidor" },
        { status: 503 }
      )
    }
    if (cronHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY no está configurado en el servidor" },
        { status: 503 }
      )
    }
    // El job no tiene sesión: sin service role, RLS le devolvería 0 vendedores
    // y la liquidación sería un no-op silencioso.
    supabase = createAdminClient()
  } else {
    // Vía 2 — disparo manual desde la app: exige sesión de admin activa.
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const { data: profile } = await session
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single()
    if (profile?.role !== "admin" || profile.is_active === false) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }
    supabase = session
  }

  const body = await req.json().catch(() => ({}))
  const periodo_mes: string = body.periodo_mes ?? getPeriodoMes()

  // Get all active vendors
  const { data: vendors, error: vendorErr } = await supabase
    .from("users")
    .select("id, full_name")
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
        nombre: vendor.full_name,
        monto_confirmado: 0,
        comisiones_trasladadas: 0,
        liquidacion_id: null,
        error: error.message,
      })
    } else {
      const row = Array.isArray(data) ? data[0] : data
      results.push({
        vendedor_id: vendor.id,
        nombre: vendor.full_name,
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
