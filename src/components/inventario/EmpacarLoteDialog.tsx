"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import type { ProductoLote } from "@/types"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  productoId: string | null
  varianteId: string | null
  productoNombre: string
  onPacked: () => void
}

export function EmpacarLoteDialog({ open, onOpenChange, productoId, varianteId, productoNombre, onPacked }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [lotes, setLotes] = useState<ProductoLote[]>([])
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [packingId, setPackingId] = useState<string | null>(null)

  const fetchLotes = useCallback(async () => {
    if (!productoId) return
    setIsLoading(true)
    let query = supabase
      .from("producto_lotes")
      .select("*")
      .eq("producto_id", productoId)
      .eq("estado", "producido")
      .gt("cantidad_disponible", 0)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })

    query = varianteId ? query.eq("variante_id", varianteId) : query.is("variante_id", null)

    const { data, error } = await query
    if (error) toast.error("Error cargando lotes: " + error.message)
    setLotes(data ?? [])
    setIsLoading(false)
  }, [supabase, productoId, varianteId])

  useEffect(() => {
    if (open) fetchLotes()
  }, [open, fetchLotes])

  async function handleEmpacar(lote: ProductoLote) {
    const cantidad = parseFloat(cantidades[lote.id] ?? "")
    if (isNaN(cantidad) || cantidad <= 0 || cantidad > lote.cantidad_disponible) {
      toast.error("Cantidad inválida.")
      return
    }
    setPackingId(lote.id)
    const { error } = await supabase.rpc("fn_empacar_lote", {
      p_lote_id: lote.id,
      p_cantidad: cantidad,
    })
    setPackingId(null)
    if (error) {
      toast.error("Error al empacar: " + error.message)
      return
    }
    toast.success(`${cantidad} empacadas desde lote ${lote.codigo_lote}.`)
    setCantidades((prev) => ({ ...prev, [lote.id]: "" }))
    fetchLotes()
    onPacked()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Empacar — {productoNombre}</SheetTitle>
          <SheetDescription>
            Mueve cantidad de lotes en estado &quot;producido&quot; a &quot;empacado&quot;. Se puede empacar parcialmente.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando lotes...</p>
        ) : lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No hay lotes en estado producido para empacar.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right w-[140px]">Cant. a Empacar</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-mono text-xs">{lote.codigo_lote}</TableCell>
                  <TableCell className="text-muted-foreground">{lote.fecha_vencimiento ?? "—"}</TableCell>
                  <TableCell className="text-right">{lote.cantidad_disponible}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="h-8 text-right"
                      placeholder="0"
                      value={cantidades[lote.id] ?? ""}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [lote.id]: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={packingId === lote.id}
                      onClick={() => handleEmpacar(lote)}
                    >
                      {packingId === lote.id ? "..." : "Empacar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
