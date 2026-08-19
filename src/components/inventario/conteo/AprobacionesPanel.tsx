"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Check, X } from "lucide-react"
import type { CategoriaConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { AprobarConteoDialog } from "./AprobarConteoDialog"
import { RechazarConteoDialog } from "./RechazarConteoDialog"
import { formatCantidad } from "./utils"

interface ItemRow {
  id: string
  cantidad_sistema: number
  cantidad_contada: number
  diferencia: number
  insumos: { nombre: string; codigo: string | null; unidad_medida: string } | null
  productos: { nombre: string } | null
  producto_variantes: { presentacion: string } | null
}

interface PendienteRow {
  id: string
  fecha: string
  categoria: CategoriaConteo
  notas: string | null
  created_at: string
  users: { full_name: string } | null
  conteo_items: ItemRow[]
}

interface Props {
  onCountChange?: (count: number) => void
}

export function AprobacionesPanel({ onCountChange }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PendienteRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [aprobarId, setAprobarId] = useState<string | null>(null)
  const [rechazarId, setRechazarId] = useState<string | null>(null)

  const fetchPendientes = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("conteos_inventario")
      .select(`
        id, fecha, categoria, notas, created_at,
        users!conteos_inventario_created_by_fkey(full_name),
        conteo_items(
          id, cantidad_sistema, cantidad_contada, diferencia,
          insumos(nombre, codigo, unidad_medida), productos(nombre), producto_variantes(presentacion)
        )
      `)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("No se pudieron cargar los conteos pendientes")
      console.error(error)
    } else {
      const pendientes = (data ?? []) as unknown as PendienteRow[]
      setRows(pendientes)
      onCountChange?.(pendientes.length)
    }
    setIsLoading(false)
  }, [supabase, onCountChange])

  useEffect(() => { void fetchPendientes() }, [fetchPendientes])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <CheckCircle2 className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Sin conteos pendientes</p>
          <p className="text-sm">Todos los conteos con diferencias ya fueron revisados.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((s) => {
        const conDiferencia = s.conteo_items.filter((it) => Number(it.diferencia) !== 0)
        return (
          <Card key={s.id} className="border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {CATEGORIA_CONTEO_LABELS[s.categoria]}
                    <span className="text-muted-foreground font-normal"> — {new Date(s.created_at).toLocaleString("es-CO")}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Registrado por {s.users?.full_name ?? "—"} · {s.notas ?? "Sin motivo"}
                  </p>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Ítem</th>
                      <th className="px-3 py-2 font-medium text-right">Sistema</th>
                      <th className="px-3 py-2 font-medium text-right">Contado</th>
                      <th className="px-3 py-2 font-medium text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conDiferencia.map((it) => {
                      const nombre = it.insumos?.nombre ?? it.productos?.nombre ?? "—"
                      const sufijo = it.producto_variantes?.presentacion ?? it.insumos?.unidad_medida
                      const dif = Number(it.diferencia)
                      return (
                        <tr key={it.id} className="border-t">
                          <td className="px-3 py-2">
                            {nombre}{sufijo && <span className="text-muted-foreground"> — {sufijo}</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatCantidad(Number(it.cantidad_sistema))}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCantidad(Number(it.cantidad_contada))}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${dif > 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {dif > 0 ? "+" : ""}{formatCantidad(dif)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Las diferencias se recalculan al aprobar; el stock pudo cambiar desde el registro.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setRechazarId(s.id)}>
                  <X className="h-4 w-4" />Rechazar
                </Button>
                <Button className="gap-1.5" onClick={() => setAprobarId(s.id)}>
                  <Check className="h-4 w-4" />Aprobar y aplicar
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <AprobarConteoDialog
        conteoId={aprobarId}
        onOpenChange={(open) => { if (!open) setAprobarId(null) }}
        onDone={() => void fetchPendientes()}
      />
      <RechazarConteoDialog
        conteoId={rechazarId}
        onOpenChange={(open) => { if (!open) setRechazarId(null) }}
        onDone={() => void fetchPendientes()}
      />
    </div>
  )
}
