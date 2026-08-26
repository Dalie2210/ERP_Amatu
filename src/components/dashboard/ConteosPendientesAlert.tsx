"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

/**
 * Aviso en el dashboard de admin cuando hay conteos de inventario pendientes
 * de aprobación (ERP-ADM-02). Complementa la campana del header — no
 * comparte su suscripción realtime para evitar un toast duplicado al montar
 * ambos a la vez; aquí basta un fetch puntual al entrar al dashboard.
 */
export function ConteosPendientesAlert() {
  const supabase = useMemo(() => createClient(), [])
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from("conteos_inventario")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .then(({ count }) => setCount(count ?? 0))
  }, [supabase])

  if (!count) return null

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900">
            Hay <span className="font-semibold">{count}</span> conteo(s) de inventario con diferencias
            esperando tu aprobación.
          </p>
        </div>
        <Link href="/inventario/conteo?tab=aprobaciones">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
            Revisar ahora
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
