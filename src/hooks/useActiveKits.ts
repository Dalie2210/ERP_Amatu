"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Kit } from "@/types"

export function useActiveKits(): {
  kits: Kit[]
  isLoading: boolean
} {
  const supabase = useMemo(() => createClient(), [])
  const [kits, setKits] = useState<Kit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("kits")
        .select(
          `
          id, nombre, descripcion, is_active, created_at,
          kit_items (
            id, kit_id, cantidad,
            producto_id, variante_id,
            productos (
              nombre,
              aplica_descuento_compra,
              categorias_producto ( slug )
            ),
            producto_variantes (
              sku, presentacion, precio_publico
            )
          )
        `
        )
        .eq("is_active", true)
        .order("nombre")

      if (error) {
        console.error("Error cargando kits:", error)
        setIsLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Kit[] = (data ?? []).map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion ?? undefined,
        isActive: row.is_active,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (row.kit_items ?? []).map((ki: any) => ({
          id: ki.id,
          kitId: ki.kit_id,
          productoId: ki.producto_id,
          varianteId: ki.variante_id ?? undefined,
          cantidad: ki.cantidad,
          sku: ki.producto_variantes?.sku ?? ki.productos?.nombre ?? "",
          nombre: ki.productos?.nombre ?? "",
          presentacion: ki.producto_variantes?.presentacion ?? undefined,
          precioUnitario: ki.producto_variantes?.precio_publico ?? 0,
          aplicaDescuento: ki.productos?.aplica_descuento_compra ?? false,
          categoria: ki.productos?.categorias_producto?.slug ?? "otros",
        })),
      }))

      setKits(mapped)
      setIsLoading(false)
    }

    load()
  }, [supabase])

  return { kits, isLoading }
}
