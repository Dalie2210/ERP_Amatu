"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cartStore"
import { useDebounce } from "@/hooks/useDebounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, User, PawPrint, X, MapPin } from "lucide-react"

interface ClienteBasic {
  id: string
  codigo_cliente: string
  nombre_completo: string
  celular: string
  direccion: string
  complemento_direccion: string | null
  zona_id: string | null
  tipo_cliente: string
  pct_descuento_distribuidor: number | null
  zonas_envio: { id: string; nombre: string; tarifa_cliente: number } | null
}

interface MascotaBasic {
  id: string
  nombre: string
  raza: string | null
  peso_kg: number | null
}

export function ClientSelector() {
  const supabase = useMemo(() => createClient(), [])
  const clienteId = useCartStore((s) => s.clienteId)
  const mascotaId = useCartStore((s) => s.mascotaId)
  const setCliente = useCartStore((s) => s.setCliente)
  const setMascota = useCartStore((s) => s.setMascota)
  const setZona = useCartStore((s) => s.setZona)
  const setClienteConfig = useCartStore((s) => s.setClienteConfig)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ClienteBasic[]>([])
  const [selectedCliente, setSelectedCliente] = useState<ClienteBasic | null>(null)
  const [mascotas, setMascotas] = useState<MascotaBasic[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  // Search clients
  const searchClients = useCallback(async () => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    setIsSearching(true)
    const { data } = await supabase
      .from("clientes")
      .select("id, codigo_cliente, nombre_completo, celular, direccion, complemento_direccion, zona_id, tipo_cliente, pct_descuento_distribuidor, zonas_envio(id, nombre, tarifa_cliente)")
      .or(`nombre_completo.ilike.%${debouncedQuery}%,celular.ilike.%${debouncedQuery}%,codigo_cliente.ilike.%${debouncedQuery}%,numero_documento.ilike.%${debouncedQuery}%`)
      .limit(8)
    setResults((data as ClienteBasic[]) ?? [])
    setIsSearching(false)
  }, [supabase, debouncedQuery])

  useEffect(() => { searchClients() }, [searchClients])

  // Fetch mascotas when client selected
  useEffect(() => {
    if (!clienteId) { setMascotas([]); return }
    const fetchMascotas = async () => {
      const { data } = await supabase
        .from("mascotas")
        .select("id, nombre, raza, peso_kg")
        .eq("cliente_id", clienteId)
        .order("nombre")
      setMascotas((data as MascotaBasic[]) ?? [])
    }
    fetchMascotas()
  }, [supabase, clienteId])

  const handleSelectCliente = (c: ClienteBasic) => {
    setSelectedCliente(c)
    setCliente(c.id)
    setZona(c.zona_id)
    setClienteConfig(
      c.tipo_cliente === "distribuidor",
      c.pct_descuento_distribuidor ?? 0,
      c.zonas_envio?.tarifa_cliente ?? 0
    )
    setMascota(null)
    setQuery("")
    setResults([])
  }

  const handleClearCliente = () => {
    setSelectedCliente(null)
    setCliente(null)
    setZona(null)
    setClienteConfig(false, 0, 0)
    setMascota(null)
    setMascotas([])
  }

  // If clienteId is set but we don't have the full object, fetch it
  useEffect(() => {
    if (clienteId && !selectedCliente) {
      const fetch = async () => {
        const { data } = await supabase
          .from("clientes")
          .select("id, codigo_cliente, nombre_completo, celular, direccion, complemento_direccion, zona_id, tipo_cliente, pct_descuento_distribuidor, zonas_envio(id, nombre, tarifa_cliente)")
          .eq("id", clienteId)
          .single()
        if (data) {
          const c = data as ClienteBasic
          setSelectedCliente(c)
          setClienteConfig(
            c.tipo_cliente === "distribuidor",
            c.pct_descuento_distribuidor ?? 0,
            c.zonas_envio?.tarifa_cliente ?? 0
          )
        }
      }
      fetch()
    }
  }, [clienteId, selectedCliente, supabase])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Cliente & Mascota
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCliente ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nombre, celular, código..."
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {(results.length > 0 || isSearching || (debouncedQuery && results.length === 0)) && (
              <div className="border rounded-lg bg-white shadow-md overflow-hidden max-h-[240px] overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
                ) : results.length > 0 ? (
                  results.map((c) => (
                    <button key={c.id} onClick={() => handleSelectCliente(c)} className="flex items-center w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left border-b last:border-b-0 gap-3">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {c.nombre_completo.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">{c.codigo_cliente} · {c.celular}</p>
                      </div>
                      {c.tipo_cliente === "distribuidor" && <Badge variant="secondary" className="text-[10px] shrink-0">Distribuidor</Badge>}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-sm text-muted-foreground">No se encontraron clientes</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{selectedCliente.nombre_completo}</p>
                  {selectedCliente.tipo_cliente === "distribuidor" && <Badge variant="secondary" className="text-[10px]">Distribuidor</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedCliente.codigo_cliente} · {selectedCliente.celular}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{selectedCliente.direccion}</span>
                </div>
                {selectedCliente.zonas_envio && (
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {selectedCliente.zonas_envio.nombre} — ${selectedCliente.zonas_envio.tarifa_cliente.toLocaleString("es-CO")}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleClearCliente}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Mascota selector */}
        {selectedCliente && mascotas.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5 text-primary" />
              Mascota
            </Label>
            <Select value={mascotaId ?? ""} onValueChange={(v: string | null) => setMascota(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mascota...">
                  {mascotaId ? mascotas.find(m => m.id === mascotaId)?.nombre : "Seleccionar mascota..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mascotas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre} {m.raza ? `(${m.raza})` : ""} {m.peso_kg ? `— ${m.peso_kg}kg` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCliente && mascotas.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Este cliente no tiene mascotas registradas</p>
        )}
      </CardContent>
    </Card>
  )
}
