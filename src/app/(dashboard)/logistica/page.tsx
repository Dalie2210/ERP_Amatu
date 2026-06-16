"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskCardDialog } from "@/components/logistica/TaskCardDialog"
import { BolsasPopup } from "@/components/logistica/BolsasPopup"
import { useAuth } from "@/hooks/useAuth"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  ClipboardList,
  RotateCcw,
  ArrowLeftRight,
  Send,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { ESTADO_LOGISTICA_LABELS } from "@/lib/logistica/estadoLabels"
import { DND_ALLOWED_DROPS } from "@/lib/logistica/transitions"
import type { EstadoPedido } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PedidoKanban {
  id: string
  numero_pedido: string
  estado: EstadoPedido
  estado_pago: string
  franja_horaria: string
  fecha_tentativa_entrega: string | null
  notas_ventas: string | null
  notas_despacho: string | null
  total: number
  es_contraentrega: boolean
  numero_bolsas: number
  clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
  mascotas: { nombre: string } | null
  zonas_envio: { nombre: string } | null
  pedido_ruta: { ruta_id: string; numero_bolsas: number; rutas: { nombre: string; estado: string } | null }[]
  notas_logistica_count?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM", PM: "PM", intermedia: "Interm.", sin_franja: "—",
}

const FRANJA_COLORS: Record<string, string> = {
  AM: "bg-sky-100 text-sky-800",
  PM: "bg-orange-100 text-orange-800",
  intermedia: "bg-purple-100 text-purple-800",
  sin_franja: "bg-gray-100 text-gray-600",
}

const KANBAN_COLUMNS = [
  {
    key: "por_confirmar",
    label: "Por Confirmar",
    icon: ClipboardList,
    headerClass: "text-amber-700",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50",
    states: ["fecha_tentativa"],
    targetEstado: "fecha_tentativa" as EstadoPedido,
  },
  {
    key: "confirmado",
    label: "Confirmado",
    icon: CheckCircle,
    headerClass: "text-green-700",
    borderClass: "border-green-200",
    bgClass: "bg-green-50",
    states: ["confirmado"],
    targetEstado: "confirmado" as EstadoPedido,
  },
  {
    key: "preparacion",
    label: "En Preparación",
    icon: Package,
    headerClass: "text-blue-700",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50",
    states: ["en_preparacion", "espera_produccion"],
    targetEstado: "en_preparacion" as EstadoPedido,
  },
  {
    key: "listo",
    label: "Listo para Despacho",
    icon: Truck,
    headerClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    bgClass: "bg-indigo-50",
    states: ["listo_despacho"],
    targetEstado: "listo_despacho" as EstadoPedido,
  },
  {
    key: "despachado",
    label: "Despachado",
    icon: Send,
    headerClass: "text-gray-600",
    borderClass: "border-gray-200",
    bgClass: "bg-gray-50",
    states: ["despachado"],
    targetEstado: "despachado" as EstadoPedido,
  },
  {
    key: "devolucion",
    label: "Devolución",
    icon: RotateCcw,
    headerClass: "text-red-700",
    borderClass: "border-red-200",
    bgClass: "bg-red-50",
    states: ["devolucion"],
    targetEstado: "devolucion" as EstadoPedido,
  },
  {
    key: "cambio",
    label: "Cambio",
    icon: ArrowLeftRight,
    headerClass: "text-orange-700",
    borderClass: "border-orange-200",
    bgClass: "bg-orange-50",
    states: ["cambio", "parcial"],
    targetEstado: "cambio" as EstadoPedido,
  },
] as const

// ─── Card UI ──────────────────────────────────────────────────────────────────

function PedidoCard({
  pedido,
  onClick,
}: {
  pedido: PedidoKanban
  onClick: () => void
}) {
  const rutaActiva = pedido.pedido_ruta?.[0]
  const isEsperaProduccion = pedido.estado === "espera_produccion"
  const hasNotasVentas = !!pedido.notas_ventas?.trim()
  const notasLogisticaCount = pedido.notas_logistica_count ?? 0
  const bolsas = pedido.numero_bolsas > 0 ? pedido.numero_bolsas : (rutaActiva?.numero_bolsas ?? 0)

  return (
    <div
      className="relative bg-white rounded-lg border shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer active:shadow-inner"
      onClick={onClick}
    >
      {(hasNotasVentas || notasLogisticaCount > 0) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {hasNotasVentas && (
            <span
              className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
              title={`Nota del vendedor: ${pedido.notas_ventas}`}
            />
          )}
          {notasLogisticaCount > 0 && (
            <span
              className="h-6 w-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-xs font-bold ring-2 ring-white"
              title={`${notasLogisticaCount} nota${notasLogisticaCount !== 1 ? 's' : ''} de producción/logística`}
            >
              {notasLogisticaCount}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {pedido.numero_pedido}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 pr-4">
          {isEsperaProduccion && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px] h-4 px-1.5">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Prod.
            </Badge>
          )}
          {pedido.es_contraentrega && (
            <Badge className="bg-red-100 text-red-800 text-[10px] h-4 px-1.5">C/E</Badge>
          )}
          <Badge className={`text-[10px] h-4 px-1.5 ${FRANJA_COLORS[pedido.franja_horaria] ?? FRANJA_COLORS.sin_franja}`}>
            {FRANJA_LABELS[pedido.franja_horaria] ?? "—"}
          </Badge>
        </div>
      </div>

      <div>
        <p className="font-medium text-sm leading-tight">
          {pedido.clientes?.nombre_completo ?? "—"}
        </p>
        {pedido.mascotas && (
          <p className="text-xs text-muted-foreground">🐾 {pedido.mascotas.nombre}</p>
        )}
      </div>

      {pedido.zonas_envio && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{pedido.zonas_envio.nombre}</span>
        </div>
      )}

      {hasNotasVentas && (
        <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-1 leading-tight line-clamp-1">
          ⚠ {pedido.notas_ventas}
        </p>
      )}

      {rutaActiva && (
        <div className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1">
          Ruta: {rutaActiva.rutas?.nombre ?? "—"}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-semibold text-sm">
          ${pedido.total.toLocaleString("es-CO")}
        </span>
        <div className="flex items-center gap-2">
          {bolsas > 0 && (
            <span className="text-xs text-indigo-600 font-medium">
              {bolsas} 🛍️
            </span>
          )}
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}

// ─── Draggable card ────────────────────────────────────────────────────────────

function DraggableCard({
  pedido,
  onCardClick,
}: {
  pedido: PedidoKanban
  onCardClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40 cursor-grabbing" : "cursor-grab active:cursor-grabbing"}
    >
      <PedidoCard pedido={pedido} onClick={onCardClick} />
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  children,
  count,
  isLoading,
}: {
  col: typeof KANBAN_COLUMNS[number]
  children: React.ReactNode
  count: number
  isLoading: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const Icon = col.icon

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 ${col.borderClass} ${col.bgClass} p-3 transition-all duration-150
        ${isOver ? "ring-2 ring-offset-1 ring-blue-400 scale-[1.01]" : ""}`}
    >
      <div className={`flex items-center justify-between mb-3 ${col.headerClass}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h3 className="font-semibold text-sm">{col.label}</h3>
        </div>
        <span className="text-xs font-bold bg-white/70 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>

      <div className="space-y-2 min-h-[120px]">
        {isLoading ? (
          <ColumnSkeleton />
        ) : count === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border-2 border-dashed rounded-lg opacity-40">
            Arrastra aquí
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogisticaPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, role: userRole } = useAuth()
  const [userName, setUserName] = useState("")
  const [pedidos, setPedidos] = useState<PedidoKanban[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  // TaskCardDialog state
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)

  // BolsasPopup state (for drag-to-listo)
  const [bolsasPending, setBolsasPending] = useState<{
    pedidoId: string
    numeroPedido: string
    defaultBolsas: number
    snapshot: PedidoKanban[]
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Fetch userName once
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { full_name: string } | null }) => { if (data?.full_name) setUserName(data.full_name) })
  }, [user?.id, supabase])

  // Cutoff date for despachado column: last 7 days
  const despachadoCutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }, [])

  const fetchPedidos = useCallback(async () => {
    setIsLoading(true)

    // Active states query
    const { data: active } = await supabase
      .from("pedidos")
      .select(`
        id, numero_pedido, estado, estado_pago, franja_horaria, fecha_tentativa_entrega,
        notas_ventas, notas_despacho, total, es_contraentrega, numero_bolsas,
        clientes(nombre_completo, celular, direccion, complemento_direccion),
        mascotas(nombre),
        zonas_envio!zona_id(nombre),
        pedido_ruta(ruta_id, numero_bolsas, rutas(nombre, estado))
      `)
      .in("estado", ["fecha_tentativa", "confirmado", "en_preparacion", "espera_produccion", "listo_despacho", "devolucion", "cambio", "parcial"])
      .order("fecha_tentativa_entrega", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })

    // Despachado: last 7 days only
    const { data: despachados } = await supabase
      .from("pedidos")
      .select(`
        id, numero_pedido, estado, estado_pago, franja_horaria, fecha_tentativa_entrega,
        notas_ventas, notas_despacho, total, es_contraentrega, numero_bolsas,
        clientes(nombre_completo, celular, direccion, complemento_direccion),
        mascotas(nombre),
        zonas_envio!zona_id(nombre),
        pedido_ruta(ruta_id, numero_bolsas, rutas(nombre, estado))
      `)
      .eq("estado", "despachado")
      .gte("updated_at", despachadoCutoff)
      .order("updated_at", { ascending: false })
      .limit(30)

    const all = [...(active ?? []), ...(despachados ?? [])]

    // Get count of pending notes for each order
    const { data: notasData } = await supabase
      .from("notas_logistica")
      .select("pedido_id")
      .eq("completada", false)
      .in("pedido_id", all.map(p => p.id))

    // Create a map of pedido_id -> count
    const notasCountMap: Record<string, number> = {}
    if (notasData) {
      notasData.forEach((nota: { pedido_id: string }) => {
        notasCountMap[nota.pedido_id] = (notasCountMap[nota.pedido_id] ?? 0) + 1
      })
    }

    // Add note count to each pedido
    const pedidosWithNotes = all.map(p => ({
      ...p,
      notas_logistica_count: notasCountMap[p.id] ?? 0
    }))

    setPedidos(pedidosWithNotes as PedidoKanban[])
    setIsLoading(false)
  }, [supabase, despachadoCutoff])

  useEffect(() => {
    fetchPedidos()
    const channelPedidos = supabase
      .channel("pedidos-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchPedidos)
      .subscribe()
    const channelNotas = supabase
      .channel("notas-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notas_logistica" }, fetchPedidos)
      .subscribe()
    return () => {
      supabase.removeChannel(channelPedidos)
      supabase.removeChannel(channelNotas)
    }
  }, [fetchPedidos, supabase])

  function openCard(pedidoId: string) {
    setOpenCardId(pedidoId)
    setCardDialogOpen(true)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const pedidoId = active.id as string
    const targetColKey = over.id as string
    const pedido = pedidos.find((p) => p.id === pedidoId)
    if (!pedido) return

    const sourceCol = KANBAN_COLUMNS.find((c) => (c.states as readonly string[]).includes(pedido.estado))
    if (!sourceCol || sourceCol.key === targetColKey) return

    const allowed = DND_ALLOWED_DROPS[sourceCol.key] ?? []
    if (!allowed.includes(targetColKey)) return

    const targetCol = KANBAN_COLUMNS.find((c) => c.key === targetColKey)
    if (!targetCol) return

    // Special case: dragging to "listo" requires bolsas popup
    if (targetColKey === "listo") {
      setBolsasPending({
        pedidoId,
        numeroPedido: pedido.numero_pedido,
        defaultBolsas: pedido.numero_bolsas > 0 ? pedido.numero_bolsas : 1,
        snapshot: pedidos,
      })
      // Optimistically show card in new column while popup is open
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estado: "listo_despacho" } : p))
      )
      return
    }

    const updates: Record<string, string> = { estado: targetCol.targetEstado }
    if (sourceCol.key === "por_confirmar") updates.estado_pago = "confirmado"

    const snapshot = pedidos
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, estado: targetCol.targetEstado } : p))
    )

    supabase
      .from("pedidos")
      .update(updates)
      .eq("id", pedidoId)
      .then(async (result: { error: { message: string } | null }) => {
        if (result.error) {
          toast.error("Error al actualizar el pedido")
          setPedidos(snapshot)
          return
        }
        // Log activity
        if (user?.id) {
          await supabase.from("pedido_actividad").insert({
            pedido_id: pedidoId,
            tipo: "estado_cambiado",
            usuario_id: user.id,
            usuario_nombre: userName,
            payload: { de: pedido.estado, a: targetCol.targetEstado },
          })
        }
        toast.success(`Pedido movido a "${ESTADO_LOGISTICA_LABELS[targetCol.targetEstado]}"`)
      })
  }

  async function handleBolsasConfirm(bolsas: number) {
    if (!bolsasPending || !user?.id) return
    const { pedidoId, snapshot } = bolsasPending
    const pedido = snapshot.find((p) => p.id === pedidoId)
    setBolsasPending(null)

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "listo_despacho", numero_bolsas: bolsas })
      .eq("id", pedidoId)

    if (error) {
      toast.error("Error al actualizar el pedido")
      setPedidos(snapshot)
      return
    }

    await supabase.from("pedido_actividad").insert([
      {
        pedido_id: pedidoId,
        tipo: "estado_cambiado",
        usuario_id: user.id,
        usuario_nombre: userName,
        payload: { de: pedido?.estado ?? "en_preparacion", a: "listo_despacho" },
      },
      {
        pedido_id: pedidoId,
        tipo: "bolsas_asignadas",
        usuario_id: user.id,
        usuario_nombre: userName,
        payload: { numero_bolsas: bolsas },
      },
    ])

    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, estado: "listo_despacho", numero_bolsas: bolsas } : p))
    )
    toast.success(`Listo para despacho · ${bolsas} bolsa${bolsas !== 1 ? "s" : ""}`)
  }

  function handleBolsasCancel() {
    if (!bolsasPending) return
    setPedidos(bolsasPending.snapshot)
    setBolsasPending(null)
  }

  const activePedido = activeId ? pedidos.find((p) => p.id === activeId) : null

  const colCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const col of KANBAN_COLUMNS) {
      counts[col.key] = pedidos.filter((p) => (col.states as readonly string[]).includes(p.estado)).length
    }
    return counts
  }, [pedidos])

  const totalActivos = useMemo(
    () => pedidos.filter((p) => !["despachado", "devolucion", "cambio", "parcial"].includes(p.estado)).length,
    [pedidos]
  )

  const stats = [
    { label: "Por Confirmar", count: colCounts["por_confirmar"] ?? 0, color: "text-amber-700" },
    { label: "En Preparación", count: (colCounts["preparacion"] ?? 0), color: "text-blue-700" },
    { label: "Listos Despacho", count: colCounts["listo"] ?? 0, color: "text-indigo-700" },
    { label: "Devoluciones", count: (colCounts["devolucion"] ?? 0) + (colCounts["cambio"] ?? 0), color: "text-red-700" },
    { label: "Total Activos", count: totalActivos, color: "text-foreground font-bold" },
  ]

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Logística</h1>
          <p className="text-muted-foreground mt-1">
            Kanban de pedidos — haz clic en una tarjeta para ver el detalle completo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPedidos} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          <Link href="/logistica/rutas">
            <Button className="gap-2">
              <Truck className="h-4 w-4" /> Gestionar Rutas
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border shadow-sm px-4 py-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto border rounded-lg bg-gradient-to-b from-slate-50 to-white pb-4">
          <div className="flex gap-3 p-3 w-max">
            {KANBAN_COLUMNS.map((col) => {
              const colPedidos = pedidos.filter((p) => (col.states as readonly string[]).includes(p.estado))
              return (
                <div key={col.key} className="w-[320px] flex-shrink-0">
                  <DroppableColumn
                    col={col}
                    count={colPedidos.length}
                    isLoading={isLoading}
                  >
                    {colPedidos.map((p) => (
                      <DraggableCard
                        key={p.id}
                        pedido={p}
                        onCardClick={() => openCard(p.id)}
                      />
                    ))}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>
        </div>

        <DragOverlay>
          {activePedido ? (
            <div className="opacity-95 rotate-1 shadow-2xl pointer-events-none">
              <PedidoCard pedido={activePedido} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Card Dialog */}
      {openCardId && user?.id && (
        <TaskCardDialog
          pedidoId={openCardId}
          open={cardDialogOpen}
          onOpenChange={(v) => {
            setCardDialogOpen(v)
            if (!v) setOpenCardId(null)
          }}
          onStateChange={fetchPedidos}
          userRole={userRole}
          userId={user.id}
          userName={userName}
          supabase={supabase}
        />
      )}

      {/* Bolsas popup (for drag-to-listo) */}
      {bolsasPending && (
        <BolsasPopup
          open={!!bolsasPending}
          pedidoNumero={bolsasPending.numeroPedido}
          defaultValue={bolsasPending.defaultBolsas}
          onConfirm={handleBolsasConfirm}
          onCancel={handleBolsasCancel}
        />
      )}
    </div>
  )
}
