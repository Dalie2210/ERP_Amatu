"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OrderEditDialog } from "@/components/ventas/OrderEditDialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Receipt, User, MapPin, PawPrint, Truck, CheckCircle } from "lucide-react"

const formatCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

interface DetalleItem {
  id: string
  nombre_snapshot: string
  cantidad: number
  precio_unitario_snapshot: number
  subtotal: number
  es_magistral: boolean
  aplica_descuento: boolean
}

interface Pedido {
  id: string
  numero_pedido: string
  estado: string
  estado_pago: string
  franja_horaria: string
  metodo_pago: string | null
  es_contraentrega: boolean
  fecha_tentativa_entrega: string | null
  fuente: string | null
  notas_ventas: string | null
  subtotal_alimento: number
  subtotal_snacks: number
  subtotal_otros: number
  monto_descuento_compra: number
  pct_descuento_compra: number
  tarifa_envio_cliente: number
  descuento_envio: number
  total_envio_cobrado: number
  total: number
  fue_editado: boolean
  editado_por_id: string | null
  editado_en: string | null
  created_at: string
  clientes: { nombre_completo: string; celular: string; direccion: string } | null
  mascotas: { nombre: string } | null
  zonas_envio: { nombre: string } | null
  users: { full_name: string } | null
  editor: { full_name: string } | null
}

export default function PedidoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [detalles, setDetalles] = useState<DetalleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchPedido = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: pData } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nombre_completo, celular, direccion),
          mascotas(nombre),
          zonas_envio(nombre),
          users!pedidos_vendedor_id_fkey(full_name),
          editor:users!pedidos_editado_por_id_fkey(full_name)
        `)
        .eq("id", id)
        .single()

      if (pData) {
        setPedido(pData as Pedido)
        const { data: dData } = await supabase
          .from("detalle_pedido")
          .select("id, nombre_snapshot, cantidad, precio_unitario_snapshot, subtotal, es_magistral, aplica_descuento")
          .eq("pedido_id", id)
          .order("created_at")

        setDetalles(dData || [])
      }
      setIsLoading(false)
    }

    if (id) fetchPedido()
  }, [id, supabase])

  const canEditOrder = pedido &&
    currentUser &&
    pedido.estado !== "listo_despacho" &&
    pedido.estado !== "despachado" &&
    pedido.estado !== "devolucion" &&
    pedido.estado !== "parcial"

  const handleEditSuccess = async () => {
    if (id) {
      const { data: pData } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nombre_completo, celular, direccion),
          mascotas(nombre),
          zonas_envio(nombre),
          users!pedidos_vendedor_id_fkey(full_name),
          editor:users!pedidos_editado_por_id_fkey(full_name)
        `)
        .eq("id", id)
        .single()

      if (pData) setPedido(pData as Pedido)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Pedido no encontrado</h2>
        <Button variant="link" onClick={() => router.push("/ventas")}>Volver a ventas</Button>
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-heading tracking-tight">
              {pedido.numero_pedido}
            </h1>
            {pedido.fue_editado && (
              <Badge variant="destructive">EDITADO</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Creado el {new Date(pedido.created_at).toLocaleString("es-CO")} por {pedido.users?.full_name}
          </p>
          {pedido.fue_editado && pedido.editado_en && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Editado el {new Date(pedido.editado_en).toLocaleString("es-CO")} por {pedido.editor?.full_name}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <OrderEditDialog
            pedidoId={pedido.id}
            currentFranja={pedido.franja_horaria}
            currentFechaTentativa={pedido.fecha_tentativa_entrega}
            currentNotas={pedido.notas_ventas}
            currentEstadoPago={pedido.estado_pago}
            currentMetodoPago={pedido.metodo_pago}
            canEdit={canEditOrder || false}
            onEditSuccess={handleEditSuccess}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Items del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detalles.map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{d.nombre_snapshot}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {d.cantidad} x {formatCOP(d.precio_unitario_snapshot)}
                        </span>
                        {d.es_magistral && <Badge variant="secondary" className="text-[10px]">Magistral</Badge>}
                        {d.aplica_descuento && <Badge variant="outline" className="text-[10px]">Aplica dcto</Badge>}
                      </div>
                    </div>
                    <p className="font-semibold">{formatCOP(d.subtotal)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Cliente y Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{pedido.clientes?.nombre_completo}</p>
                  <p className="text-muted-foreground">{pedido.clientes?.celular}</p>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {pedido.clientes?.direccion} <br/>
                    {pedido.zonas_envio?.nombre}
                  </span>
                </div>
                {pedido.mascotas && (
                  <div className="flex gap-2 items-center text-muted-foreground">
                    <PawPrint className="h-4 w-4" />
                    <span>Mascota: {pedido.mascotas.nombre}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" /> Logística
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant="outline">{pedido.estado.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Franja</span>
                  <span className="font-medium">{pedido.franja_horaria.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tentativa</span>
                  <span className="font-medium">{pedido.fecha_tentativa_entrega || "No asignada"}</span>
                </div>
                {pedido.notas_ventas && (
                  <div className="bg-amber-50 border border-amber-100 p-2 rounded text-amber-800 text-xs mt-2">
                    <strong>Notas:</strong> {pedido.notas_ventas}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Financial Summary */}
        <div>
          <Card className="bg-primary/5 border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Alimento</span>
                  <span>{formatCOP(pedido.subtotal_alimento)}</span>
                </div>
                {pedido.subtotal_snacks > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Snacks</span>
                    <span>{formatCOP(pedido.subtotal_snacks)}</span>
                  </div>
                )}
                {pedido.subtotal_otros > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Otros</span>
                    <span>{formatCOP(pedido.subtotal_otros)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                {pedido.monto_descuento_compra > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Dcto Compra ({pedido.pct_descuento_compra}%)</span>
                    <span>-{formatCOP(pedido.monto_descuento_compra)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío Base</span>
                  <span>{formatCOP(pedido.tarifa_envio_cliente)}</span>
                </div>
                {pedido.descuento_envio > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Dcto Envío</span>
                    <span>-{formatCOP(pedido.descuento_envio)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center pt-1">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-black text-primary">
                  {formatCOP(pedido.total)}
                </span>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estado Pago</span>
                  <Badge variant={pedido.estado_pago === "confirmado" ? "default" : "outline"}>
                    {pedido.estado_pago}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Método</span>
                  <span className="text-sm font-medium">{pedido.metodo_pago?.toUpperCase() ?? "N/A"}</span>
                </div>
                {pedido.es_contraentrega && (
                  <Badge variant="secondary" className="w-full justify-center">
                    Pago Contraentrega
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
