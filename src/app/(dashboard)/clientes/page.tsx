"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Card, CardContent } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  ChevronLeft,
  PawPrint,
  Phone,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import type { TipoDocumento, TipoCliente, FuenteCliente } from "@/types"

// ---------- Constants ----------
const PAGE_SIZE = 20

// ---------- Types ----------
interface ZonaEnvio {
  id: string
  nombre: string
  localidades: string
}

interface Cliente {
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
  tipo_cliente: TipoCliente
  is_active: boolean
  created_at: string
  zonas_envio?: { id: string; nombre: string } | null
  mascotas?: { id: string }[]
}

// ---------- Skeleton ----------
function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[180px]" />
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[80px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ---------- Label maps ----------
const fuenteLabels: Record<FuenteCliente, string> = {
  meta_ads: "Meta Ads",
  referido_cliente: "Referido Cliente",
  referido_veterinario: "Ref. Veterinario",
  referido_entrenador: "Ref. Entrenador",
  distribuidor: "Distribuidor",
  otro: "Otro",
}

const tipoClienteLabels: Record<TipoCliente, string> = {
  publico: "Público",
  distribuidor: "Distribuidor",
}

// ---------- Component ----------
export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [zonas, setZonas] = useState<ZonaEnvio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFuente, setSelectedFuente] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Pagination
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const debouncedSearch = useDebounce(searchQuery, 400)

  // Create form
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
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ---------- Data fetching ----------
  const fetchClientes = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("clientes")
      .select("*, zonas_envio(id, nombre), mascotas(id)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (selectedFuente !== "all") {
      query = query.eq("fuente", selectedFuente)
    }

    if (debouncedSearch.trim()) {
      query = query.or(
        `nombre_completo.ilike.%${debouncedSearch}%,numero_documento.ilike.%${debouncedSearch}%,celular.ilike.%${debouncedSearch}%,codigo_cliente.ilike.%${debouncedSearch}%`
      )
    }

    const { data, error, count } = await query

    if (!error && data) {
      setClientes(data as Cliente[])
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }, [supabase, selectedFuente, debouncedSearch, page])

  const fetchZonas = useCallback(async () => {
    const { data } = await supabase
      .from("zonas_envio")
      .select("id, nombre, localidades")
      .eq("is_active", true)
      .order("nombre")
    if (data) setZonas(data)
  }, [supabase])

  useEffect(() => {
    fetchZonas()
  }, [fetchZonas])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, selectedFuente])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  // ---------- Generate client code ----------
  const generateCodigoCliente = () => {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const rand = Math.floor(Math.random() * 9000) + 1000
    return `AMT-${yy}${mm}-${rand}`
  }

  // ---------- Create handler ----------
  const handleCreate = async () => {
    setIsSaving(true)
    setSaveError(null)

    const { error } = await supabase.from("clientes").insert([
      {
        codigo_cliente: generateCodigoCliente(),
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
      },
    ])

    if (error) {
      setSaveError(error.message)
    } else {
      setShowCreateDialog(false)
      setForm({
        nombre_completo: "",
        tipo_documento: "CC",
        numero_documento: "",
        celular: "",
        correo: "",
        direccion: "",
        complemento_direccion: "",
        zona_id: "",
        fuente: "otro",
        tipo_cliente: "publico",
      })
      fetchClientes()
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la base de clientes y sus mascotas.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Registrar Cliente</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo cliente de Amatu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Row 1: Name + Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    placeholder="Juan Pérez"
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">C.C.</SelectItem>
                      <SelectItem value="CE">C.E.</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Document # + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc">Número de Documento *</Label>
                  <Input
                    id="doc"
                    placeholder="1234567890"
                    value={form.numero_documento}
                    onChange={(e) =>
                      setForm({ ...form, numero_documento: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular *</Label>
                  <Input
                    id="celular"
                    placeholder="3001234567"
                    value={form.celular}
                    onChange={(e) =>
                      setForm({ ...form, celular: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="juan@email.com (opcional)"
                  value={form.correo}
                  onChange={(e) =>
                    setForm({ ...form, correo: e.target.value })
                  }
                />
              </div>

              {/* Row 4: Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input
                    id="direccion"
                    placeholder="Cra 15 #100-20"
                    value={form.direccion}
                    onChange={(e) =>
                      setForm({ ...form, direccion: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Torre 3, Apto 501"
                    value={form.complemento_direccion}
                    onChange={(e) =>
                      setForm({ ...form, complemento_direccion: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Row 5: Zone + Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zona de Envío</Label>
                  <Select
                    value={form.zona_id}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, zona_id: v ?? "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.nombre}
                        </SelectItem>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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

              {/* Row 6: Client type */}
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <Select
                  value={form.tipo_cliente}
                  onValueChange={(v: string | null) =>
                    setForm({ ...form, tipo_cliente: (v ?? "publico") as TipoCliente })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Público (consumidor final)</SelectItem>
                    <SelectItem value="distribuidor">Distribuidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {saveError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {saveError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isSaving ||
                  !form.nombre_completo ||
                  !form.numero_documento ||
                  !form.celular ||
                  !form.direccion
                }
              >
                {isSaving ? "Guardando..." : "Registrar Cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, documento, celular o código..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedFuente}
              onValueChange={(v: string | null) => setSelectedFuente(v ?? "all")}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Todas las fuentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="referido_cliente">Referido Cliente</SelectItem>
                <SelectItem value="referido_veterinario">Ref. Veterinario</SelectItem>
                <SelectItem value="referido_entrenador">Ref. Entrenador</SelectItem>
                <SelectItem value="distribuidor">Distribuidor</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Users className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay clientes aún</p>
              <p className="text-sm">
                Registra tu primer cliente para comenzar.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-center">Mascotas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id} className="group">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {cliente.codigo_cliente}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {cliente.nombre_completo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cliente.tipo_documento} {cliente.numero_documento}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {cliente.celular}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.zonas_envio ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {cliente.zonas_envio.nombre}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs">
                          {fuenteLabels[cliente.fuente]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <PawPrint className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {cliente.mascotas?.length ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/clientes/${cliente.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Ver
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * PAGE_SIZE + 1}–
                    {Math.min((page + 1) * PAGE_SIZE, totalCount)} de{" "}
                    {totalCount} clientes
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
