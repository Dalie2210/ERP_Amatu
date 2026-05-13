"use client"

import { use, useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface EtiquetaData {
  ruta: {
    nombre: string
    fecha: string
    franja: string
    mensajero_nombre: string
  }
  pedidos: {
    id: string
    numero_pedido: string
    total: number
    total_envio_cobrado: number
    es_contraentrega: boolean
    franja_horaria: string
    notas_ventas: string | null
    notas_despacho: string | null
    numero_bolsas: number
    orden_entrega: number | null
    clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
    mascotas: { nombre: string } | null
    zonas_envio: { nombre: string } | null
  }[]
}

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM (Mañana)", PM: "PM (Tarde)", intermedia: "Intermedia", sin_franja: "Sin Franja",
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

export default function EtiquetasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rutaId } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<EtiquetaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: ruta } = await supabase
        .from("rutas")
        .select("nombre, fecha, franja, mensajero_nombre")
        .eq("id", rutaId)
        .single()

      const { data: asignaciones } = await supabase
        .from("pedido_ruta")
        .select(`
          numero_bolsas, orden_entrega,
          pedidos(
            id, numero_pedido, total, total_envio_cobrado, es_contraentrega, franja_horaria,
            notas_ventas, notas_despacho,
            clientes(nombre_completo, celular, direccion, complemento_direccion),
            mascotas(nombre),
            zonas_envio(nombre)
          )
        `)
        .eq("ruta_id", rutaId)
        .order("orden_entrega", { ascending: true, nullsFirst: false })

      if (!ruta || !asignaciones) { setIsLoading(false); return }

      setData({
        ruta: ruta as EtiquetaData["ruta"],
        pedidos: asignaciones.map((a: { numero_bolsas: number; orden_entrega: number | null; pedidos: unknown }) => ({
          ...(a.pedidos as Omit<EtiquetaData["pedidos"][0], "numero_bolsas" | "orden_entrega">),
          numero_bolsas: a.numero_bolsas,
          orden_entrega: a.orden_entrega,
        })),
      })
      setIsLoading(false)
    }
    fetch()
  }, [supabase, rutaId])

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando etiquetas...</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">No se encontró la ruta.</div>
  }

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="no-print flex items-center justify-between p-4 border-b bg-white">
        <Link href={`/logistica/rutas/${rutaId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver a la ruta
          </Button>
        </Link>
        <div className="text-center">
          <h1 className="font-bold">{data.ruta.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(data.ruta.fecha)} · {data.pedidos.length} etiquetas
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      {/* Labels grid — optimized for print */}
      <div className="labels-grid p-4">
        {data.pedidos.map((p, idx) => (
          <div key={p.id} className="label-card">
            {/* Header */}
            <div className="label-header">
              <div>
                <span className="label-order">#{idx + 1}</span>
                <span className="label-pedido">{p.numero_pedido}</span>
              </div>
              <div className="label-badges">
                {p.es_contraentrega && <span className="badge-contra">CONTRAENTREGA</span>}
                <span className="badge-franja">{FRANJA_LABELS[p.franja_horaria] ?? p.franja_horaria}</span>
              </div>
            </div>

            {/* Client info */}
            <div className="label-section">
              <p className="label-client">{p.clientes?.nombre_completo ?? "—"}</p>
              {p.mascotas && <p className="label-pet">🐾 {p.mascotas.nombre}</p>}
            </div>

            {/* Address */}
            <div className="label-section">
              <p className="label-address">{p.clientes?.direccion}</p>
              {p.clientes?.complemento_direccion && (
                <p className="label-complement">{p.clientes.complemento_direccion}</p>
              )}
              {p.zonas_envio && <p className="label-zone">{p.zonas_envio.nombre}</p>}
            </div>

            {/* Contact */}
            <p className="label-phone">📞 {p.clientes?.celular}</p>

            {/* Notes */}
            {p.notas_ventas && (
              <p className="label-notes label-notes-ventas">Ventas: {p.notas_ventas}</p>
            )}
            {p.notas_despacho && (
              <p className="label-notes label-notes-despacho">Despacho: {p.notas_despacho}</p>
            )}

            {/* Footer */}
            <div className="label-footer">
              <span>📦 {p.numero_bolsas} bolsa{p.numero_bolsas !== 1 ? "s" : ""}</span>
              <span className="label-total">
                {p.es_contraentrega ? `COBRAR $${p.total.toLocaleString("es-CO")}` : `$${p.total.toLocaleString("es-CO")}`}
              </span>
            </div>

            {/* Messenger info footer */}
            <div className="label-messenger">
              {data.ruta.mensajero_nombre} · {data.ruta.fecha}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .labels-grid { padding: 0; }
        }
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media print {
          .labels-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
        .label-card {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 10px 12px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px solid #ddd;
        }
        .label-order { font-size: 11px; color: #666; margin-right: 4px; }
        .label-pedido { font-weight: bold; font-size: 12px; font-family: monospace; }
        .label-badges { display: flex; gap: 4px; flex-wrap: wrap; }
        .badge-contra {
          background: #fee2e2; color: #dc2626;
          font-size: 9px; font-weight: bold;
          padding: 1px 4px; border-radius: 4px; border: 1px solid #dc2626;
        }
        .badge-franja {
          background: #e0f2fe; color: #0369a1;
          font-size: 9px; font-weight: bold;
          padding: 1px 4px; border-radius: 4px;
        }
        .label-section { margin-bottom: 4px; }
        .label-client { font-weight: bold; font-size: 14px; margin: 0; }
        .label-pet { font-size: 11px; color: #666; margin: 0; }
        .label-address { font-size: 12px; font-weight: 600; margin: 2px 0 0; }
        .label-complement { font-size: 11px; color: #444; margin: 0; }
        .label-zone { font-size: 10px; color: #666; margin: 0; }
        .label-phone { font-size: 12px; margin: 4px 0; }
        .label-notes { font-size: 10px; margin: 2px 0; padding: 2px 4px; border-radius: 4px; }
        .label-notes-ventas { background: #fef9c3; color: #713f12; }
        .label-notes-despacho { background: #fef3c7; color: #92400e; }
        .label-footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;
          font-size: 12px;
        }
        .label-total { font-weight: bold; font-size: 14px; }
        .label-messenger {
          font-size: 9px; color: #999; text-align: right; margin-top: 4px;
        }
      `}</style>
    </>
  )
}
