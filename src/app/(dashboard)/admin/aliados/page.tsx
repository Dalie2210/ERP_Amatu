"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { AliadoFormDialog } from "@/components/admin/AliadoFormDialog"
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"
import { toast } from "sonner"
import type { TipoAliado } from "@/types"

interface AliadoRow {
  id: string
  nombre: string
  tipo: TipoAliado
  celular: string | null
  correo: string | null
  is_active: boolean
  created_at: string
}

const TIPO_LABELS: Record<TipoAliado, string> = {
  veterinario: "Veterinario",
  entrenador_canino: "Entrenador Canino",
  otro: "Otro",
}

export default function AdminAliadosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [aliados, setAliados] = useState<AliadoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAliados = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("aliados")
      .select("*")
      .order("nombre")
    setAliados((data as AliadoRow[]) ?? [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => { fetchAliados() }, [fetchAliados])

  const handleSave = async (
    form: { nombre: string; tipo: TipoAliado; celular: string; correo: string },
    id?: string
  ) => {
    const payload = {
      nombre: form.nombre,
      tipo: form.tipo,
      celular: form.celular || null,
      correo: form.correo || null,
    }

    if (id) {
      const { error } = await supabase.from("aliados").update(payload).eq("id", id)
      if (error) throw new Error(error.message)
      toast.success("Aliado actualizado.")
    } else {
      const { error } = await supabase.from("aliados").insert([{ ...payload, is_active: true }])
      if (error) throw new Error(error.message)
      toast.success("Aliado creado.")
    }
    await fetchAliados()
  }

  const handleToggleActive = async (aliado: AliadoRow) => {
    const { error } = await supabase
      .from("aliados")
      .update({ is_active: !aliado.is_active })
      .eq("id", aliado.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(aliado.is_active ? "Aliado desactivado." : "Aliado activado.")
      await fetchAliados()
    }
  }

  const handleDelete = async (aliadoId: string, nombre: string) => {
    const res = await fetch(`/api/admin/aliados/${aliadoId}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Error al eliminar aliado.")
      throw new Error(data.error)
    }
    setAliados((prev) => prev.filter((a) => a.id !== aliadoId))
    toast.success(`${nombre} eliminado.`)
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Aliados</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Veterinarios y entrenadores que refieren clientes.
            </p>
          </div>
        </div>
        <AliadoFormDialog
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Aliado
            </Button>
          }
          onSave={handleSave}
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : aliados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p className="text-sm">No hay aliados registrados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aliados.map((aliado) => (
                  <TableRow key={aliado.id}>
                    <TableCell className="font-medium">{aliado.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TIPO_LABELS[aliado.tipo] ?? aliado.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aliado.celular ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aliado.correo ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={aliado.is_active
                          ? "border-emerald-200 text-emerald-700"
                          : "border-slate-200 text-slate-500"}
                      >
                        {aliado.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AliadoFormDialog
                          trigger={
                            <Button variant="ghost" size="sm">Editar</Button>
                          }
                          initialData={{
                            id: aliado.id,
                            nombre: aliado.nombre,
                            tipo: aliado.tipo,
                            celular: aliado.celular ?? "",
                            correo: aliado.correo ?? "",
                          }}
                          onSave={handleSave}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={aliado.is_active ? "text-destructive hover:text-destructive" : ""}
                          onClick={() => handleToggleActive(aliado)}
                        >
                          {aliado.is_active ? "Desactivar" : "Activar"}
                        </Button>
                        <DeleteConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                          entityLabel={aliado.nombre}
                          confirmToken={aliado.nombre}
                          description="Se eliminará el aliado y sus referidos. Si tiene pedidos asociados, la eliminación será bloqueada."
                          onConfirm={() => handleDelete(aliado.id, aliado.nombre)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
