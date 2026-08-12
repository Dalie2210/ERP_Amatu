import { toast } from "sonner"

interface DescargarReporteOpts {
  method?: "GET" | "POST"
  body?: unknown
  filenameFallback: string
  toastId?: string
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = /filename="?([^"]+)"?/.exec(header)
  return match?.[1] ?? fallback
}

export async function descargarReporte(url: string, opts: DescargarReporteOpts): Promise<void> {
  const toastId = opts.toastId ?? url
  toast.loading("Generando reporte…", { id: toastId })

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      toast.error(payload?.error ?? "No se pudo generar el archivo Excel", { id: toastId })
      return
    }

    const blob = await res.blob()
    const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), opts.filenameFallback)
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)

    const rowCount = res.headers.get("X-Row-Count")
    const truncated = res.headers.get("X-Truncated") === "1"
    const summary = rowCount ? `Reporte listo — ${Number(rowCount).toLocaleString("es-CO")} filas` : "Reporte listo"

    if (truncated) {
      toast.warning(`${summary} (se alcanzó el tope de filas; el reporte quedó truncado)`, { id: toastId })
    } else {
      toast.success(summary, { id: toastId })
    }
  } catch {
    toast.error("No se pudo generar el archivo Excel", { id: toastId })
  }
}
