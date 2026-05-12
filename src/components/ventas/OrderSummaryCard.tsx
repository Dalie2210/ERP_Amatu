"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cartStore"
import { calcularDescuentos } from "@/lib/calculators/discounts"
import { calcularComision } from "@/lib/calculators/commissions"
import type { ReglaDescuento, ConfigComision } from "@/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Receipt, CheckCircle } from "lucide-react"

const formatCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

export function OrderSummaryCard() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  
  // Cart Subtotals
  const getSubtotalAlimento = useCartStore((s) => s.getSubtotalAlimento)
  const getSubtotalSnacks = useCartStore((s) => s.getSubtotalSnacks)
  const getSubtotalOtros = useCartStore((s) => s.getSubtotalOtros)
  const items = useCartStore((s) => s.items)
  
  // Client Config
  const esDistribuidor = useCartStore((s) => s.esDistribuidor)
  const pctDescuentoDistribuidor = useCartStore((s) => s.pctDescuentoDistribuidor)
  const tarifaEnvioBase = useCartStore((s) => s.tarifaEnvioBase)
  const clienteId = useCartStore((s) => s.clienteId)
  const mascotaId = useCartStore((s) => s.mascotaId)
  const metodoPago = useCartStore((s) => s.metodoPago)
  const esContraentrega = useCartStore((s) => s.esContraentrega)
  const fuente = useCartStore((s) => s.fuente)
  const fuenteSubtipo = useCartStore((s) => s.fuenteSubtipo)
  const franjaHoraria = useCartStore((s) => s.franjaHoraria)
  const fechaTentativa = useCartStore((s) => s.fechaTentativaEntrega)
  const notasVentas = useCartStore((s) => s.notasVentas)
  const clearCart = useCartStore((s) => s.clearCart)

  // Rules state
  const [reglas, setReglas] = useState<ReglaDescuento[]>([])
  const [configComisiones, setConfigComisiones] = useState<ConfigComision[]>([])

  // Fetch discount rules and commission config on mount
  useEffect(() => {
    const fetchRules = async () => {
      const { data: reglasData } = await supabase
        .from("reglas_descuento")
        .select("*")
        .eq("is_active", true)

      if (reglasData) {
        setReglas(
          reglasData.map((r: any) => ({
            id: r.id,
            montoMinimo: r.monto_minimo,
            pctDescuentoCompra: r.pct_descuento_compra,
            descuentoEnvioFijo: r.descuento_envio_fijo,
          }))
        )
      }

      const { data: configData } = await supabase
        .from("config_comisiones")
        .select("*")
        .eq("is_active", true)

      if (configData) {
        setConfigComisiones(
          configData.map((c: any) => ({
            id: c.id,
            cierreMin: c.cierre_min,
            cierreMax: c.cierre_max,
            venta2Pct: c.venta_2_pct,
            venta3Pct: c.venta_3_pct,
            venta4Pct: c.venta_4_pct,
            venta5Pct: c.venta_5_pct,
            venta6Pct: c.venta_6_pct,
          }))
        )
      }
    }
    fetchRules()
  }, [supabase])

  // Calculate dynamic totals
  const subAlim = getSubtotalAlimento()
  const subSnk = getSubtotalSnacks()
  const subOtr = getSubtotalOtros()

  const calculo = useMemo(() => {
    return calcularDescuentos(
      subAlim,
      subSnk,
      subOtr,
      tarifaEnvioBase,
      reglas,
      esDistribuidor,
      pctDescuentoDistribuidor
    )
  }, [subAlim, subSnk, subOtr, tarifaEnvioBase, reglas, esDistribuidor, pctDescuentoDistribuidor])

  const isValid = items.length > 0 && clienteId && mascotaId && metodoPago

  const handleSave = async () => {
    if (!isValid) return
    setIsSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesión activa")

      const ts = new Date()
      const pnum = `PED-${ts.getFullYear()}${(ts.getMonth()+1).toString().padStart(2,'0')}${ts.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`

      const { data: pedido, error: pedErr } = await supabase.from("pedidos").insert({
        numero_pedido: pnum,
        cliente_id: clienteId!,
        mascota_id: mascotaId,
        vendedor_id: user.id,
        estado: "fecha_tentativa",
        estado_pago: "pendiente",
        fuente: fuente,
        fuente_subtipo: fuenteSubtipo,
        metodo_pago: metodoPago,
        franja_horaria: franjaHoraria,
        es_contraentrega: esContraentrega,
        fecha_tentativa_entrega: fechaTentativa,
        notas_ventas: notasVentas,
        subtotal_alimento: calculo.subtotalAlimento,
        subtotal_snacks: calculo.subtotalSnacks,
        subtotal_otros: calculo.subtotalOtros,
        monto_descuento_compra: calculo.montoDescuentoCompra,
        pct_descuento_compra: calculo.pctDescuentoCompra,
        tarifa_envio_cliente: calculo.tarifaEnvioBase,
        descuento_envio: calculo.descuentoEnvio,
        total_envio_cobrado: calculo.totalEnvioCobrado,
        total: calculo.total,
      }).select().single()

      if (pedErr) throw pedErr

      const detalles = items.map((i) => ({
        pedido_id: pedido.id,
        producto_id: i.productoId,
        variante_id: i.varianteId || null,
        cantidad: i.cantidad,
        precio_unitario_snapshot: i.precioUnitario,
        subtotal: i.subtotal,
        es_magistral: i.esMagistral,
        gramaje_magistral: i.gramajeMagistral || null,
        notas_magistral: i.notasMagistral || null,
        aplica_descuento: i.aplicaDescuento,
        nombre_snapshot: i.presentacion ? `${i.nombre} - ${i.presentacion}` : i.nombre,
      }))

      const { error: detErr } = await supabase.from("detalle_pedido").insert(detalles)
      if (detErr) throw detErr

      // Calculate and record commission (if applicable)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`

      // Fetch this vendor's Meta Ads close rate for current month
      const { data: metaLeads } = await supabase
        .from("leads_meta_ads")
        .select("cantidad_leads")
        .eq("vendedor_id", user.id)
        .eq("periodo_mes", currentMonth)
        .single()

      const { data: metaCierres } = await supabase
        .from("pedidos")
        .select("id")
        .eq("vendedor_id", user.id)
        .eq("fuente", "meta_ads")
        .eq("numero_venta_cliente", 1)
        .gte("created_at", `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`)

      const totalLeads = metaLeads?.cantidad_leads || 1
      const totalCierres = metaCierres?.length || 0
      const pctCierreMeta = totalLeads > 0 ? (totalCierres / totalLeads) * 100 : 0

      const baseCalculo = (calculo.total - calculo.totalEnvioCobrado) * 0.95
      const calcComision = calcularComision(
        pedido.numero_venta_cliente,
        pedido.fuente,
        baseCalculo,
        pctCierreMeta,
        configComisiones,
        esDistribuidor
      )

      const { error: comErr } = await supabase.from("comisiones_detalle").insert({
        pedido_id: pedido.id,
        numero_venta_cliente: pedido.numero_venta_cliente,
        base_calculo: baseCalculo,
        pct_comision: calcComision.pctComision,
        monto_comision: calcComision.montoComision,
        aplica_comision: calcComision.aplicaComision,
        razon_no_comision: calcComision.razonNoComision || null,
      })

      if (comErr) {
        console.error("Comisión no guardada:", comErr)
        // Don't throw - the order is already created
      }

      clearCart()
      toast.success("Pedido guardado exitosamente")
      router.push(`/ventas/${pedido.id}`)
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar el pedido")
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-sm bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Resumen del Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Alimento (aplica dcto)</span>
            <span>{formatCOP(calculo.subtotalAlimento)}</span>
          </div>
          {calculo.subtotalSnacks > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Snacks</span>
              <span>{formatCOP(calculo.subtotalSnacks)}</span>
            </div>
          )}
          {calculo.subtotalOtros > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Otros</span>
              <span>{formatCOP(calculo.subtotalOtros)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Discounts */}
        <div className="space-y-1.5 text-sm">
          {calculo.montoDescuentoCompra > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span className="flex items-center gap-2">
                Descuento Compra
                <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 bg-emerald-50 text-emerald-700">
                  {calculo.pctDescuentoCompra}%
                </Badge>
              </span>
              <span>-{formatCOP(calculo.montoDescuentoCompra)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-muted-foreground">
            <span>Envío Base</span>
            <span>{formatCOP(calculo.tarifaEnvioBase)}</span>
          </div>
          
          {calculo.descuentoEnvio > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Descuento Envío</span>
              <span>-{formatCOP(calculo.descuentoEnvio)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-bold">Total a Cobrar</span>
          <span className="text-2xl font-black text-primary">
            {formatCOP(calculo.total)}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full h-12 text-lg font-bold gap-2" 
          disabled={!isValid || isSaving}
          onClick={handleSave}
        >
          <CheckCircle className="h-5 w-5" />
          {isSaving ? "Guardando..." : isValid ? "Confirmar Pedido" : "Faltan datos"}
        </Button>
      </CardFooter>
    </Card>
  )
}
