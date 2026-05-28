"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer, RefreshCw } from "lucide-react"

interface PedidoLinea {
  numero_pedido: string
  cliente: string
  direccion: string
  total: number
  envio: number
  es_contraentrega: boolean
}

interface RutaLiquidacion {
  ruta_id: string
  nombre_ruta: string
  mensajero_nombre: string
  mensajero_celular: string
  estado_ruta: string
  pedidos_totales: number
  pedidos_entregados: number
  total_cobrado_cliente: number
  total_envio_mensajero: number
  ajuste_extra: number
  motivo_ajuste: string | null
  total_adeudado_mensajero: number
  pedidos: PedidoLinea[]
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-CO")}`
}

function LiquidacionContent() {
  const searchParams = useSearchParams()
  const today = new Date().toISOString().split("T")[0]
  const [fecha, setFecha] = useState(searchParams.get("fecha") ?? today)
  const [rutas, setRutas] = useState<RutaLiquidacion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData(f: string) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/logistica/liquidacion-mensajero?fecha=${f}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error")
      setRutas(json.rutas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData(fecha) }, [fecha])

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header — hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Liquidación Diaria de Mensajeros</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumen por mensajero de cobros y pagos del día</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="icon" onClick={() => fetchData(fecha)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Amatu Nutrition — Liquidación Mensajeros</h1>
        <p className="text-sm text-gray-600">Fecha: {fecha}</p>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm text-center py-10">Cargando...</p>
      )}
      {error && (
        <p className="text-destructive text-sm text-center py-10">{error}</p>
      )}

      {!isLoading && rutas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No hay rutas registradas para el {fecha}.</p>
        </div>
      )}

      {rutas.map((ruta) => (
        <div
          key={ruta.ruta_id}
          className="border rounded-xl p-5 space-y-4 bg-white shadow-sm print:break-inside-avoid print:shadow-none print:border"
        >
          {/* Courier header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
            <div>
              <p className="font-bold text-lg">{ruta.mensajero_nombre}</p>
              <p className="text-sm text-muted-foreground">{ruta.mensajero_celular} · Ruta: {ruta.nombre_ruta}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              ruta.estado_ruta === "despachada" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
            }`}>
              {ruta.estado_ruta === "despachada" ? "Despachada" : "En preparación"}
            </span>
          </div>

          {/* Orders table */}
          {ruta.pedidos.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-1 font-medium">Pedido</th>
                  <th className="text-left py-1 font-medium">Cliente</th>
                  <th className="text-right py-1 font-medium">Total</th>
                  <th className="text-right py-1 font-medium">Envío</th>
                  <th className="text-center py-1 font-medium">C/E</th>
                </tr>
              </thead>
              <tbody>
                {ruta.pedidos.map((p) => (
                  <tr key={p.numero_pedido} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{p.numero_pedido}</td>
                    <td className="py-1.5">
                      <p className="font-medium">{p.cliente}</p>
                      <p className="text-xs text-muted-foreground">{p.direccion}</p>
                    </td>
                    <td className="py-1.5 text-right">{fmt(p.total)}</td>
                    <td className="py-1.5 text-right">{fmt(p.envio)}</td>
                    <td className="py-1.5 text-center">
                      {p.es_contraentrega ? (
                        <span className="text-xs font-bold text-red-600">Sí</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {ruta.pedidos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">Sin entregas registradas.</p>
          )}

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm print:bg-gray-100">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pedidos asignados / entregados</span>
              <span className="font-medium">{ruta.pedidos_entregados} / {ruta.pedidos_totales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total cobrado al cliente (contraentregas)</span>
              <span className="font-medium">{fmt(ruta.total_cobrado_cliente)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total envíos (mensajero)</span>
              <span className="font-medium">{fmt(ruta.total_envio_mensajero)}</span>
            </div>
            {ruta.ajuste_extra !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Ajuste extra{ruta.motivo_ajuste ? ` (${ruta.motivo_ajuste})` : ""}
                </span>
                <span className={`font-medium ${ruta.ajuste_extra > 0 ? "text-green-700" : "text-red-700"}`}>
                  {ruta.ajuste_extra > 0 ? "+" : ""}{fmt(ruta.ajuste_extra)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="font-semibold">Total adeudado al mensajero</span>
              <span className="font-bold text-base">{fmt(ruta.total_adeudado_mensajero)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LiquidacionMensajeroPage() {
  return (
    <Suspense fallback={<p className="text-center py-10 text-muted-foreground">Cargando...</p>}>
      <LiquidacionContent />
    </Suspense>
  )
}
