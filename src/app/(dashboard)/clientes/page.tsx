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
import type { FuenteCliente, TipoCliente } from "@/types"
import { CreateClienteDialog } from "@/components/clientes/CreateClienteDialog"

// ---------- Constants ----------
const PAGE_SIZE = 20

// ---------- Types ----------
interface Cliente {
  id: string
  codigo_cliente: string
  nombre_completo: string
  tipo_documento: string
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

// ---------- Component ----------
export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFuente, setSelectedFuente] = useState<string>("all")

  // Pagination
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const debouncedSearch = useDebounce(searchQuery, 400)

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

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, selectedFuente])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

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
        <CreateClienteDialog
          onCreated={() => fetchClientes()}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          }
        />
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
