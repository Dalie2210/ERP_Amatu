"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { TipoPrecio } from "@/types"

interface ProductoVariante {
  id: string
  presentacion: string
  precio_publico: number
  precio_por_gramo: number | null
  is_active: boolean
}

interface PrecioEscala {
  id: string
  cantidad_minima: number
  precio_total: number
}

interface CategoriaProducto {
  id: string
  nombre: string
  slug: string
}

export interface TopSellerProducto {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  tipo_precio: TipoPrecio
  es_magistral: boolean
  aplica_descuento_compra: boolean
  is_active: boolean
  notas: string | null
  categorias_producto: CategoriaProducto | null
  producto_variantes: ProductoVariante[]
  precios_escala: PrecioEscala[]
}

// Module-level cache — survives re-mounts for 5 minutes
let _cache: TopSellerProducto[] | null = null
let _cacheTs = 0
const CACHE_TTL = 5 * 60 * 1000

export function useTopSellers() {
  const supabase = useMemo(() => createClient(), [])
  const [topSellers, setTopSellers] = useState<TopSellerProducto[]>(_cache ?? [])
  const [isLoading, setIsLoading] = useState(_cache === null)

  useEffect(() => {
    if (_cache !== null && Date.now() - _cacheTs < CACHE_TTL) {
      setTopSellers(_cache)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchTopSellers() {
      setIsLoading(true)

      // Step 1: Get ranked product IDs from sales history
      const { data: rankData, error: rankError } = await supabase.rpc(
        "fn_top_selling_productos",
        { p_limit: 10 }
      )

      if (cancelled) return

      if (rankError || !rankData || rankData.length === 0) {
        _cache = []
        _cacheTs = Date.now()
        setTopSellers([])
        setIsLoading(false)
        return
      }

      const ids: string[] = rankData.map(
        (r: { producto_id: string; total_vendido: number }) => r.producto_id
      )

      // Step 2: Hydrate full product data with same joins as ProductSearchBox.search()
      const { data: productos, error: prodError } = await supabase
        .from("productos")
        .select(
          "*, categorias_producto(id, nombre, slug), producto_variantes(*), precios_escala(*)"
        )
        .in("id", ids)
        .eq("is_active", true)

      if (cancelled) return

      if (prodError || !productos) {
        _cache = []
        _cacheTs = Date.now()
        setTopSellers([])
        setIsLoading(false)
        return
      }

      // Re-sort to preserve the sales-rank order returned by the RPC
      const sorted = ids
        .map((id) => (productos as TopSellerProducto[]).find((p) => p.id === id))
        .filter((p): p is TopSellerProducto => p !== undefined)

      _cache = sorted
      _cacheTs = Date.now()
      setTopSellers(sorted)
      setIsLoading(false)
    }

    fetchTopSellers()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return { topSellers, isLoading }
}
