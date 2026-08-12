"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { descargarReporte } from "@/lib/inventario/reportes/descargar"

export function DescargarConteoButton() {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    const fecha = new Date().toISOString().slice(0, 10)
    await descargarReporte("/api/inventario/reportes/conteo", {
      filenameFallback: `conteo_inventario_${fecha}.xlsx`,
    })
    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Descargar Excel de conteo
    </Button>
  )
}
