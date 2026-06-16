"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Scale } from "lucide-react"

interface PesoMagistral {
  id: string
  peso_g: number
  created_at: string
}

export default function PesosMagistralesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [pesos, setPesos] = useState<PesoMagistral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPeso, setNewPeso] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const fetchPesos = async () => {
    const { data } = await supabase
      .from("pesos_magistrales")
      .select("*")
      .order("peso_g")
    if (data) setPesos(data)
    setIsLoading(false)
  }

  useEffect(() => { fetchPesos() }, [])

  const handleAdd = async () => {
    const valor = parseInt(newPeso.trim())
    if (isNaN(valor) || valor <= 0) {
      toast.error("Ingresa un número entero válido mayor a 0.")
      return
    }
    setIsSaving(true)
    const { error } = await supabase.from("pesos_magistrales").insert({ peso_g: valor })
    if (error) {
      toast.error(error.code === "23505" ? `${valor}g ya existe.` : error.message)
    } else {
      toast.success(`${valor}g agregado.`)
      setNewPeso("")
      fetchPesos()
    }
    setIsSaving(false)
  }

  const handleDelete = async (id: string, peso_g: number) => {
    const { error } = await supabase.from("pesos_magistrales").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`${peso_g}g eliminado.`)
      setPesos((prev) => prev.filter((p) => p.id !== id))
    }
  }

  return (
    <div className="space-y-6 max-w-[600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Pesos Magistrales</h1>
          <p className="text-sm text-muted-foreground">
            Gramajes disponibles para variantes de dietas magistrales.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Agregar peso (g)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="nuevo-peso" className="sr-only">Gramos</Label>
              <Input
                id="nuevo-peso"
                type="number"
                placeholder="ej: 750"
                value={newPeso}
                onChange={(e) => setNewPeso(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
                min={1}
              />
            </div>
            <Button onClick={handleAdd} disabled={isSaving || !newPeso.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Pesos configurados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : pesos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay pesos configurados. Agrega el primero.
            </div>
          ) : (
            <ul className="divide-y">
              {pesos.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-6 py-3">
                  <span className="font-mono font-medium">{p.peso_g}g</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(p.id, p.peso_g)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
