"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { MensajeroDialog, type MensajeroRow } from "@/components/logistica/MensajeroDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft, Bike, Plus, Pencil, Trash2, Phone, MapPin, AlertTriangle,
} from "lucide-react"
import Link from "next/link"

interface Mensajero extends MensajeroRow {
  is_active: boolean
  zonas_envio: { nombre: string } | null
}

export default function MensajerosPage() {
  const supabase = useMemo(() => createClient(), [])
  const { role, isLoading: authLoading } = useAuth()

  const [mensajeros, setMensajeros] = useState<Mensajero[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const canAccess = !authLoading && role !== null && ["admin", "logistica"].includes(role)

  const fetchMensajeros = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("mensajeros")
      .select("id, nombre, placa_vehiculo, telefono, zona_id, is_active, zonas_envio(nombre)")
      .eq("is_active", true)
      .order("nombre")
    setMensajeros((data as unknown as Mensajero[]) ?? [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (canAccess) fetchMensajeros()
  }, [canAccess, fetchMensajeros])

  const handleDelete = async (m: Mensajero) => {
    const { error } = await supabase
      .from("mensajeros")
      .update({ is_active: false })
      .eq("id", m.id)
    if (error) { toast.error("Error al eliminar el mensajero"); return }
    toast.success("Mensajero eliminado")
    fetchMensajeros()
  }

  if (!authLoading && !canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p>No tienes acceso a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/logistica">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Mensajeros</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona el catálogo de mensajeros para asignarlos a las rutas.
            </p>
          </div>
        </div>
        <MensajeroDialog
          supabase={supabase}
          onSaved={fetchMensajeros}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Mensajero
            </Button>
          }
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : mensajeros.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Bike className="h-8 w-8 opacity-30" />
            <p className="text-sm">No hay mensajeros registrados. Crea uno nuevo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mensajeros.map((m) => (
            <Card key={m.id} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{m.nombre}</h3>
                    {m.placa_vehiculo && (
                      <Badge className="bg-slate-100 text-slate-700 text-xs">{m.placa_vehiculo}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {m.telefono}
                    </span>
                    {m.zonas_envio?.nombre && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {m.zonas_envio.nombre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <MensajeroDialog
                    supabase={supabase}
                    mensajero={m}
                    onSaved={fetchMensajeros}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar mensajero?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará <strong>{m.nombre}</strong> del catálogo. Las rutas ya
                          despachadas conservarán sus datos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDelete(m)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
