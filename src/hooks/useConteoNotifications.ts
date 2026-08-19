"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

/**
 * Solo tiene efecto para admin (montado condicionalmente desde el layout).
 * Mantiene el conteo de conteos pendientes y muestra un toast en tiempo real
 * cuando se registra uno nuevo (requiere conteos_inventario en la
 * publicación supabase_realtime, ver 20260819020000_conteo_aprobacion_schema.sql).
 */
export function useConteoNotifications(enabled: boolean) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [pendientes, setPendientes] = useState(0)

  const refetchCount = useCallback(async () => {
    const { count } = await supabase
      .from("conteos_inventario")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
    setPendientes(count ?? 0)
  }, [supabase])

  useEffect(() => {
    if (!enabled) return
    void refetchCount()

    const channel = supabase
      .channel("conteos-pendientes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conteos_inventario", filter: "estado=eq.pendiente" },
        () => {
          setPendientes((p) => p + 1)
          toast.info("Nuevo conteo pendiente de aprobación", {
            action: { label: "Revisar", onClick: () => router.push("/inventario/conteo?tab=aprobaciones") },
          })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [enabled, supabase, router, refetchCount])

  return { pendientes }
}
