"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Users, TrendingUp } from "lucide-react"
import { toast } from "sonner"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodoFromDate(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

function getCurrentPeriodo(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadEntry {
  id: string
  vendedor_id: string
  fecha_registro: string
  periodo_mes: string
  cantidad_leads: number
  notas: string | null
  users: { full_name: string } | null
}

interface VendedorOption {
  id: string
  full_name: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsMetaPage() {
  const supabase = useMemo(() => createClient(), [])
  const { user, role } = useAuth()

  const isAdmin = role === "admin"
  const currentPeriodo = useMemo(() => getCurrentPeriodo(), [])

  const [leads, setLeads] = useState<LeadEntry[]>([])
  const [vendedores, setVendedores] = useState<VendedorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    vendedor_id: "",
    fecha_registro: new Date().toISOString().slice(0, 10),
    cantidad_leads: "",
    notas: "",
  })

  const periodo = useMemo(
    () => getPeriodoFromDate(form.fecha_registro),
    [form.fecha_registro]
  )

  // ── Fetch vendedores (admin only) and set default vendor ──────────────────
  const initVendedor = useCallback(async () => {
    if (!user) return

    if (isAdmin) {
      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .in("role", ["vendedor", "admin"])
        .eq("is_active", true)
        .order("full_name")
      if (data && data.length > 0) {
        setVendedores(data)
        setForm((f) => ({ ...f, vendedor_id: data[0].id }))
      }
    } else {
      // Vendor registers for themselves only
      setForm((f) => ({ ...f, vendedor_id: user.id }))
    }
  }, [supabase, user, isAdmin])

  // ── Fetch existing leads for current month ────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    let query = supabase
      .from("leads_meta_ads")
      .select("*, users!leads_meta_ads_vendedor_id_fkey(full_name)")
      .eq("periodo_mes", currentPeriodo)
      .order("fecha_registro", { ascending: false })

    if (!isAdmin) {
      query = query.eq("vendedor_id", user.id)
    }

    const { data } = await query
    setLeads((data ?? []) as LeadEntry[])
    setIsLoading(false)
  }, [supabase, user, isAdmin, currentPeriodo])

  useEffect(() => {
    initVendedor()
  }, [initVendedor])

  useEffect(() => {
    if (user) fetchLeads()
  }, [fetchLeads, user])

  // ── Computed stats for form's selected period ─────────────────────────────
  const statsForPeriodo = useMemo(() => {
    const filtered = leads.filter(
      (l) =>
        l.periodo_mes === periodo &&
        (isAdmin || l.vendedor_id === user?.id)
    )
    const totalLeads = filtered.reduce((sum, l) => sum + l.cantidad_leads, 0)
    return { totalLeads, count: filtered.length }
  }, [leads, periodo, isAdmin, user])

  // ── Submit new lead entry ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    const qty = Number(form.cantidad_leads)
    if (!form.vendedor_id || !form.fecha_registro || qty <= 0) {
      toast.error("Ingresa una fecha válida y al menos 1 lead.")
      return
    }

    setIsSaving(true)
    const { error } = await supabase.from("leads_meta_ads").insert({
      vendedor_id: form.vendedor_id,
      fecha_registro: form.fecha_registro,
      periodo_mes: periodo,
      cantidad_leads: qty,
      notas: form.notas.trim() || null,
    })

    if (error) {
      toast.error(`Error al guardar: ${error.message}`)
    } else {
      toast.success("Leads registrados correctamente")
      setForm((f) => ({ ...f, cantidad_leads: "", notas: "" }))
      fetchLeads()
    }
    setIsSaving(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/comisiones">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">
            Leads Meta Ads
          </h1>
          <p className="text-muted-foreground mt-1">
            Registra los leads recibidos para calcular el porcentaje de cierre mensual.
          </p>
        </div>
      </div>

      {/* Entry form */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Registrar Leads del Día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select
                  value={form.vendedor_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, vendedor_id: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha_registro}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_registro: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leads">Cantidad de Leads</Label>
              <Input
                id="leads"
                type="number"
                min="1"
                placeholder="Ej: 25"
                value={form.cantidad_leads}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cantidad_leads: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Input
                id="notas"
                placeholder="Campaña, fuente..."
                value={form.notas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notas: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>
                Período:{" "}
                <span className="font-medium text-foreground">{periodo}</span>
              </p>
              {statsForPeriodo.totalLeads > 0 && (
                <p className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Acumulado del mes:{" "}
                  <span className="font-medium text-foreground">
                    {statsForPeriodo.totalLeads} leads
                  </span>{" "}
                  en {statsForPeriodo.count} registro
                  {statsForPeriodo.count !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !form.vendedor_id || !form.cantidad_leads}
            >
              {isSaving ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads history for current month */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Registros de {currentPeriodo}
        </h2>
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-5 w-[100px]" />
                    <Skeleton className="h-5 w-[140px]" />
                    <Skeleton className="h-5 w-[80px]" />
                    <Skeleton className="h-5 w-[60px]" />
                  </div>
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                <Users className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">
                  Sin leads registrados este mes
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {isAdmin && <TableHead>Vendedor</TableHead>}
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">
                        {new Date(l.fecha_registro + "T12:00:00").toLocaleDateString(
                          "es-CO",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-medium">
                          {l.users?.full_name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {l.periodo_mes}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {l.cantidad_leads}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {l.notas ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
