"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"
import type { CategoriaConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { formatCantidad, type ConteoDraftItem } from "./utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria: CategoriaConteo
  draftItems: ConteoDraftItem[]
  conDiferencia: ConteoDraftItem[]
  onSaved: () => void
}

export function GuardarConteoDialog({
  open, onOpenChange, categoria, draftItems, conDiferencia, onSaved,
}: Props) {
  // El motivo se prellena por defecto y sólo pasa a estado propio si el usuario lo edita.
  const motivoPorDefecto = useMemo(
    () => `Conteo físico ${CATEGORIA_CONTEO_LABELS[categoria]} ${new Date().toLocaleDateString("es-CO")}`,
    [categoria]
  )
  const [motivoEditado, setMotivoEditado] = useState<string | null>(null)
  const motivo = motivoEditado ?? motivoPorDefecto
  const [isSaving, setIsSaving] = useState(false)

  const cerrar = (v: boolean) => {
    if (isSaving) return
    if (!v) setMotivoEditado(null)
    onOpenChange(v)
  }

  const handleSave = async () => {
    if (!motivo.trim()) {
      toast.error("El motivo del conteo es requerido")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/inventario/conteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          motivo: motivo.trim(),
          items: draftItems.map((d) => ({
            insumo_id: d.item.insumoId,
            producto_id: d.item.productoId,
            variante_id: d.item.varianteId,
            cantidad_contada: d.cantidadContada,
            nota: d.nota,
          })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // El guardado es atómico: si falló no se aplicó nada, así que el
        // borrador se conserva para que el usuario no pierda la captura.
        toast.error(json.error ?? "No se pudo guardar el conteo")
        return
      }
      toast.success(
        conDiferencia.length > 0
          ? `Conteo enviado para aprobación (${conDiferencia.length} diferencia(s))`
          : "Conteo guardado sin diferencias"
      )
      onSaved()
    } catch {
      toast.error("No se pudo guardar el conteo")
    } finally {
      setIsSaving(false)
    }
  }

  const sinDiferencia = draftItems.length - conDiferencia.length

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Guardar conteo — {CATEGORIA_CONTEO_LABELS[categoria]}</DialogTitle>
          <DialogDescription>
            Se registrarán {draftItems.length} ítem(s) contados.
            {conDiferencia.length > 0
              ? ` El conteo quedará pendiente de aprobación por un administrador (${conDiferencia.length} diferencia(s) encontrada(s)); el stock no cambia hasta que se apruebe.`
              : " No hay diferencias, así que se guarda como constancia sin necesitar aprobación."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {conDiferencia.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún ítem presenta diferencia. Se guardará la sesión de conteo como constancia,
              sin modificar el stock.
            </p>
          ) : (
            <div className="rounded-md border max-h-[280px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Ítem</th>
                    <th className="px-3 py-2 font-medium text-right">Sistema</th>
                    <th className="px-3 py-2 font-medium text-right">Contado</th>
                    <th className="px-3 py-2 font-medium text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {conDiferencia.map((d) => {
                    const dif = d.cantidadContada - d.item.cantidadSistema
                    return (
                      <tr key={d.item.key} className="border-t">
                        <td className="px-3 py-2">
                          {d.item.nombre}
                          <span className="text-muted-foreground"> — {d.item.detalle}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatCantidad(d.item.cantidadSistema)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCantidad(d.cantidadContada)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-semibold ${dif > 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {dif > 0 ? "+" : ""}{formatCantidad(dif)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sinDiferencia > 0 && (
            <p className="text-xs text-muted-foreground">
              {sinDiferencia} ítem(s) coincidieron con el sistema y también quedarán registrados en la sesión.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo-conteo">Motivo *</Label>
            <Textarea
              id="motivo-conteo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivoEditado(e.target.value)}
              placeholder="Ej. Conteo físico mensual"
            />
            <p className="text-xs text-muted-foreground">
              Queda como notas de la sesión y como motivo de cada movimiento de ajuste.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving || !motivo.trim()} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar conteo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
