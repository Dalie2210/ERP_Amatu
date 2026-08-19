"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./useAuth"
import type { Seccion, SeccionPermiso } from "@/types"

interface SeccionPermisosState {
  puedeVer: (seccion: Seccion) => boolean
  puedeEditar: (seccion: Seccion) => boolean
  isLoading: boolean
}

/**
 * Para los 4 roles fijos es un passthrough (siempre true, sin fetch) — el
 * gating real para esos roles sigue viviendo en usePermissions()/arrays
 * estáticos, sin cambio de comportamiento. Solo cuando role === 'personalizado'
 * consulta /api/me/permisos y evalúa contra la respuesta.
 */
export function useSeccionPermisos(): SeccionPermisosState {
  const { role, isLoading: authLoading } = useAuth()
  const [permisos, setPermisos] = useState<Record<Seccion, SeccionPermiso> | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (role !== "personalizado") return
    setIsFetching(true)
    fetch("/api/me/permisos")
      .then((res) => res.json())
      .then((data) => setPermisos(data.permisos ?? null))
      .finally(() => setIsFetching(false))
  }, [role])

  if (role !== "personalizado") {
    return { puedeVer: () => true, puedeEditar: () => true, isLoading: authLoading }
  }

  return {
    puedeVer: (seccion) => permisos?.[seccion]?.puede_ver ?? false,
    puedeEditar: (seccion) => permisos?.[seccion]?.puede_editar ?? false,
    isLoading: authLoading || isFetching,
  }
}
