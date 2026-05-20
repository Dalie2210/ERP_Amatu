"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

const formatCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`

interface ReglaRow {
  id: string
  monto_minimo: number
  pct_descuento_compra: number
  descuento_envio_fijo: number
  is_active: boolean
}

type EditableRegla = Pick<ReglaRow, "monto_minimo" | "pct_descuento_compra" | "descuento_envio_fijo">

export default function DescuentosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<ReglaRow[]>([])
  const [edits, setEdits] = useState<Record<string, EditableRegla>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchReglas = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("reglas_descuento")
      .select("*")
      .order("monto_minimo")
    const typed = (data as ReglaRow[]) ?? []
    setRows(typed)
    const initEdits: Record<string, EditableRegla> = {}
    typed.forEach((r) => {
      initEdits[r.id] = {
        monto_minimo: r.monto_minimo,
        pct_descuento_compra: r.pct_descuento_compra,
        descuento_envio_fijo: r.descuento_envio_fijo,
      }
    })
    setEdits(initEdits)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchReglas() }, [fetchReglas])

  const handleSave = async (id: string) => {
    setSavingId(id)
    const { error } = await supabase.from("reglas_descuento").update(edits[id]).eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Regla actualizada.")
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...edits[id] } : r))
    }
    setSavingId(null)
  }

  const setField = (id: string, field: keyof EditableRegla, value: number) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-start gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Reglas de Descuento</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Descuentos por escala de pedido según monto de alimento.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p className="text-sm">No hay reglas de descuento configuradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Monto mínimo</TableHead>
                  <TableHead>% Descuento compra</TableHead>
                  <TableHead>Dcto. envío fijo ($)</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Guardar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const edit = edits[row.id]
                  if (!edit) return null
                  const isDirty =
                    edit.monto_minimo !== row.monto_minimo ||
                    edit.pct_descuento_compra !== row.pct_descuento_compra ||
                    edit.descuento_envio_fijo !== row.descuento_envio_fijo

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            value={edit.monto_minimo}
                            onChange={(e) => setField(row.id, "monto_minimo", parseFloat(e.target.value) || 0)}
                            className="h-8 w-32 text-sm"
                          />
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatCOP(edit.monto_minimo)})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={edit.pct_descuento_compra}
                            onChange={(e) => setField(row.id, "pct_descuento_compra", parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={500}
                            value={edit.descuento_envio_fijo}
                            onChange={(e) => setField(row.id, "descuento_envio_fijo", parseFloat(e.target.value) || 0)}
                            className="h-8 w-28 text-sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={row.is_active
                            ? "border-emerald-200 text-emerald-700"
                            : "border-slate-200 text-slate-500"}
                        >
                          {row.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isDirty ? "default" : "outline"}
                          className="gap-1 h-7"
                          disabled={!isDirty || savingId === row.id}
                          onClick={() => handleSave(row.id)}
                        >
                          <Save className="h-3 w-3" />
                          {savingId === row.id ? "..." : "Guardar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
