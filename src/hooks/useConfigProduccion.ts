"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ConfigProduccion } from "@/types"

/**
 * Configuración de mezcladora predeterminada (ERP-PROD-07).
 *
 * Los límites de tamaño de mezcla y la porción estándar dependen del equipo
 * físico de la planta, así que no viven en el código: se leen de
 * `config_produccion`. Mientras carga se devuelve `null` para que quien la
 * consuma pueda esperar en vez de calcular con números inventados.
 */
export function useConfigProduccion() {
  const supabase = useMemo(() => createClient(), [])
  const [config, setConfig] = useState<ConfigProduccion | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    supabase
      .from("config_produccion")
      .select("*")
      .eq("is_default", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        setConfig((data as ConfigProduccion | null) ?? null)
        setIsLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [supabase])

  return { config, isLoading }
}
