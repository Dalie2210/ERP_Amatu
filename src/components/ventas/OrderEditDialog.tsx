"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { updateOrder } from "@/lib/pedidos/updateOrder"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Edit } from "lucide-react"
import { FRANJA_LABELS, ESTADO_PAGO_LABELS, METODO_PAGO_LABELS } from "@/lib/constants/labels"

interface OrderEditDialogProps {
  pedidoId: string
  currentFranja: string
  currentFechaTentativa: string | null
  currentNotas: string | null
  currentEstadoPago: string
  currentMetodoPago: string | null
  canEdit: boolean
  onEditSuccess: () => void
}

export function OrderEditDialog({
  pedidoId,
  currentFranja,
  currentFechaTentativa,
  currentNotas,
  currentEstadoPago,
  currentMetodoPago,
  canEdit,
  onEditSuccess,
}: OrderEditDialogProps) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [franja, setFranja] = useState(currentFranja)
  const [fechaTentativa, setFechaTentativa] = useState(currentFechaTentativa || "")
  const [notas, setNotas] = useState(currentNotas || "")
  const [estadoPago, setEstadoPago] = useState(currentEstadoPago)
  const [metodoPago, setMetodoPago] = useState(currentMetodoPago || "")

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesión activa")

      await updateOrder(supabase, {
        pedidoId,
        franjaHoraria: franja,
        fechaTentativaEntrega: fechaTentativa || null,
        notasVentas: notas,
        estadoPago,
        metodoPago,
        editorId: user.id,
      })

      toast.success("Pedido actualizado exitosamente")
      setOpen(false)
      onEditSuccess()
    } catch (err) {
      console.error(err)
      toast.error("Error al actualizar el pedido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" disabled={!canEdit} />}>
        <Edit className="h-4 w-4" /> Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del pedido. Los cambios quedarán registrados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="franja">Franja Horaria</Label>
            <Select value={franja} onValueChange={(v) => setFranja(v ?? currentFranja)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">
                  {franja ? (FRANJA_LABELS[franja] ?? franja) : null}
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

          <div className="grid gap-2">
            <Label htmlFor="fecha">Fecha Tentativa Entrega</Label>
            <Input
              id="fecha"
              type="date"
              value={fechaTentativa}
              onChange={(e) => setFechaTentativa(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notas">Notas de Ventas</Label>
            <Textarea
              id="notas"
              placeholder="Notas adicionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="estado-pago">Estado de Pago</Label>
            <Select value={estadoPago} onValueChange={(v) => setEstadoPago(v ?? currentEstadoPago)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">
                  {estadoPago ? (ESTADO_PAGO_LABELS[estadoPago] ?? estadoPago) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="metodo-pago">Método de Pago</Label>
            <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v ?? "")}>
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
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
