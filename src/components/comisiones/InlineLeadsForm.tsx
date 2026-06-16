"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

interface InlineLeadsFormProps {
  vendedorId: string
  periodoMes: string
  onSaved: () => void
}

export function InlineLeadsForm({ vendedorId, periodoMes, onSaved }: InlineLeadsFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0])
  const [cantidad, setCantidad] = useState("")
  const [notas, setNotas] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(cantidad, 10)
    if (!n || n < 1) {
      toast.error("Ingresa una cantidad válida de leads")
      return
    }

    setSaving(true)
    try {
      const periodo = fecha.slice(0, 7) // YYYY-MM
      const { error } = await supabase.from("leads_meta_ads").insert({
        vendedor_id: vendedorId,
        fecha_registro: fecha,
        periodo_mes: periodo,
        cantidad_leads: n,
        notas: notas.trim() || null,
      })
      if (error) throw error
      toast.success(`${n} leads registrados para ${periodo}`)
      setCantidad("")
      setNotas("")
      onSaved()
    } catch (err: any) {
      toast.error(err.message || "Error al registrar leads")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="leads-fecha" className="text-xs">Fecha *</Label>
          <Input
            id="leads-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-8 text-sm w-36"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="leads-cantidad" className="text-xs">Leads del día *</Label>
          <Input
            id="leads-cantidad"
            type="number"
            min={1}
            max={9999}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej: 12"
            className="h-8 text-sm w-24"
            required
          />
        </div>
        <div className="space-y-1 flex-1">
          <Label htmlFor="leads-notas" className="text-xs">Notas (opcional)</Label>
          <Input
            id="leads-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Campaña, observaciones…"
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={saving} className="h-8 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          {saving ? "Guardando…" : "Registrar"}
        </Button>
      </div>
    </form>
  )
}
