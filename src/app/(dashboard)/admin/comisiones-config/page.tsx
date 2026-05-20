"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ConfigRow {
  id: string
  cierre_min: number
  cierre_max: number
  venta_2_pct: number
  venta_3_pct: number
  venta_4_pct: number
  venta_5_pct: number
  venta_6_pct: number
  is_active: boolean
}

type EditableConfig = Omit<ConfigRow, "id" | "is_active">

const pctFields: { key: keyof EditableConfig; label: string }[] = [
  { key: "venta_2_pct", label: "Venta 2" },
  { key: "venta_3_pct", label: "Venta 3" },
  { key: "venta_4_pct", label: "Venta 4" },
  { key: "venta_5_pct", label: "Venta 5" },
  { key: "venta_6_pct", label: "Venta 6+" },
]

export default function ComisionesConfigPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<ConfigRow[]>([])
  const [edits, setEdits] = useState<Record<string, EditableConfig>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("config_comisiones")
      .select("*")
      .order("cierre_min")
    const typed = (data as ConfigRow[]) ?? []
    setRows(typed)
    const initEdits: Record<string, EditableConfig> = {}
    typed.forEach((r) => {
      initEdits[r.id] = {
        cierre_min: r.cierre_min,
        cierre_max: r.cierre_max,
        venta_2_pct: r.venta_2_pct,
        venta_3_pct: r.venta_3_pct,
        venta_4_pct: r.venta_4_pct,
        venta_5_pct: r.venta_5_pct,
        venta_6_pct: r.venta_6_pct,
      }
    })
    setEdits(initEdits)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async (id: string) => {
    setSavingId(id)
    const payload = edits[id]
    const { error } = await supabase.from("config_comisiones").update(payload).eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Configuración guardada.")
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...payload } : r))
    }
    setSavingId(null)
  }

  const setField = (id: string, field: keyof EditableConfig, value: number) => {
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
          <h1 className="text-3xl font-bold font-heading tracking-tight">Config Comisiones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rangos de cierre de Meta Ads y porcentajes por número de venta al cliente.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const edit = edits[row.id]
            if (!edit) return null
            const isDirty = JSON.stringify(edit) !== JSON.stringify({
              cierre_min: row.cierre_min,
              cierre_max: row.cierre_max,
              venta_2_pct: row.venta_2_pct,
              venta_3_pct: row.venta_3_pct,
              venta_4_pct: row.venta_4_pct,
              venta_5_pct: row.venta_5_pct,
              venta_6_pct: row.venta_6_pct,
            })

            return (
              <Card key={row.id} className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-heading">
                        Cierre {edit.cierre_min}% – {edit.cierre_max}%
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={row.is_active ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"}
                      >
                        {row.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={!isDirty || savingId === row.id}
                      onClick={() => handleSave(row.id)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingId === row.id ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Porcentajes de comisión según el número de venta al cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Cierre mín (%)</p>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={edit.cierre_min}
                        onChange={(e) => setField(row.id, "cierre_min", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Cierre máx (%)</p>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={edit.cierre_max}
                        onChange={(e) => setField(row.id, "cierre_max", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {pctFields.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{label} (%)</p>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={edit[key] as number}
                          onChange={(e) => setField(row.id, key, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
