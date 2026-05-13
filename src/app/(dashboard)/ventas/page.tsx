"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Plus, Search, ShoppingBag, ChevronRight, ChevronLeft,
} from "lucide-react"
import Link from "next/link"

const PAGE_SIZE = 20

const estadoLabels: Record<string, string> = {
  fecha_tentativa: "Tentativo",
  confirmado: "Confirmado",
  en_preparacion: "Preparación",
  espera_produccion: "Esp. Producción",
  listo_despacho: "Listo",
  despachado: "Despachado",
  devolucion: "Devolución",
  parcial: "Parcial",
}

const estadoColors: Record<string, string> = {
  fecha_tentativa: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-green-100 text-green-800",
  en_preparacion: "bg-blue-100 text-blue-800",
  espera_produccion: "bg-orange-100 text-orange-800",
  listo_despacho: "bg-indigo-100 text-indigo-800",
  despachado: "bg-emerald-100 text-emerald-800",
  devolucion: "bg-red-100 text-red-800",
  parcial: "bg-amber-100 text-amber-800",
}

const pagoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Pagado",
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[60px] ml-auto" />
        </div>
      ))}
    </div>
  )
}

interface Pedido {
  id: string
  numero_pedido: string
  estado: string
  estado_pago: string
  total: number
  created_at: string
  fue_editado: boolean
  clientes: { nombre_completo: string } | null
  users: { full_name: string } | null
}

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), [])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const debouncedSearch = useDebounce(searchQuery, 400)

  const fetchPedidos = useCallback(async () => {
    setIsLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("pedidos")
      .select("id, numero_pedido, estado, estado_pago, total, created_at, fue_editado, clientes(nombre_completo), users!pedidos_vendedor_id_fkey(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (estadoFilter !== "all") query = query.eq("estado", estadoFilter)
    if (debouncedSearch.trim()) query = query.or(`numero_pedido.ilike.%${debouncedSearch}%`)

    const { data, count } = await query
    setPedidos((data as Pedido[]) ?? [])
    setTotalCount(count ?? 0)
    setIsLoading(false)
  }, [supabase, estadoFilter, debouncedSearch, page])

  useEffect(() => { setPage(0) }, [debouncedSearch, estadoFilter])
  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Ventas</h1>
          <p className="text-muted-foreground mt-1">Historial de pedidos y nueva venta.</p>
        </div>
        <Link href="/ventas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por # pedido..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={estadoFilter} onValueChange={(v: string | null) => setEstadoFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos los estados">
                  {estadoFilter === "all" ? "Todos los estados" : (estadoLabels[estadoFilter as keyof typeof estadoLabels] ?? estadoFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(estadoLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? <TableSkeleton /> : pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <ShoppingBag className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No hay pedidos</p>
              <p className="text-sm">Crea tu primera venta para empezar.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]"># Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="font-mono text-sm">
                        {p.numero_pedido}
                        {p.fue_editado && <Badge variant="destructive" className="ml-2 text-[10px] h-4">EDITADO</Badge>}
                      </TableCell>
                      <TableCell className="font-medium">{p.clientes?.nombre_completo ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.users?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-800"}`}>
                          {estadoLabels[p.estado] ?? p.estado}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.estado_pago === "confirmado" ? "default" : "outline"} className="text-xs">
                          {pagoLabels[p.estado_pago] ?? p.estado_pago}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">${p.total.toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/ventas/${p.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Siguiente<ChevronRight className="h-4 w-4 ml-1" />
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
