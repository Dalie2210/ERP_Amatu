"use client"

import { use, useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, Columns2, AlignLeft } from "lucide-react"
import Link from "next/link"

interface DetallePedido {
  nombre_snapshot: string
  cantidad: number
  es_magistral: boolean
}

interface EtiquetaData {
  ruta: {
    nombre: string
    fecha: string
    franja: string
    mensajero_nombre: string
    mensajero_celular: string
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
    direccion_entrega: string | null
    complemento_entrega: string | null
    barrio_entrega: string | null
    clientes: { nombre_completo: string; celular: string; direccion: string; complemento_direccion: string | null } | null
    mascotas: { nombre: string } | null
    zonas_envio: { nombre: string } | null
    detalle_pedido: DetallePedido[]
  }[]
}

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM", PM: "PM", intermedia: "Intermedia", sin_franja: "Sin Franja",
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
  const [oneColumn, setOneColumn] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data: ruta } = await supabase
        .from("rutas")
        .select("nombre, fecha, franja, mensajero_nombre, mensajero_celular")
        .eq("id", rutaId)
        .single()

      const { data: asignaciones } = await supabase
        .from("pedido_ruta")
        .select(`
          numero_bolsas, orden_entrega,
          pedidos(
            id, numero_pedido, total, total_envio_cobrado, es_contraentrega, franja_horaria,
            notas_ventas, notas_despacho,
            direccion_entrega, complemento_entrega, barrio_entrega,
            clientes(nombre_completo, celular, direccion, complemento_direccion),
            mascotas(nombre),
            zonas_envio!zona_id(nombre),
            detalle_pedido(nombre_snapshot, cantidad, es_magistral)
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
      {/* Barra de controles — oculta al imprimir */}
      <div className="no-print bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <Link href={`/logistica/rutas/${rutaId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>

          <div className="text-center flex-1">
            <h1 className="font-bold text-base">{data.ruta.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(data.ruta.fecha)} · <span className="font-medium">{data.pedidos.length} etiquetas</span>
            </p>
            {data.ruta.mensajero_nombre && (
              <p className="text-xs text-muted-foreground">
                Mensajero: {data.ruta.mensajero_nombre}
                {data.ruta.mensajero_celular ? ` · ${data.ruta.mensajero_celular}` : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setOneColumn(!oneColumn)}
              title={oneColumn ? "Cambiar a 2 columnas" : "Cambiar a 1 columna"}
            >
              {oneColumn ? <Columns2 className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
              {oneColumn ? "2 col." : "1 col."}
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir PDF
            </Button>
          </div>
        </div>

        <div className="px-4 pb-2 text-xs text-muted-foreground text-center">
          💡 En el diálogo de impresión selecciona <strong>Guardar como PDF</strong> y establece márgenes en <strong>Mínimo</strong> o <strong>Ninguno</strong>.
        </div>
      </div>

      {/* Grid de etiquetas */}
      <div
        className="labels-grid p-4"
        style={{ gridTemplateColumns: oneColumn ? "1fr" : "repeat(2, 1fr)" }}
      >
        {data.pedidos.map((p, idx) => {
          const direccion = p.direccion_entrega ?? p.clientes?.direccion
          const complemento = p.complemento_entrega ?? p.clientes?.complemento_direccion
          const zona = p.barrio_entrega ?? p.zonas_envio?.nombre

          return (
            <div key={p.id} className="label-card">
              {/* Encabezado */}
              <div className="label-header">
                <div className="flex items-center gap-2">
                  <span className="label-title">ETIQUETA</span>
                  <span className="label-seq">#{idx + 1}</span>
                  <span className="label-pedido-num">{p.numero_pedido}</span>
                </div>
                <div className="label-badges">
                  {p.es_contraentrega && <span className="badge-contra">COD</span>}
                  {p.franja_horaria && p.franja_horaria !== "sin_franja" && (
                    <span className="badge-franja">{FRANJA_LABELS[p.franja_horaria] ?? p.franja_horaria}</span>
                  )}
                </div>
              </div>

              {/* Campos etiquetados: cliente, perrito, dirección */}
              <div className="label-fields">
                <div className="label-field">
                  <span className="label-field-key">Cliente:</span>
                  <span className="label-field-val label-client-name">{p.clientes?.nombre_completo ?? "—"}</span>
                </div>
                {p.mascotas && (
                  <div className="label-field">
                    <span className="label-field-key">Perrito:</span>
                    <span className="label-field-val">{p.mascotas.nombre}</span>
                  </div>
                )}
                <div className="label-field label-field-addr">
                  <span className="label-field-key">Dirección:</span>
                  <span className="label-field-val">
                    {direccion}
                    {complemento && <>, {complemento}</>}
                    {zona && <span className="label-zona"> · {zona}</span>}
                  </span>
                </div>
              </div>

              {/* Lista de productos */}
              <div className="label-products-section">
                <div className="label-products-header">Pedido:</div>
                <div className="label-products">
                  {p.detalle_pedido?.length > 0 ? (
                    p.detalle_pedido.map((item, i) => (
                      <div key={i} className="label-product-item">
                        <span className="label-product-name">{item.nombre_snapshot}</span>
                        <span className="label-product-qty">
                          ×{item.cantidad} {item.es_magistral ? "porc." : "uds."}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="label-no-products">Sin productos registrados</span>
                  )}
                </div>
              </div>

              {/* Notas */}
              {(p.notas_despacho || p.notas_ventas) && (
                <div className="label-notes-section">
                  {p.notas_despacho && (
                    <div className="label-notes-despacho">🔶 {p.notas_despacho}</div>
                  )}
                  {p.notas_ventas && (
                    <div className="label-notes-ventas">📝 {p.notas_ventas}</div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="label-footer">
                <span>
                  📦 {p.numero_bolsas} bolsa{p.numero_bolsas !== 1 ? "s" : ""}
                  {p.clientes?.celular && <> · 📞 {p.clientes.celular}</>}
                </span>
                {p.es_contraentrega ? (
                  <span className="label-total-cobrar">COBRAR ${p.total.toLocaleString("es-CO")}</span>
                ) : (
                  <span className="label-total-normal">${p.total.toLocaleString("es-CO")}</span>
                )}
              </div>

              {/* Pie de mensajero */}
              <div className="label-messenger">
                {data.ruta.mensajero_nombre} · {data.ruta.fecha}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @page { margin: 8mm; size: letter portrait; }

        @media print {
          .no-print { display: none !important; }
          [data-sidebar="sidebar"],
          [data-sidebar="sidebar-wrapper"],
          header { display: none !important; }
          body, main { padding: 0 !important; overflow: visible !important; }
          .labels-grid { padding: 0 !important; gap: 6px !important; }
        }

        .labels-grid {
          display: grid;
          gap: 12px;
        }

        .label-card {
          border: 2px solid #000;
          border-radius: 6px;
          padding: 10px 12px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Encabezado */
        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1.5px solid #000;
        }
        .label-title { font-weight: 800; font-size: 13px; letter-spacing: 0.05em; }
        .label-seq { font-size: 11px; color: #555; }
        .label-pedido-num { font-size: 10px; color: #777; font-family: monospace; }
        .label-badges { display: flex; gap: 3px; }
        .badge-contra {
          background: #fee2e2; color: #dc2626;
          font-size: 9px; font-weight: 800;
          padding: 1px 5px; border-radius: 4px; border: 1px solid #dc2626;
        }
        .badge-franja {
          background: #e0f2fe; color: #0369a1;
          font-size: 9px; font-weight: 700;
          padding: 1px 5px; border-radius: 4px;
        }

        /* Campos etiquetados */
        .label-fields { margin-bottom: 8px; }
        .label-field { display: flex; gap: 4px; margin: 3px 0; font-size: 12px; line-height: 1.4; }
        .label-field-key { font-weight: 700; white-space: nowrap; min-width: 70px; }
        .label-field-val { word-break: break-word; flex: 1; }
        .label-client-name { font-weight: 700; font-size: 13px; }
        .label-field-addr .label-field-val { font-size: 11px; }
        .label-zona { color: #666; font-size: 10px; }

        /* Lista de productos */
        .label-products-section {
          border-top: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          padding: 6px 0;
          margin-bottom: 6px;
        }
        .label-products-header { font-weight: 700; font-size: 11px; margin-bottom: 3px; }
        .label-products { padding-left: 8px; }
        .label-product-item {
          font-size: 11px; line-height: 1.6;
          display: flex; justify-content: space-between; gap: 8px;
        }
        .label-product-name { flex: 1; word-break: break-word; }
        .label-product-qty { color: #444; white-space: nowrap; font-weight: 600; }
        .label-no-products { font-size: 11px; color: #999; font-style: italic; }

        /* Notas */
        .label-notes-section { margin-bottom: 6px; }
        .label-notes-despacho {
          background: #fef3c7; color: #92400e;
          font-size: 11px; font-weight: 600;
          padding: 3px 6px; border-radius: 4px; margin: 2px 0;
          word-break: break-word;
        }
        .label-notes-ventas {
          background: #fef9c3; color: #713f12;
          font-size: 11px;
          padding: 3px 6px; border-radius: 4px; margin: 2px 0;
          word-break: break-word;
        }

        /* Footer */
        .label-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 6px; border-top: 1px solid #ddd;
          font-size: 11px; gap: 8px;
        }
        .label-total-cobrar { font-weight: 800; font-size: 13px; color: #dc2626; white-space: nowrap; }
        .label-total-normal { font-size: 11px; color: #555; white-space: nowrap; }
        .label-messenger { font-size: 9px; color: #aaa; text-align: right; margin-top: 3px; }
      `}</style>
    </>
  )
}
