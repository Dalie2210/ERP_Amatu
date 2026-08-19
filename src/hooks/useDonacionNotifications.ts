"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

/**
 * Gemelo de useConteoNotifications para donaciones (ERP-DON-03). Solo tiene
 * efecto para admin; requiere `donaciones` en la publicación supabase_realtime
 * (ver 20260821010000_donaciones.sql).
 */
export function useDonacionNotifications(enabled: boolean) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [pendientes, setPendientes] = useState(0)

  const refetchCount = useCallback(async () => {
    const { count } = await supabase
      .from("donaciones")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
    setPendientes(count ?? 0)
  }, [supabase])

  useEffect(() => {
    if (!enabled) return
    void refetchCount()

    const channel = supabase
      .channel("donaciones-pendientes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donaciones", filter: "estado=eq.pendiente" },
        () => {
          setPendientes((p) => p + 1)
          toast.info("Nueva donación pendiente de aprobación", {
            action: { label: "Revisar", onClick: () => router.push("/admin/donaciones?tab=pendientes") },
          })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [enabled, supabase, router, refetchCount])

  return { pendientes }
}
