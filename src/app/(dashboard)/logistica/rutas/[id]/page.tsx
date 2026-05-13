"use client"

import { use, useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  ArrowLeft, Truck, Package, User, Calendar, Phone, MapPin, AlertTriangle,
  Printer, Plus, Trash2, ChevronUp, ChevronDown, Send,
} from "lucide-react"
import Link from "next/link"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ruta {
  id: string
  nombre: string
  fecha: string
  franja: string
  mensajero_nombre: string
  mensajero_celular: string
  estado: string
  ajuste_extra_mensajero: number
  motivo_ajuste: string | null
  notas: string | null
  despachada_en: string | null
}

interface PedidoAsignado {
  id: string          // pedido_ruta.id
  pedido_id: string
  numero_bolsas: number
  orden_entrega: number | null
  pedidos: {
    id: string
    numero_pedido: string
    total: number
    total_envio_cobrado: number
    franja_horaria: string
    notas_ventas: string | null
    notas_despacho: string | null
    es_contraentrega: boolean
    clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
    mascotas: { nombre: string } | null
    zonas_envio: { nombre: string } | null
  } | null
}

interface PedidoDisponible {
  id: string
  numero_pedido: string
  total: number
  total_envio_cobrado: number
  franja_horaria: string
  notas_ventas: string | null
  notas_despacho: string | null
  es_contraentrega: boolean
  clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
  mascotas: { nombre: string } | null
  zonas_envio: { nombre: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM", PM: "PM", intermedia: "Interm.", sin_franja: "—",
}

const FRANJA_COLORS: Record<string, string> = {
  AM: "bg-sky-100 text-sky-800",
  PM: "bg-orange-100 text-orange-800",
  intermedia: "bg-purple-100 text-purple-800",
  sin_franja: "bg-gray-100 text-gray-600",
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RutaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rutaId } = use(params)
  const supabase = useMemo(() => createClient(), [])

  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [asignados, setAsignados] = useState<PedidoAsignado[]>([])
  const [disponibles, setDisponibles] = useState<PedidoDisponible[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDispatching, setIsDispatching] = useState(false)
  const [bolsasInput, setBolsasInput] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    const [rutaRes, asignadosRes] = await Promise.all([
      supabase.from("rutas").select("*").eq("id", rutaId).single(),
      supabase
        .from("pedido_ruta")
        .select(`
          id, pedido_id, numero_bolsas, orden_entrega,
          pedidos(
            id, numero_pedido, total, total_envio_cobrado, franja_horaria,
            notas_ventas, notas_despacho, es_contraentrega,
            clientes(nombre_completo, celular, direccion, complemento_direccion),
            mascotas(nombre),
            zonas_envio(nombre)
          )
        `)
        .eq("ruta_id", rutaId)
        .order("orden_entrega", { ascending: true, nullsFirst: false }),
    ])

    setRuta(rutaRes.data as Ruta ?? null)
    const asignadosList = (asignadosRes.data as PedidoAsignado[]) ?? []
    setAsignados(asignadosList)

    // Fetch available listo_despacho orders NOT in any active route
    const asignadosPedidoIds = asignadosList.map((a) => a.pedido_id)

    const { data: dispData } = await supabase
      .from("pedidos")
      .select(`
        id, numero_pedido, total, total_envio_cobrado, franja_horaria,
        notas_ventas, notas_despacho, es_contraentrega,
        clientes(nombre_completo, celular, direccion, complemento_direccion),
        mascotas(nombre),
        zonas_envio(nombre)
      `)
      .eq("estado", "listo_despacho")
      .eq("estado_pago", "confirmado")
      .not("id", "in", `(${asignadosPedidoIds.join(",")})`)
      .order("created_at", { ascending: true })

    setDisponibles((dispData as PedidoDisponible[]) ?? [])
    setIsLoading(false)
  }, [supabase, rutaId])

  useEffect(() => { fetchData() }, [fetchData])

  // Assign a pedido to this ruta
  const handleAsignar = async (pedido: PedidoDisponible) => {
    const { error } = await supabase.from("pedido_ruta").insert({
      ruta_id: rutaId,
      pedido_id: pedido.id,
      numero_bolsas: 0,
      orden_entrega: asignados.length + 1,
    })
    if (error) { toast.error("Error al asignar pedido"); return }
    toast.success(`Pedido ${pedido.numero_pedido} asignado a la ruta`)
    fetchData()
  }

  // Remove pedido from ruta
  const handleRemover = async (asignacionId: string, numeroPedido: string) => {
    const { error } = await supabase.from("pedido_ruta").delete().eq("id", asignacionId)
    if (error) { toast.error("Error al remover pedido"); return }
    toast.success(`Pedido ${numeroPedido} removido de la ruta`)
    fetchData()
  }

  // Update bolsas count
  const handleUpdateBolsas = async (asignacionId: string, bolsas: number) => {
    if (isNaN(bolsas) || bolsas < 0) return
    await supabase.from("pedido_ruta").update({ numero_bolsas: bolsas }).eq("id", asignacionId)
  }

  // Reorder delivery sequence
  const handleReorder = async (asignacionId: string, direction: "up" | "down") => {
    const idx = asignados.findIndex((a) => a.id === asignacionId)
    if (idx === -1) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= asignados.length) return

    const current = asignados[idx]
    const swap = asignados[swapIdx]

    await Promise.all([
      supabase.from("pedido_ruta").update({ orden_entrega: swapIdx + 1 }).eq("id", current.id),
      supabase.from("pedido_ruta").update({ orden_entrega: idx + 1 }).eq("id", swap.id),
    ])
    fetchData()
  }

  // Dispatch route
  const handleDespachar = async () => {
    if (asignados.length === 0) {
      toast.error("Agrega pedidos a la ruta antes de despachar")
      return
    }
    setIsDispatching(true)
    try {
      const res = await fetch("/api/despachar-ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rutaId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error desconocido")
      toast.success(`Ruta despachada — ${json.pedidosCount} pedidos notificados`)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al despachar la ruta")
    } finally {
      setIsDispatching(false)
    }
  }

  // ─── Summary calculations ─────────────────────────────────────────────────

  const totalBolsas = asignados.reduce((s, a) => s + a.numero_bolsas, 0)
  const totalEnvio = asignados.reduce((s, a) => s + (a.pedidos?.total_envio_cobrado ?? 0), 0)
  const totalPedidos = asignados.reduce((s, a) => s + (a.pedidos?.total ?? 0), 0)
  const isDespachada = ruta?.estado === "despachada"

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-[900px] mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!ruta) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p>Ruta no encontrada</p>
        <Link href="/logistica/rutas"><Button variant="outline">Volver</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/logistica/rutas">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-heading tracking-tight">{ruta.nombre}</h1>
              <Badge className={FRANJA_COLORS[ruta.franja] ?? "bg-gray-100 text-gray-700"}>
                {FRANJA_LABELS[ruta.franja] ?? ruta.franja}
              </Badge>
              {isDespachada && (
                <Badge className="bg-emerald-100 text-emerald-800">Despachada</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(ruta.fecha)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {ruta.mensajero_nombre}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {ruta.mensajero_celular}
              </span>
            </div>
          </div>
        </div>

        {!isDespachada && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/logistica/rutas/${rutaId}/etiquetas`} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" /> Etiquetas
              </Button>
            </Link>
            <Button
              onClick={handleDespachar}
              disabled={isDispatching || asignados.length === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isDispatching ? "Despachando..." : "Despachar Ruta"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pedidos", value: asignados.length, icon: Package },
          { label: "Bolsas Totales", value: totalBolsas, icon: Package },
          { label: "Total Envío", value: `$${totalEnvio.toLocaleString("es-CO")}`, icon: Truck },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assigned orders */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Pedidos en esta Ruta ({asignados.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {asignados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
              <Package className="h-8 w-8 opacity-30" />
              <p className="text-sm">Agrega pedidos desde la sección de abajo</p>
            </div>
          ) : (
            asignados.map((a, idx) => {
              const p = a.pedidos
              return (
                <div
                  key={a.id}
                  className="border rounded-lg p-3 space-y-2 bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {p?.numero_pedido}
                          </span>
                          {p?.es_contraentrega && (
                            <Badge className="bg-red-100 text-red-800 text-[10px] h-4 px-1.5">C/E</Badge>
                          )}
                          <Badge className={`text-[10px] h-4 px-1.5 ${FRANJA_COLORS[p?.franja_horaria ?? "sin_franja"] ?? ""}`}>
                            {FRANJA_LABELS[p?.franja_horaria ?? "sin_franja"]}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{p?.clientes?.nombre_completo}</p>
                        {p?.mascotas && <p className="text-xs text-muted-foreground">🐾 {p.mascotas.nombre}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isDespachada && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6"
                            onClick={() => handleReorder(a.id, "up")}
                            disabled={idx === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6"
                            onClick={() => handleReorder(a.id, "down")}
                            disabled={idx === asignados.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemover(a.id, p?.numero_pedido ?? "")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-7">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>{p?.clientes?.direccion}</span>
                    {p?.clientes?.complemento_direccion && (
                      <span>· {p.clientes.complemento_direccion}</span>
                    )}
                    {p?.zonas_envio && <span className="ml-1">({p.zonas_envio.nombre})</span>}
                  </div>

                  {p?.notas_despacho && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 ml-7">
                      {p.notas_despacho}
                    </p>
                  )}

                  <div className="flex items-center justify-between pl-7">
                    <span className="text-sm font-semibold">
                      ${(p?.total ?? 0).toLocaleString("es-CO")}
                      {p?.es_contraentrega && (
                        <span className="text-xs text-red-600 ml-1">— CONTRAENTREGA</span>
                      )}
                    </span>
                    {!isDespachada && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Bolsas:</span>
                        <Input
                          type="number"
                          min="0"
                          className="w-16 h-7 text-xs text-center"
                          defaultValue={a.numero_bolsas}
                          onChange={(e) => setBolsasInput((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          onBlur={(e) => handleUpdateBolsas(a.id, parseInt(e.target.value, 10))}
                        />
                      </div>
                    )}
                    {isDespachada && (
                      <span className="text-xs text-muted-foreground">
                        {a.numero_bolsas} bolsa{a.numero_bolsas !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {asignados.length > 0 && (
            <div className="border-t pt-3 flex items-center justify-between text-sm font-medium">
              <span>Total del recorrido</span>
              <span>${totalPedidos.toLocaleString("es-CO")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available orders */}
      {!isDespachada && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Disponibles para Agregar ({disponibles.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Pedidos en estado &quot;Listo para Despacho&quot; sin ruta asignada.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {disponibles.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                No hay pedidos listos disponibles. Mueve pedidos a &quot;Listo para Despacho&quot; desde el Kanban.
              </div>
            ) : (
              disponibles.map((p) => (
                <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.numero_pedido}</span>
                      <Badge className={`text-[10px] h-4 px-1.5 ${FRANJA_COLORS[p.franja_horaria] ?? ""}`}>
                        {FRANJA_LABELS[p.franja_horaria]}
                      </Badge>
                      {p.es_contraentrega && (
                        <Badge className="bg-red-100 text-red-800 text-[10px] h-4 px-1.5">C/E</Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{p.clientes?.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.clientes?.direccion} {p.zonas_envio ? `(${p.zonas_envio.nombre})` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-sm">${p.total.toLocaleString("es-CO")}</span>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => handleAsignar(p)}>
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Courier settlement summary */}
      {isDespachada && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Liquidación del Mensajero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cobrado al cliente (envío)</span>
                <span className="font-medium">${totalEnvio.toLocaleString("es-CO")}</span>
              </div>
              {ruta.ajuste_extra_mensajero > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Ajuste adicional ({ruta.motivo_ajuste ?? "sin motivo"})</span>
                  <span className="font-medium">+${ruta.ajuste_extra_mensajero.toLocaleString("es-CO")}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total a pagar al mensajero</span>
                <span>${(totalEnvio + (ruta.ajuste_extra_mensajero ?? 0)).toLocaleString("es-CO")}</span>
              </div>
            </div>
            {ruta.despachada_en && (
              <p className="text-xs text-muted-foreground mt-3">
                Despachada el {new Date(ruta.despachada_en).toLocaleString("es-CO")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
