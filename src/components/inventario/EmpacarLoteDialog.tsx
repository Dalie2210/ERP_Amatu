"use client"

import { Fragment, useMemo, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { ProductoLote } from "@/types"

/** Sobre este % del lote, un "sobrante" es casi seguro un error de digitación. */
const SOBRANTE_SOSPECHOSO_PCT = 0.05

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
  const [motivosSobrante, setMotivosSobrante] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [packingId, setPackingId] = useState<string | null>(null)

  /** Cuánto excede lo digitado a lo disponible en el lote (0 si no excede). */
  const sobranteDe = (lote: ProductoLote) => {
    const cantidad = parseFloat(cantidades[lote.id] ?? "")
    if (isNaN(cantidad) || cantidad <= 0) return 0
    return Math.max(0, cantidad - lote.cantidad_disponible)
  }

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
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error("Cantidad inválida.")
      return
    }

    // Empacar más de lo producido solo se permite con motivo: se registra como
    // sobrante de rendimiento sobre este mismo lote, sin consumir insumos.
    const sobrante = sobranteDe(lote)
    const motivo = (motivosSobrante[lote.id] ?? "").trim()
    if (sobrante > 0 && motivo === "") {
      toast.error("Indica el motivo del sobrante para empacar más de lo producido.")
      return
    }

    setPackingId(lote.id)
    const { error } = await supabase.rpc("fn_empacar_lote", {
      p_lote_id: lote.id,
      p_cantidad: cantidad,
      p_motivo_sobrante: sobrante > 0 ? motivo : null,
    })
    setPackingId(null)
    if (error) {
      toast.error("Error al empacar: " + error.message)
      return
    }
    toast.success(
      sobrante > 0
        ? `${cantidad} empacadas desde lote ${lote.codigo_lote} (incluye ${sobrante} de sobrante).`
        : `${cantidad} empacadas desde lote ${lote.codigo_lote}.`
    )
    setCantidades((prev) => ({ ...prev, [lote.id]: "" }))
    setMotivosSobrante((prev) => ({ ...prev, [lote.id]: "" }))
    fetchLotes()
    onPacked()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Empacar — {productoNombre}</SheetTitle>
          <SheetDescription>
            Mueve cantidad de lotes en estado &quot;producido&quot; a &quot;empacado&quot;. Se puede empacar
            parcialmente. Si salieron unidades de más, digita la cantidad real y justifica el sobrante.
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
              {lotes.map((lote) => {
                const sobrante = sobranteDe(lote)
                const motivo = motivosSobrante[lote.id] ?? ""
                const sospechoso =
                  sobrante > lote.cantidad_disponible * SOBRANTE_SOSPECHOSO_PCT
                return (
                  <Fragment key={lote.id}>
                    <TableRow className={sobrante > 0 ? "border-b-0" : undefined}>
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
                          disabled={packingId === lote.id || (sobrante > 0 && motivo.trim() === "")}
                          onClick={() => handleEmpacar(lote)}
                        >
                          {packingId === lote.id ? "..." : sobrante > 0 ? "Registrar y empacar" : "Empacar"}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {sobrante > 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="pt-0">
                          <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                Estás empacando {sobrante.toLocaleString("es-CO")} más de lo producido en
                                este lote ({lote.cantidad_disponible.toLocaleString("es-CO")} →{" "}
                                {(lote.cantidad_disponible + sobrante).toLocaleString("es-CO")}). Se
                                registrará como sobrante de rendimiento: no consume insumos adicionales y
                                el costo unitario del lote se recalcula a la baja.
                              </span>
                            </p>
                            {sospechoso && (
                              <p className="text-sm font-medium text-destructive">
                                El sobrante supera el 5% del lote. Verifica que no sea un error de digitación.
                              </p>
                            )}
                            <div className="space-y-1.5">
                              <Label htmlFor={`motivo-sobrante-${lote.id}`}>Motivo del sobrante</Label>
                              <Textarea
                                id={`motivo-sobrante-${lote.id}`}
                                rows={2}
                                placeholder="Ej: mejor rendimiento del lote, salió una porción extra"
                                value={motivo}
                                onChange={(e) =>
                                  setMotivosSobrante((prev) => ({ ...prev, [lote.id]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
