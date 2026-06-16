"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Promocion } from "@/types"

export function useActivePromociones(): {
  promociones: Promocion[]
  isLoading: boolean
} {
  const supabase = useMemo(() => createClient(), [])
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("promociones")
        .select(
          `
          id, nombre, tipo, is_active,
          producto_id, variante_id, paga_x, lleva_extra,
          trigger_producto_id, trigger_variante_id,
          regalo_producto_id, regalo_variante_id, regalo_cantidad,
          producto:productos!producto_id (
            nombre,
            categorias_producto ( slug )
          ),
          variante:producto_variantes!variante_id (
            sku, presentacion
          ),
          trigger_producto:productos!trigger_producto_id (
            nombre
          ),
          regalo_producto:productos!regalo_producto_id (
            nombre,
            categorias_producto ( slug )
          ),
          regalo_variante:producto_variantes!regalo_variante_id (
            sku, presentacion
          )
        `
        )
        .eq("is_active", true)

      if (error) {
        console.error("Error cargando promociones:", error)
        setIsLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Promocion[] = (data ?? []).map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        isActive: row.is_active,
        // Tipo 1
        productoId: row.producto_id ?? undefined,
        varianteId: row.variante_id ?? undefined,
        pagaX: row.paga_x ?? undefined,
        llevaExtra: row.lleva_extra ?? undefined,
        productoNombre: row.producto?.nombre ?? undefined,
        productoSku: row.variante?.sku ?? undefined,
        productoPresentacion: row.variante?.presentacion ?? undefined,
        productoCategoria:
          row.producto?.categorias_producto?.slug ?? undefined,
        // Tipo 2
        triggerProductoId: row.trigger_producto_id ?? undefined,
        triggerVarianteId: row.trigger_variante_id ?? undefined,
        regaloProductoId: row.regalo_producto_id ?? undefined,
        regaloVarianteId: row.regalo_variante_id ?? undefined,
        regaloCantidad: row.regalo_cantidad ?? 1,
        triggerNombre: row.trigger_producto?.nombre ?? undefined,
        regaloNombre: row.regalo_producto?.nombre ?? undefined,
        regaloSku: row.regalo_variante?.sku ?? undefined,
        regaloPresentacion: row.regalo_variante?.presentacion ?? undefined,
        regaloCategoria:
          row.regalo_producto?.categorias_producto?.slug ?? undefined,
      }))

      setPromociones(mapped)
      setIsLoading(false)
    }

    load()
  }, [supabase])

  return { promociones, isLoading }
}
