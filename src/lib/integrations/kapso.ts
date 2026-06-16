import type { RutaDespachoPayload } from "@/types"

const FRANJA_LABEL: Record<string, string> = {
  AM: "AM",
  PM: "PM",
  intermedia: "Intermedia",
  sin_franja: "—",
}

export async function triggerRutaWhatsApp(payload: RutaDespachoPayload): Promise<void> {
  const baseUrl = process.env.KAPSO_API_BASE_URL
  const apiKey = process.env.KAPSO_API_KEY
  const workflowId = process.env.KAPSO_WORKFLOW_RUTA_ID

  if (!baseUrl || !apiKey || !workflowId) return

  // One execution per order so each gets an individual WhatsApp message to the courier
  await Promise.allSettled(
    payload.pedidos.map((p) => {
      const direccionCompleta = [p.direccion, p.complementoDireccion]
        .filter(Boolean)
        .join(", ")

      return fetch(`${baseUrl}/platform/v1/workflows/${workflowId}/executions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({
          workflow_execution: {
            vars: {
              mensajero_celular: payload.mensajeroCelular,
              nombre_mascota: p.nombreMascota,
              nombre_cliente: p.nombreCliente,
              franja_horaria: FRANJA_LABEL[p.franjaHoraria] ?? p.franjaHoraria,
              notas_ventas: p.notasVentas || "—",
              direccion_completa: direccionCompleta,
              notas_despacho: p.notasDespacho || "—",
              celular_cliente: p.celular,
              numero_bolsas: String(p.numeroBolsas),
              total: p.total.toLocaleString("es-CO"),
            },
          },
        }),
      })
    })
  )
}
