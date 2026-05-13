"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { CreateRutaDialog } from "@/components/logistica/CreateRutaDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Truck,
  Calendar,
  User,
  Package,
  ChevronRight,
  ArrowLeft,
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
  notas: string | null
  despachada_en: string | null
  created_at: string
  pedido_ruta: { id: string; numero_bolsas: number; pedidos: { total: number; total_envio_cobrado: number } | null }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM (Mañana)", PM: "PM (Tarde)", intermedia: "Intermedia", sin_franja: "Sin Franja",
}

const FRANJA_COLORS: Record<string, string> = {
  AM: "bg-sky-100 text-sky-800",
  PM: "bg-orange-100 text-orange-800",
  intermedia: "bg-purple-100 text-purple-800",
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "short", day: "numeric", month: "short",
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RutasPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const router = useRouter()

  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRutas = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("rutas")
      .select(`
        id, nombre, fecha, franja, mensajero_nombre, mensajero_celular,
        estado, ajuste_extra_mensajero, notas, despachada_en, created_at,
        pedido_ruta(id, numero_bolsas, pedidos(total, total_envio_cobrado))
      `)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })

    setRutas((data as Ruta[]) ?? [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchRutas() }, [fetchRutas])

  const rutasEnPreparacion = rutas.filter((r) => r.estado === "en_preparacion")
  const rutasDespachadas = rutas.filter((r) => r.estado === "despachada")

  const RutaCard = ({ ruta }: { ruta: Ruta }) => {
    const totalBolsas = ruta.pedido_ruta.reduce((s, pr) => s + pr.numero_bolsas, 0)
    const totalEnvio = ruta.pedido_ruta.reduce((s, pr) => s + (pr.pedidos?.total_envio_cobrado ?? 0), 0)
    const isDespachada = ruta.estado === "despachada"

    return (
      <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{ruta.nombre}</h3>
                <Badge className={`text-xs ${FRANJA_COLORS[ruta.franja] ?? "bg-gray-100 text-gray-700"}`}>
                  {FRANJA_LABELS[ruta.franja] ?? ruta.franja}
                </Badge>
                {isDespachada && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">Despachada</Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(ruta.fecha)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {ruta.mensajero_nombre}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {ruta.pedido_ruta.length} pedidos · {totalBolsas} bolsas
                </span>
              </div>

              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>Envío cobrado: ${totalEnvio.toLocaleString("es-CO")}</span>
                {ruta.ajuste_extra_mensajero > 0 && (
                  <span className="text-amber-600">
                    +${ruta.ajuste_extra_mensajero.toLocaleString("es-CO")} ajuste
                  </span>
                )}
              </div>
            </div>

            <Link href={`/logistica/rutas/${ruta.id}`}>
              <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
                {isDespachada ? "Ver" : "Gestionar"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/logistica">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Rutas</h1>
            <p className="text-muted-foreground mt-1">Crea y gestiona rutas de entrega.</p>
          </div>
        </div>
        {user && (
          <CreateRutaDialog
            supabase={supabase}
            userId={user.id}
            onCreated={(id) => router.push(`/logistica/rutas/${id}`)}
          />
        )}
      </div>

      {/* En preparación */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              En Preparación ({rutasEnPreparacion.length})
            </h2>
            {rutasEnPreparacion.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <Truck className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No hay rutas activas. Crea una nueva.</p>
                </CardContent>
              </Card>
            ) : (
              rutasEnPreparacion.map((r) => <RutaCard key={r.id} ruta={r} />)
            )}
          </section>

          {rutasDespachadas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Despachadas ({rutasDespachadas.length})
              </h2>
              {rutasDespachadas.slice(0, 10).map((r) => <RutaCard key={r.id} ruta={r} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
