"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { EmpacarLoteDialog } from "@/components/inventario/EmpacarLoteDialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Search, PackageCheck } from "lucide-react"
import type { VStockProducto } from "@/types"

interface GroupedRow {
  producto_id: string
  variante_id: string
  producto_nombre: string
  variante_presentacion: string
  producido: number
  empacado: number
  despachado: number
}

export default function ProductosPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()

  const [rows, setRows] = useState<GroupedRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [empacando, setEmpacando] = useState<GroupedRow | null>(null)

  const canWrite = role === "admin" || role === "logistica"

  const fetchStock = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("v_stock_productos").select("*")
    if (error) {
      toast.error("Error cargando stock: " + error.message)
      setIsLoading(false)
      return
    }

    const grouped = new Map<string, GroupedRow>()
    for (const r of (data ?? []) as VStockProducto[]) {
      const key = `${r.producto_id}:${r.variante_id}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          producto_id: r.producto_id,
          variante_id: r.variante_id,
          producto_nombre: r.producto_nombre,
          variante_presentacion: r.variante_presentacion,
          producido: 0,
          empacado: 0,
          despachado: 0,
        })
      }
      const g = grouped.get(key)!
      if (r.estado === "producido") g.producido += r.stock_disponible
      else if (r.estado === "empacado") g.empacado += r.stock_disponible
      else if (r.estado === "despachado") g.despachado += r.stock_disponible
    }

    setRows(Array.from(grouped.values()).sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre)))
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchStock() }, [fetchStock])

  const filtered = rows.filter((r) =>
    r.producto_nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Producto Terminado — Stock</h1>
        <p className="text-muted-foreground mt-1">
          Stock por variante, desglosado por estado (producido / empacado / despachado).
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay stock de producto terminado</p>
              <p className="text-sm">Completa una orden de producción para generar stock.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Producido</TableHead>
                  <TableHead className="text-right">Empacado</TableHead>
                  <TableHead className="text-right">Despachado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.producto_id}:${r.variante_id}`}>
                    <TableCell className="font-medium">{r.producto_nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{r.variante_presentacion}</TableCell>
                    <TableCell className="text-right font-medium">{r.producido.toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right">{r.empacado.toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.despachado.toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && r.producido > 0 && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setEmpacando(r)}>
                          <PackageCheck className="h-3.5 w-3.5" />
                          Empacar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmpacarLoteDialog
        open={empacando !== null}
        onOpenChange={(v) => !v && setEmpacando(null)}
        productoId={empacando?.producto_id ?? null}
        varianteId={empacando?.variante_id ?? null}
        productoNombre={empacando ? `${empacando.producto_nombre} — ${empacando.variante_presentacion}` : ""}
        onPacked={fetchStock}
      />
    </div>
  )
}
