import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#111",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#7c3aed",
    paddingBottom: 12,
  },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#7c3aed" },
  subtitle: { fontSize: 11, color: "#555", marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#374151" },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 160, color: "#6b7280" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  colPedido: { width: 90 },
  colFecha: { width: 80 },
  colBase: { width: 90, textAlign: "right" },
  colPct: { width: 50, textAlign: "right" },
  colMonto: { flex: 1, textAlign: "right" },
  totalsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f5f3ff",
    borderRadius: 4,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { color: "#6b7280" },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  footer: { marginTop: 32, color: "#9ca3af", fontSize: 8, textAlign: "center" },
})

interface LiquidacionData {
  id: string
  periodo_mes: string
  vendedor_id: string
  monto_total_comisiones: number
  estado: string
  fecha_liquidacion: string | null
  users: { full_name: string | null; email: string } | null
}

interface ComisionRow {
  id: string
  numero_venta_cliente: number
  base_calculo: number
  pct_comision: number
  monto_comision: number
  aplica_comision: boolean
  razon_no_comision: string | null
  pedidos: {
    numero_pedido: string
    created_at: string
    clientes: { nombre_completo: string } | null
  } | null
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-CO")}`
}

function buildPdf(liq: LiquidacionData, comisiones: ComisionRow[]) {
  const vendorName = liq.users?.full_name ?? liq.users?.email ?? "—"
  const [year, month] = liq.periodo_mes.split("-")
  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  const periodoLabel = `${monthNames[parseInt(month) - 1]} ${year}`

  const aplicadas = comisiones.filter((c) => c.aplica_comision)
  const sinComision = comisiones.filter((c) => !c.aplica_comision)

  const e = React.createElement

  return e(Document, {},
    e(Page, { size: "A4", style: styles.page },
      // Header
      e(View, { style: styles.header },
        e(Text, { style: styles.brand }, "Amatu Nutrition"),
        e(Text, { style: styles.subtitle }, `Liquidación de Comisiones — ${periodoLabel}`)
      ),
      // Vendor info
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, "Datos del Vendedor"),
        e(View, { style: styles.row },
          e(Text, { style: styles.label }, "Vendedor:"),
          e(Text, { style: styles.value }, vendorName)
        ),
        e(View, { style: styles.row },
          e(Text, { style: styles.label }, "Período:"),
          e(Text, { style: styles.value }, periodoLabel)
        ),
        e(View, { style: styles.row },
          e(Text, { style: styles.label }, "Estado:"),
          e(Text, { style: styles.value }, liq.estado.toUpperCase())
        ),
        liq.fecha_liquidacion
          ? e(View, { style: styles.row },
              e(Text, { style: styles.label }, "Fecha Liquidación:"),
              e(Text, { style: styles.value },
                new Date(liq.fecha_liquidacion).toLocaleDateString("es-CO")
              )
            )
          : null
      ),
      // Comisiones aplicadas
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, `Comisiones Aplicadas (${aplicadas.length})`),
        e(View, { style: styles.tableHeader },
          e(Text, { style: styles.colPedido }, "Pedido"),
          e(Text, { style: styles.colFecha }, "Fecha"),
          e(Text, { style: styles.colBase }, "Base"),
          e(Text, { style: styles.colPct }, "% Com."),
          e(Text, { style: styles.colMonto }, "Monto")
        ),
        ...aplicadas.map((c) =>
          e(View, { key: c.id, style: styles.tableRow },
            e(Text, { style: styles.colPedido }, c.pedidos?.numero_pedido ?? "—"),
            e(Text, { style: styles.colFecha },
              c.pedidos?.created_at
                ? new Date(c.pedidos.created_at).toLocaleDateString("es-CO")
                : "—"
            ),
            e(Text, { style: styles.colBase }, fmt(c.base_calculo)),
            e(Text, { style: styles.colPct }, `${c.pct_comision}%`),
            e(Text, { style: styles.colMonto }, fmt(c.monto_comision))
          )
        ),
        aplicadas.length === 0
          ? e(View, { style: { padding: 8 } },
              e(Text, { style: { color: "#9ca3af" } }, "Sin comisiones aplicadas en este período.")
            )
          : null
      ),
      // No-commission rows (summary)
      sinComision.length > 0
        ? e(View, { style: styles.section },
            e(Text, { style: styles.sectionTitle }, `Sin Comisión (${sinComision.length})`),
            ...sinComision.map((c) =>
              e(View, { key: c.id, style: styles.tableRow },
                e(Text, { style: styles.colPedido }, c.pedidos?.numero_pedido ?? "—"),
                e(Text, { style: { flex: 1, color: "#9ca3af" } }, c.razon_no_comision ?? "—")
              )
            )
          )
        : null,
      // Totals
      e(View, { style: styles.totalsBox },
        e(View, { style: styles.totalRow },
          e(Text, { style: styles.totalLabel }, "Total comisiones del período:"),
          e(Text, { style: styles.totalValue }, fmt(liq.monto_total_comisiones))
        )
      ),
      // Footer
      e(Text, { style: styles.footer },
        `Amatu Nutrition — Documento generado el ${new Date().toLocaleDateString("es-CO")}`
      )
    )
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: liq, error: liqErr } = await supabase
    .from("liquidaciones_comision")
    .select("*, users(full_name, email)")
    .eq("id", id)
    .single()

  if (liqErr || !liq) {
    return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 })
  }

  const { data: comisiones, error: comErr } = await supabase
    .from("comisiones_detalle")
    .select(`
      id, numero_venta_cliente, base_calculo, pct_comision, monto_comision,
      aplica_comision, razon_no_comision,
      pedidos(numero_pedido, created_at, clientes(nombre_completo))
    `)
    .eq("vendedor_id", liq.vendedor_id)
    .eq("periodo_mes", liq.periodo_mes)
    .order("created_at", { ascending: true })

  if (comErr) {
    return NextResponse.json({ error: comErr.message }, { status: 500 })
  }

  const doc = buildPdf(liq as unknown as LiquidacionData, comisiones as unknown as ComisionRow[])
  const pdfBuffer = await renderToBuffer(doc)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="liquidacion-${liq.periodo_mes}-${id.slice(0, 8)}.pdf"`,
    },
  })
}
