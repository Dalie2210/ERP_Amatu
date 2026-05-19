"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UpdateEstadoDialog } from "@/components/logistica/UpdateEstadoDialog"
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
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ClipboardList,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface PedidoKanban {
  id: string
  numero_pedido: string
  estado: string
  estado_pago: string
  franja_horaria: string
  fecha_tentativa_entrega: string | null
  notas_ventas: string | null
  notas_despacho: string | null
  total: number
  es_contraentrega: boolean
  clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
  mascotas: { nombre: string } | null
  zonas_envio: { nombre: string } | null
  pedido_ruta: { ruta_id: string; numero_bolsas: number; rutas: { nombre: string; estado: string } | null }[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

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
    targetEstado: "fecha_tentativa",
  },
  {
    key: "confirmado",
    label: "Confirmado",
    icon: CheckCircle,
    headerClass: "text-green-700",
    borderClass: "border-green-200",
    bgClass: "bg-green-50",
    states: ["confirmado"],
    targetEstado: "confirmado",
  },
  {
    key: "preparacion",
    label: "En Preparación",
    icon: Package,
    headerClass: "text-blue-700",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50",
    states: ["en_preparacion", "espera_produccion"],
    targetEstado: "en_preparacion",
  },
  {
    key: "listo",
    label: "Listo para Despacho",
    icon: Truck,
    headerClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    bgClass: "bg-indigo-50",
    states: ["listo_despacho"],
    targetEstado: "listo_despacho",
  },
  {
    key: "despachado",
    label: "Despachado",
    icon: Clock,
    headerClass: "text-gray-600",
    borderClass: "border-gray-200",
    bgClass: "bg-gray-50",
    states: ["despachado"],
    targetEstado: "despachado",
  },
]

// Only forward transitions are allowed; invalid drops snap back automatically
const ALLOWED_DROPS: Record<string, string> = {
  por_confirmar: "confirmado",
  confirmado: "preparacion",
  preparacion: "listo",
  listo: "despachado",
}

// ─── Pure card UI (no DnD wiring) ─────────────────────────────────────────────

function PedidoCard({
  pedido,
  supabase,
  onRefresh,
}: {
  pedido: PedidoKanban
  supabase: ReturnType<typeof createClient>
  onRefresh: () => void
}) {
  const rutaActiva = pedido.pedido_ruta?.[0]
  const isEsperaProduccion = pedido.estado === "espera_produccion"
  const isDespachado = pedido.estado === "despachado"
  const isPorConfirmar = pedido.estado === "fecha_tentativa"

  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {pedido.numero_pedido}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEsperaProduccion && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px] h-4 px-1.5">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Prod.
            </Badge>
          )}
          {pedido.es_contraentrega && (
            <Badge className="bg-red-100 text-red-800 text-[10px] h-4 px-1.5">
              C/E
            </Badge>
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

      {pedido.notas_despacho && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 leading-tight">
          {pedido.notas_despacho}
        </p>
      )}

      {rutaActiva && (
        <div className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1">
          Ruta: {rutaActiva.rutas?.nombre ?? "—"}
          {rutaActiva.numero_bolsas > 0 && ` · ${rutaActiva.numero_bolsas} bolsa${rutaActiva.numero_bolsas !== 1 ? "s" : ""}`}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-semibold text-sm">
          ${pedido.total.toLocaleString("es-CO")}
        </span>
        {isDespachado ? (
          <Link href={`/ventas/${pedido.id}`}>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
              Ver
            </Button>
          </Link>
        ) : isPorConfirmar ? (
          <UpdateEstadoDialog
            pedidoId={pedido.id}
            estadoActual={pedido.estado}
            numeroPedido={pedido.numero_pedido}
            supabase={supabase}
            onSuccess={onRefresh}
            trigger={
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-amber-700 hover:text-amber-900">
                Confirmar <ChevronRight className="h-3 w-3" />
              </Button>
            }
          />
        ) : (
          <UpdateEstadoDialog
            pedidoId={pedido.id}
            estadoActual={pedido.estado}
            numeroPedido={pedido.numero_pedido}
            supabase={supabase}
            onSuccess={onRefresh}
            trigger={
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                Avanzar <ChevronRight className="h-3 w-3" />
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}

// ─── Draggable card wrapper ────────────────────────────────────────────────────

function DraggableCard({
  pedido,
  supabase,
  onRefresh,
}: {
  pedido: PedidoKanban
  supabase: ReturnType<typeof createClient>
  onRefresh: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40 cursor-grabbing" : "cursor-grab active:cursor-grabbing"}
    >
      <PedidoCard pedido={pedido} supabase={supabase} onRefresh={onRefresh} />
    </div>
  )
}

// ─── Droppable column wrapper ──────────────────────────────────────────────────

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
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border-2 border-dashed border-current/20 rounded-lg opacity-50">
            Arrastra aquí
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
  const [pedidos, setPedidos] = useState<PedidoKanban[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const fetchPedidos = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("pedidos")
      .select(`
        id, numero_pedido, estado, estado_pago, franja_horaria, fecha_tentativa_entrega,
        notas_ventas, notas_despacho, total, es_contraentrega,
        clientes(nombre_completo, celular, direccion, complemento_direccion),
        mascotas(nombre),
        zonas_envio(nombre),
        pedido_ruta(ruta_id, numero_bolsas, rutas(nombre, estado))
      `)
      .in("estado", ["fecha_tentativa", "confirmado", "en_preparacion", "espera_produccion", "listo_despacho", "despachado"])
      .order("fecha_tentativa_entrega", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })

    setPedidos((data as PedidoKanban[]) ?? [])
    setIsLoading(false)
  }, [supabase])

  // Initial load + realtime subscription
  useEffect(() => {
    fetchPedidos()
    const channel = supabase
      .channel("pedidos-kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, fetchPedidos)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPedidos, supabase])

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

    const sourceCol = KANBAN_COLUMNS.find((c) => c.states.includes(pedido.estado))
    if (!sourceCol || sourceCol.key === targetColKey) return
    if (ALLOWED_DROPS[sourceCol.key] !== targetColKey) return

    const targetCol = KANBAN_COLUMNS.find((c) => c.key === targetColKey)!
    const updates: Record<string, string> = { estado: targetCol.targetEstado }
    if (sourceCol.key === "por_confirmar") updates.estado_pago = "confirmado"

    const snapshot = pedidos
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, ...updates } : p))
    )

    supabase
      .from("pedidos")
      .update(updates)
      .eq("id", pedidoId)
      .then((result: { error: { message: string } | null }) => {
        if (result.error) {
          toast.error("Error al actualizar el pedido")
          setPedidos(snapshot)
        } else {
          toast.success(`Pedido movido a ${targetCol.label}`)
        }
      })
  }

  const activePedido = activeId ? pedidos.find((p) => p.id === activeId) : null

  // Column counts
  const porConfirmarCount = pedidos.filter((p) => p.estado === "fecha_tentativa").length
  const confirmedCount    = pedidos.filter((p) => p.estado === "confirmado").length
  const preparacionCount  = pedidos.filter((p) => ["en_preparacion", "espera_produccion"].includes(p.estado)).length
  const listoCount        = pedidos.filter((p) => p.estado === "listo_despacho").length

  const stats = [
    { label: "Por Confirmar", count: porConfirmarCount, color: "text-amber-700" },
    { label: "Confirmados",   count: confirmedCount,    color: "text-green-700" },
    { label: "En Preparación",count: preparacionCount,  color: "text-blue-700"  },
    { label: "Listos",        count: listoCount,        color: "text-indigo-700"},
    { label: "Total Activos", count: porConfirmarCount + confirmedCount + preparacionCount + listoCount, color: "text-foreground font-bold" },
  ]

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Logística</h1>
          <p className="text-muted-foreground mt-1">
            Kanban de pedidos — arrastra las tarjetas para actualizar el estado
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colPedidos = pedidos.filter((p) => col.states.includes(p.estado))
            return (
              <DroppableColumn
                key={col.key}
                col={col}
                count={colPedidos.length}
                isLoading={isLoading}
              >
                {colPedidos.map((p) => (
                  <DraggableCard
                    key={p.id}
                    pedido={p}
                    supabase={supabase}
                    onRefresh={fetchPedidos}
                  />
                ))}
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activePedido ? (
            <div className="opacity-95 rotate-1 shadow-2xl pointer-events-none">
              <PedidoCard
                pedido={activePedido}
                supabase={supabase}
                onRefresh={fetchPedidos}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
