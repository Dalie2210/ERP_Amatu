"use client"

import { useCartStore } from "@/stores/cartStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings2 } from "lucide-react"
import type { FuenteCliente, FranjaHoraria, MetodoPago } from "@/types"

export function OrderOptionsPanel() {
  const fuente = useCartStore((s) => s.fuente)
  const fuenteSubtipo = useCartStore((s) => s.fuenteSubtipo)
  const franjaHoraria = useCartStore((s) => s.franjaHoraria)
  const metodoPago = useCartStore((s) => s.metodoPago)
  const esContraentrega = useCartStore((s) => s.esContraentrega)
  const notasVentas = useCartStore((s) => s.notasVentas)
  const fechaTentativa = useCartStore((s) => s.fechaTentativaEntrega)
  const setFuente = useCartStore((s) => s.setFuente)
  const setFranjaHoraria = useCartStore((s) => s.setFranjaHoraria)
  const setMetodoPago = useCartStore((s) => s.setMetodoPago)
  const setEsContraentrega = useCartStore((s) => s.setEsContraentrega)
  const setNotasVentas = useCartStore((s) => s.setNotasVentas)
  const setFechaTentativa = useCartStore((s) => s.setFechaTentativa)

  const isReferido = fuente?.startsWith("referido_")

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Opciones del Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fuente + Subtipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fuente</Label>
            <Select value={fuente ?? ""} onValueChange={(v) => {
              setFuente((v || null) as FuenteCliente | null, null)
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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
          {isReferido && (
            <div className="space-y-2">
              <Label>Tipo de Referido</Label>
              <Select value={fuenteSubtipo ?? ""} onValueChange={(v) => setFuente(fuente, v || null)}>
                <SelectTrigger><SelectValue placeholder="Especificar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referido_cliente">Cliente</SelectItem>
                  <SelectItem value="referido_veterinario">Veterinario</SelectItem>
                  <SelectItem value="referido_entrenador">Entrenador Canino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Método de Pago */}
        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <Select value={metodoPago ?? ""} onValueChange={(v: string | null) => setMetodoPago((v || null) as MetodoPago | null)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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
        </div>

        {/* Franja + Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Franja Horaria</Label>
            <Select value={franjaHoraria} onValueChange={(v) => setFranjaHoraria(v as FranjaHoraria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
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

        {/* Contraentrega */}
        <div className="flex items-center gap-3">
          <Switch id="contra" checked={esContraentrega} onCheckedChange={setEsContraentrega} />
          <Label htmlFor="contra" className="text-sm">Es contraentrega</Label>
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
