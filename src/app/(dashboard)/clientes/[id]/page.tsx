"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Save,
  Plus,
  PawPrint,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react"
import Link from "next/link"
import type { TipoDocumento, TipoCliente, FuenteCliente } from "@/types"

// ---------- Types ----------
interface ZonaEnvio {
  id: string
  nombre: string
  localidades: string
}

interface Mascota {
  id: string
  cliente_id: string
  nombre: string
  raza: string | null
  peso_kg: number | null
  edad_meses: number | null
  necesidad_dolor: string | null
  created_at: string
}

interface ClienteDetail {
  id: string
  codigo_cliente: string
  nombre_completo: string
  tipo_documento: TipoDocumento
  numero_documento: string
  celular: string
  correo: string | null
  direccion: string
  complemento_direccion: string | null
  zona_id: string | null
  fuente: FuenteCliente
  fuente_subtipo: string | null
  tipo_cliente: TipoCliente
  pct_descuento_distribuidor: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------- Page Skeleton ----------
function DetailSkeleton() {
  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-[300px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader><Skeleton className="h-6 w-[200px]" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader><Skeleton className="h-6 w-[120px]" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------- Component ----------
export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  const [cliente, setCliente] = useState<ClienteDetail | null>(null)
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [zonas, setZonas] = useState<ZonaEnvio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Edit form
  const [form, setForm] = useState({
    nombre_completo: "",
    tipo_documento: "CC" as TipoDocumento,
    numero_documento: "",
    celular: "",
    correo: "",
    direccion: "",
    complemento_direccion: "",
    zona_id: "",
    fuente: "otro" as FuenteCliente,
    tipo_cliente: "publico" as TipoCliente,
    pct_descuento_distribuidor: 0,
    is_active: true,
  })

  // New pet dialog
  const [showPetDialog, setShowPetDialog] = useState(false)
  const [petForm, setPetForm] = useState({
    nombre: "",
    raza: "",
    peso_kg: "",
    edad_meses: "",
    necesidad_dolor: "",
  })
  const [petSaving, setPetSaving] = useState(false)
  const [petError, setPetError] = useState<string | null>(null)

  // ---------- Fetch data ----------
  const fetchCliente = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single()

    if (!error && data) {
      const c = data as ClienteDetail
      setCliente(c)
      setForm({
        nombre_completo: c.nombre_completo,
        tipo_documento: c.tipo_documento,
        numero_documento: c.numero_documento,
        celular: c.celular,
        correo: c.correo ?? "",
        direccion: c.direccion,
        complemento_direccion: c.complemento_direccion ?? "",
        zona_id: c.zona_id ?? "",
        fuente: c.fuente,
        tipo_cliente: c.tipo_cliente,
        pct_descuento_distribuidor: c.pct_descuento_distribuidor,
        is_active: c.is_active,
      })
    }
    setIsLoading(false)
  }, [supabase, clienteId])

  const fetchMascotas = useCallback(async () => {
    const { data } = await supabase
      .from("mascotas")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: true })
    if (data) setMascotas(data as Mascota[])
  }, [supabase, clienteId])

  const fetchZonas = useCallback(async () => {
    const { data } = await supabase
      .from("zonas_envio")
      .select("id, nombre, localidades")
      .eq("is_active", true)
      .order("nombre")
    if (data) setZonas(data)
  }, [supabase])

  useEffect(() => {
    fetchCliente()
    fetchMascotas()
    fetchZonas()
  }, [fetchCliente, fetchMascotas, fetchZonas])

  // ---------- Handlers ----------
  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    const { error } = await supabase
      .from("clientes")
      .update({
        nombre_completo: form.nombre_completo,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        celular: form.celular,
        correo: form.correo || null,
        direccion: form.direccion,
        complemento_direccion: form.complemento_direccion || null,
        zona_id: form.zona_id || null,
        fuente: form.fuente,
        tipo_cliente: form.tipo_cliente,
        pct_descuento_distribuidor: form.pct_descuento_distribuidor,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clienteId)

    if (error) {
      setSaveMessage(`Error: ${error.message}`)
    } else {
      setSaveMessage("Cliente actualizado correctamente")
      setTimeout(() => setSaveMessage(null), 3000)
    }
    setIsSaving(false)
  }

  const handleAddPet = async () => {
    setPetSaving(true)
    setPetError(null)

    const { error } = await supabase.from("mascotas").insert([
      {
        cliente_id: clienteId,
        nombre: petForm.nombre,
        raza: petForm.raza || null,
        peso_kg: petForm.peso_kg ? parseFloat(petForm.peso_kg) : null,
        edad_meses: petForm.edad_meses ? parseInt(petForm.edad_meses) : null,
        necesidad_dolor: petForm.necesidad_dolor || null,
      },
    ])

    if (error) {
      setPetError(error.message)
    } else {
      setShowPetDialog(false)
      setPetForm({
        nombre: "",
        raza: "",
        peso_kg: "",
        edad_meses: "",
        necesidad_dolor: "",
      })
      fetchMascotas()
    }
    setPetSaving(false)
  }

  const handleDeletePet = async (petId: string) => {
    const { error } = await supabase
      .from("mascotas")
      .delete()
      .eq("id", petId)

    if (!error) {
      setMascotas((prev) => prev.filter((m) => m.id !== petId))
    }
  }

  if (isLoading) return <DetailSkeleton />
  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Link href="/clientes">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-heading tracking-tight">
            {cliente.nombre_completo}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {cliente.codigo_cliente}
          </p>
        </div>
        <Badge variant={cliente.is_active ? "default" : "secondary"}>
          {cliente.is_active ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name + Doc type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={form.nombre_completo}
                    onChange={(e) =>
                      setForm({ ...form, nombre_completo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Documento</Label>
                  <Select
                    value={form.tipo_documento}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, tipo_documento: (v ?? "CC") as TipoDocumento })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">C.C.</SelectItem>
                      <SelectItem value="CE">C.E.</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Doc # + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Documento</Label>
                  <Input
                    value={form.numero_documento}
                    onChange={(e) =>
                      setForm({ ...form, numero_documento: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input
                    value={form.celular}
                    onChange={(e) =>
                      setForm({ ...form, celular: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input
                  type="email"
                  value={form.correo}
                  onChange={(e) =>
                    setForm({ ...form, correo: e.target.value })
                  }
                />
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={form.direccion}
                    onChange={(e) =>
                      setForm({ ...form, direccion: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={form.complemento_direccion}
                    onChange={(e) =>
                      setForm({ ...form, complemento_direccion: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Zone + Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zona de Envío</Label>
                  <Select
                    value={form.zona_id}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, zona_id: v ?? "" })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {zonas.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuente</Label>
                  <Select
                    value={form.fuente}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, fuente: (v ?? "otro") as FuenteCliente })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta_ads">Meta Ads</SelectItem>
                      <SelectItem value="referido_cliente">Referido — Cliente</SelectItem>
                      <SelectItem value="referido_veterinario">Referido — Veterinario</SelectItem>
                      <SelectItem value="referido_entrenador">Referido — Entrenador</SelectItem>
                      <SelectItem value="distribuidor">Distribuidor</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client type + distributor discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select
                    value={form.tipo_cliente}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, tipo_cliente: (v ?? "publico") as TipoCliente })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publico">Público</SelectItem>
                      <SelectItem value="distribuidor">Distribuidor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.tipo_cliente === "distribuidor" && (
                  <div className="space-y-2">
                    <Label>% Descuento Distribuidor</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.pct_descuento_distribuidor}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pct_descuento_distribuidor: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Save button + message */}
              <div className="flex items-center gap-4 pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
                {saveMessage && (
                  <p
                    className={`text-sm ${
                      saveMessage.startsWith("Error")
                        ? "text-destructive"
                        : "text-green-600"
                    }`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Pets */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-primary" />
                Mascotas ({mascotas.length})
              </CardTitle>
              <Dialog open={showPetDialog} onOpenChange={setShowPetDialog}>
                <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1" />}>
                  <Plus className="h-4 w-4" />
                  Agregar
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Agregar Mascota</DialogTitle>
                    <DialogDescription>
                      Registra una nueva mascota para {cliente.nombre_completo}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pet-name">Nombre *</Label>
                      <Input
                        id="pet-name"
                        placeholder="Max"
                        value={petForm.nombre}
                        onChange={(e) =>
                          setPetForm({ ...petForm, nombre: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pet-raza">Raza</Label>
                        <Input
                          id="pet-raza"
                          placeholder="Labrador"
                          value={petForm.raza}
                          onChange={(e) =>
                            setPetForm({ ...petForm, raza: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pet-peso">Peso (kg)</Label>
                        <Input
                          id="pet-peso"
                          type="number"
                          placeholder="25"
                          value={petForm.peso_kg}
                          onChange={(e) =>
                            setPetForm({ ...petForm, peso_kg: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pet-edad">Edad (meses)</Label>
                      <Input
                        id="pet-edad"
                        type="number"
                        placeholder="24"
                        value={petForm.edad_meses}
                        onChange={(e) =>
                          setPetForm({ ...petForm, edad_meses: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pet-necesidad">Necesidad / Dolor del cliente</Label>
                      <Textarea
                        id="pet-necesidad"
                        placeholder="¿Por qué busca alimento natural?"
                        value={petForm.necesidad_dolor}
                        onChange={(e) =>
                          setPetForm({ ...petForm, necesidad_dolor: e.target.value })
                        }
                      />
                    </div>

                    {petError && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                        {petError}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowPetDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddPet}
                      disabled={petSaving || !petForm.nombre}
                    >
                      {petSaving ? "Guardando..." : "Agregar Mascota"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {mascotas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PawPrint className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm">No hay mascotas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mascotas.map((mascota) => (
                    <div
                      key={mascota.id}
                      className="group relative rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <PawPrint className="h-4 w-4 text-primary" />
                            {mascota.nombre}
                          </h4>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {mascota.raza && <p>Raza: {mascota.raza}</p>}
                            {mascota.peso_kg && <p>Peso: {mascota.peso_kg} kg</p>}
                            {mascota.edad_meses != null && (
                              <p>
                                Edad:{" "}
                                {mascota.edad_meses >= 12
                                  ? `${Math.floor(mascota.edad_meses / 12)} años${
                                      mascota.edad_meses % 12 > 0
                                        ? ` ${mascota.edad_meses % 12} meses`
                                        : ""
                                    }`
                                  : `${mascota.edad_meses} meses`}
                              </p>
                            )}
                          </div>
                          {mascota.necesidad_dolor && (
                            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">
                              {mascota.necesidad_dolor}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDeletePet(mascota.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick info card */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Información Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{cliente.celular}</span>
              </div>
              {cliente.correo && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{cliente.correo}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {cliente.direccion}
                  {cliente.complemento_direccion
                    ? `, ${cliente.complemento_direccion}`
                    : ""}
                </span>
              </div>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Creado: {new Date(cliente.created_at).toLocaleDateString("es-CO")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
