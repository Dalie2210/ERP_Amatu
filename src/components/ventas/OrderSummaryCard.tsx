"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cartStore"
import { createOrder } from "@/lib/pedidos/createOrder"
import { calcularDescuentos } from "@/lib/calculators/discounts"
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

      const result = await createOrder(supabase, {
        clienteId: clienteId!,
        mascotaId: mascotaId!,
        vendedorId: user.id,
        items,
        fuente,
        fuenteSubtipo,
        metodoPago: metodoPago!,
        franjaHoraria,
        esContraentrega,
        fechaTentativaEntrega: fechaTentativa,
        notasVentas,
        esDistribuidor,
        pctDescuentoDistribuidor,
        tarifaEnvioBase,
        reglas,
        configComisiones,
      })

      clearCart()
      toast.success("Pedido guardado exitosamente")
      router.push(`/ventas/${result.pedidoId}`)
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
