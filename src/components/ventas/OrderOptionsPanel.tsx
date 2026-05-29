"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/stores/cartStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings2, MapPin } from "lucide-react"
import type { FuenteCliente, FranjaHoraria, MetodoPago, TipoAliado } from "@/types"
import {
  FUENTE_LABELS,
  METODO_PAGO_LABELS,
  FRANJA_LABELS,
} from "@/lib/constants/labels"

interface Aliado {
  id: string
  nombre: string
  tipo: TipoAliado
}

interface ZonaEnvio {
  id: string
  nombre: string
}

export function OrderOptionsPanel() {
  const supabase = useMemo(() => createClient(), [])

  const fuente = useCartStore((s) => s.fuente)
  const franjaHoraria = useCartStore((s) => s.franjaHoraria)
  const metodoPago = useCartStore((s) => s.metodoPago)
  const notasVentas = useCartStore((s) => s.notasVentas)
  const fechaTentativa = useCartStore((s) => s.fechaTentativaEntrega)
  const aliadoId = useCartStore((s) => s.aliadoId)
  const usaDireccionAlterna = useCartStore((s) => s.usaDireccionAlterna)
  const direccionAlterna = useCartStore((s) => s.direccionAlterna)
  const complementoAlterna = useCartStore((s) => s.complementoAlterna)
  const barrioAlterna = useCartStore((s) => s.barrioAlterna)
  const zonaAlternaId = useCartStore((s) => s.zonaAlternaId)

  const setFuente = useCartStore((s) => s.setFuente)
  const setFranjaHoraria = useCartStore((s) => s.setFranjaHoraria)
  const setMetodoPago = useCartStore((s) => s.setMetodoPago)
  const setNotasVentas = useCartStore((s) => s.setNotasVentas)
  const setFechaTentativa = useCartStore((s) => s.setFechaTentativa)
  const setAliadoId = useCartStore((s) => s.setAliadoId)
  const setUsaDireccionAlterna = useCartStore((s) => s.setUsaDireccionAlterna)
  const setDireccionAlterna = useCartStore((s) => s.setDireccionAlterna)
  const setComplementoAlterna = useCartStore((s) => s.setComplementoAlterna)
  const setBarrioAlterna = useCartStore((s) => s.setBarrioAlterna)
  const setZonaAlternaId = useCartStore((s) => s.setZonaAlternaId)

  const [pendingReferido, setPendingReferido] = useState(false)
  const showReferidoType = pendingReferido || fuente?.startsWith("referido_")
  const needsAliado = fuente === "referido_veterinario" || fuente === "referido_entrenador"

  const [aliados, setAliados] = useState<Aliado[]>([])
  const [zonas, setZonas] = useState<ZonaEnvio[]>([])

  // Fetch aliados when fuente is referido_veterinario or referido_entrenador
  useEffect(() => {
    if (!needsAliado) {
      setAliados([])
      return
    }
    const tipoFiltro: TipoAliado =
      fuente === "referido_veterinario" ? "veterinario" : "entrenador_canino"

    supabase
      .from("aliados")
      .select("id, nombre, tipo")
      .eq("tipo", tipoFiltro)
      .eq("is_active", true)
      .order("nombre")
      .then(({ data }: { data: Aliado[] | null }) => setAliados(data ?? []))
  }, [supabase, fuente, needsAliado])

  // Fetch zonas de envío for alternate address dropdown
  useEffect(() => {
    supabase
      .from("zonas_envio")
      .select("id, nombre")
      .eq("is_active", true)
      .order("nombre")
      .then(({ data }: { data: ZonaEnvio[] | null }) => setZonas(data ?? []))
  }, [supabase])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Opciones del Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fuente + Tipo de Referido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fuente</Label>
            <Select
              value={showReferidoType ? "referido" : (fuente ?? "")}
              onValueChange={(v) => {
                if (v === "referido") {
                  setPendingReferido(true)
                  if (!fuente?.startsWith("referido_")) setFuente(null, null)
                  setAliadoId(null)
                } else {
                  setPendingReferido(false)
                  setFuente((v || null) as FuenteCliente | null, null)
                  setAliadoId(null)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">
                  {showReferidoType ? "Referido" : fuente ? (FUENTE_LABELS[fuente] ?? fuente) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="referido">Referido</SelectItem>
                <SelectItem value="distribuidor">Distribuidor</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showReferidoType && (
            <div className="space-y-2">
              <Label>¿Quién refirió?</Label>
              <Select
                value={fuente?.startsWith("referido_") ? fuente : ""}
                onValueChange={(v) => {
                  setPendingReferido(false)
                  setFuente((v || null) as FuenteCliente | null, null)
                  if (v !== "referido_veterinario" && v !== "referido_entrenador") {
                    setAliadoId(null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo...">
                    {fuente === "referido_cliente" ? "Cliente"
                      : fuente === "referido_veterinario" ? "Veterinario"
                      : fuente === "referido_entrenador" ? "Entrenador Canino"
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referido_cliente">Cliente</SelectItem>
                  <SelectItem value="referido_veterinario">Veterinario</SelectItem>
                  <SelectItem value="referido_entrenador">Entrenador Canino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Aliado referido (when fuente is vet or trainer) */}
        {needsAliado && (
          <div className="space-y-2">
            <Label>
              Aliado{" "}
              <span className="text-xs text-muted-foreground">
                ({fuente === "referido_veterinario" ? "Veterinario" : "Entrenador Canino"})
              </span>
            </Label>
            <Select value={aliadoId ?? ""} onValueChange={(v) => setAliadoId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar aliado...">
                  {aliadoId ? (aliados.find((a) => a.id === aliadoId)?.nombre ?? aliadoId) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {aliados.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Sin aliados activos de este tipo
                  </div>
                ) : (
                  aliados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Método de Pago */}
        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <Select value={metodoPago ?? ""} onValueChange={(v: string | null) => setMetodoPago((v || null) as MetodoPago | null)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar...">
                {metodoPago ? (METODO_PAGO_LABELS[metodoPago] ?? metodoPago) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nequi">Nequi</SelectItem>
              <SelectItem value="daviplata">Daviplata</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="bancolombia">Bancolombia</SelectItem>
              <SelectItem value="pse_openpay">PSE / OpenPay</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="contraentrega">Contraentrega</SelectItem>
            </SelectContent>
          </Select>
          {metodoPago === "contraentrega" && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 bg-amber-50 text-amber-700">COD</Badge>
              El pedido se confirmará automáticamente al guardar.
            </p>
          )}
        </div>

        {/* Franja + Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Franja Horaria</Label>
            <Select value={franjaHoraria} onValueChange={(v) => setFranjaHoraria(v as FranjaHoraria)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">
                  {franjaHoraria ? (FRANJA_LABELS[franjaHoraria] ?? franjaHoraria) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM (Mañana)</SelectItem>
                <SelectItem value="PM">PM (Tarde)</SelectItem>
                <SelectItem value="intermedia">Intermedia</SelectItem>
                <SelectItem value="sin_franja">Sin Franja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha Tentativa</Label>
            <Input type="date" value={fechaTentativa ?? ""} onChange={(e) => setFechaTentativa(e.target.value || null)} />
          </div>
        </div>

        {/* Alternate delivery address */}
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center gap-3">
            <Switch
              id="dir-alterna"
              checked={usaDireccionAlterna}
              onCheckedChange={(v) => {
                setUsaDireccionAlterna(v)
                if (!v) {
                  setDireccionAlterna("")
                  setComplementoAlterna("")
                  setBarrioAlterna("")
                  setZonaAlternaId(null)
                }
              }}
            />
            <Label htmlFor="dir-alterna" className="text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Entregar en otra dirección
            </Label>
          </div>

          {usaDireccionAlterna && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label className="text-sm">Dirección de entrega</Label>
                <Input
                  placeholder="Calle 45 # 12-34"
                  value={direccionAlterna ?? ""}
                  onChange={(e) => setDireccionAlterna(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Complemento</Label>
                  <Input
                    placeholder="Apto 301, Casa 2..."
                    value={complementoAlterna ?? ""}
                    onChange={(e) => setComplementoAlterna(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Barrio</Label>
                  <Input
                    placeholder="El Prado"
                    value={barrioAlterna ?? ""}
                    onChange={(e) => setBarrioAlterna(e.target.value)}
                  />
                </div>
              </div>
              {zonas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Zona de envío (recalcula tarifa)</Label>
                  <Select value={zonaAlternaId ?? ""} onValueChange={(v) => setZonaAlternaId(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Misma zona del cliente">
                        {zonaAlternaId ? (zonas.find((z) => z.id === zonaAlternaId)?.nombre ?? null) : null}
                      </SelectValue>
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
              )}
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <Label>Notas de Ventas</Label>
          <Textarea placeholder="Indicaciones especiales del vendedor..." value={notasVentas} onChange={(e) => setNotasVentas(e.target.value)} rows={2} />
        </div>
      </CardContent>
    </Card>
  )
}
