// Builds a plain-text WhatsApp message listing all deliveries of a route,
// for the logistics operator to copy and send manually to the courier.

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM", PM: "PM", intermedia: "Intermedia", sin_franja: "—",
}

export interface MensajeRutaInfo {
  nombre: string
  fecha: string
  franja: string
  mensajero_nombre: string | null
}

export interface MensajePedidoInfo {
  numero_bolsas: number
  pedidos: {
    numero_pedido: string
    total: number
    franja_horaria: string
    notas_despacho: string | null
    es_contraentrega: boolean
    clientes: {
      nombre_completo: string
      celular: string
      direccion: string
      complemento_direccion: string | null
    } | null
    mascotas: { nombre: string } | null
    zonas_envio: { nombre: string } | null
  } | null
}

function formatFecha(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  })
}

export function buildMensajeMensajero(
  ruta: MensajeRutaInfo,
  asignados: MensajePedidoInfo[]
): string {
  const franjaRuta = FRANJA_LABELS[ruta.franja] ?? ruta.franja
  const lines: string[] = []

  lines.push(`🛵 *Ruta: ${ruta.nombre}* — ${formatFecha(ruta.fecha)} (${franjaRuta})`)
  if (ruta.mensajero_nombre) lines.push(`Mensajero: ${ruta.mensajero_nombre}`)
  lines.push(`Total entregas: ${asignados.length}`)

  asignados.forEach((a, idx) => {
    const p = a.pedidos
    if (!p) return

    const cliente = p.clientes?.nombre_completo ?? "—"
    const mascota = p.mascotas?.nombre ? ` 🐾 ${p.mascotas.nombre}` : ""
    const direccionPartes = [
      p.clientes?.direccion,
      p.clientes?.complemento_direccion,
    ].filter(Boolean)
    const direccion = direccionPartes.join(", ")
    const zona = p.zonas_envio?.nombre ? ` (${p.zonas_envio.nombre})` : ""
    const franja = FRANJA_LABELS[p.franja_horaria] ?? p.franja_horaria
    const total = `$${p.total.toLocaleString("es-CO")}`
    const cobro = p.es_contraentrega ? ` — CONTRAENTREGA: COBRAR ${total}` : ""

    lines.push("")
    lines.push(`*${idx + 1}.* ${cliente}${mascota}`)
    lines.push(`📍 ${direccion}${zona}`)
    if (p.clientes?.celular) lines.push(`📞 ${p.clientes.celular}`)
    lines.push(`📦 ${a.numero_bolsas} bolsa${a.numero_bolsas !== 1 ? "s" : ""} · ${franja}`)
    lines.push(`💲 ${total}${cobro}`)
    if (p.notas_despacho) lines.push(`📝 ${p.notas_despacho}`)
  })

  return lines.join("\n")
}
