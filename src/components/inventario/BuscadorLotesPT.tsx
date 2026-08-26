"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, Loader2 } from "lucide-react"
import { ESTADO_PT_LABELS } from "@/lib/constants/labels"
import type { ProductoLote } from "@/types"

interface LoteResultado extends ProductoLote {
  producto_nombre: string
  variante_presentacion: string
  esPrimeroDeVariante: boolean
}

export function BuscadorLotesPT() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const [resultados, setResultados] = useState<LoteResultado[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setResultados([])
      setBuscado(false)
      return
    }

    let cancelado = false
    async function buscar() {
      setIsLoading(true)
      setBuscado(true)

      const { data: productos } = await supabase
        .from("productos")
        .select("id, nombre")
        .ilike("nombre", `%${q}%`)

      if (cancelado) return

      const ids = (productos ?? []).map((p) => p.id)
      if (ids.length === 0) {
        setResultados([])
        setIsLoading(false)
        return
      }
      const nombreById = new Map((productos ?? []).map((p) => [p.id, p.nombre]))

      const { data: lotes } = await supabase
        .from("producto_lotes")
        .select("*, producto_variantes(presentacion)")
        .in("producto_id", ids)
        .gt("cantidad_disponible", 0)
        .neq("estado", "despachado")
        .order("fecha_produccion", { ascending: true })

      if (cancelado) return

      const vistoVariante = new Set<string>()
      const mapeados: LoteResultado[] = (lotes ?? []).map((l) => {
        const varianteId = l.variante_id ?? l.id
        const esPrimero = !vistoVariante.has(varianteId)
        vistoVariante.add(varianteId)
        const variante = l.producto_variantes as unknown as { presentacion: string } | null
        return {
          ...(l as ProductoLote),
          producto_nombre: nombreById.get(l.producto_id) ?? "—",
          variante_presentacion: variante?.presentacion ?? "—",
          esPrimeroDeVariante: esPrimero,
        }
      })

      setResultados(mapeados)
      setIsLoading(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [debouncedQuery, supabase])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Buscador de Lotes por Dieta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Escribe el nombre de la dieta para ver sus lotes disponibles y saber cuál despachar primero.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ej. Mid Power..."
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando...
          </div>
        ) : buscado && resultados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No se encontraron lotes disponibles para esa dieta.</p>
        ) : resultados.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead>Producción</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.map((lote) => (
                <TableRow
                  key={lote.id}
                  className="cursor-pointer"
                  onClick={() => lote.variante_id && router.push(`/inventario/productos/${lote.variante_id}`)}
                >
                  <TableCell className="font-medium">{lote.producto_nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{lote.variante_presentacion}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      {lote.codigo_lote}
                      {lote.esPrimeroDeVariante && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-normal">
                          Enviar primero
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {ESTADO_PT_LABELS[lote.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{lote.cantidad_disponible.toLocaleString("es-CO")}</TableCell>
                  <TableCell className="text-right">
                    ${lote.costo_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lote.fecha_produccion).toLocaleDateString("es-CO")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lote.fecha_vencimiento
                      ? new Date(lote.fecha_vencimiento).toLocaleDateString("es-CO")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  )
}
