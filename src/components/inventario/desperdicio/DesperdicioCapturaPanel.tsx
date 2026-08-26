"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Save, Loader2 } from "lucide-react"
import type { MotivoDesperdicio } from "@/types"
import { MOTIVO_DESPERDICIO_LABELS } from "@/lib/constants/labels"
import { ItemCombobox } from "./ItemCombobox"
import {
  errorDeFila, filaTocada, formatKg, hoyISO, nuevaFila,
  type FilaDesperdicio, type ItemOption, type LoteOption,
} from "./utils"

const PROVEEDORES_LIST_ID = "desperdicio-proveedores"

export function DesperdicioCapturaPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [opciones, setOpciones] = useState<ItemOption[]>([])
  const [proveedores, setProveedores] = useState<string[]>([])
  // Lotes con saldo por insumo, para ofrecerlos en la columna LOTE.
  const [lotesPorInsumo, setLotesPorInsumo] = useState<Record<string, LoteOption[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [filas, setFilas] = useState<FilaDesperdicio[]>(() => [nuevaFila()])

  useEffect(() => {
    const cargar = async () => {
      setIsLoading(true)
      const [{ data: insumos }, { data: variantes }, { data: lotes }] = await Promise.all([
        supabase
          .from("insumos")
          .select("id, codigo, nombre, unidad_medida")
          .eq("is_active", true)
          .order("nombre"),
        supabase
          .from("producto_variantes")
          .select("id, presentacion, producto_id, productos(nombre)")
          .eq("is_active", true)
          .order("presentacion"),
        supabase
          .from("insumo_lotes")
          .select("id, codigo_lote, proveedor, insumo_id")
          .gt("cantidad_disponible", 0)
          .order("fecha_ingreso", { ascending: false }),
      ])

      const opcionesInsumo: ItemOption[] = ((insumos ?? []) as {
        id: string; codigo: string | null; nombre: string; unidad_medida: string
      }[]).map((i) => ({
        key: `i:${i.id}`,
        nombre: i.nombre,
        detalle: i.unidad_medida,
        codigo: i.codigo,
        insumoId: i.id,
        productoId: null,
        varianteId: null,
      }))

      const opcionesPT: ItemOption[] = ((variantes ?? []) as unknown as {
        id: string; presentacion: string; producto_id: string; productos: { nombre: string } | null
      }[]).map((v) => ({
        key: `v:${v.id}`,
        nombre: v.productos?.nombre ?? "—",
        detalle: v.presentacion,
        codigo: null,
        insumoId: null,
        productoId: v.producto_id,
        varianteId: v.id,
      }))

      setOpciones([...opcionesInsumo, ...opcionesPT])

      const porInsumo: Record<string, LoteOption[]> = {}
      const proveedoresSet = new Set<string>()
      for (const l of (lotes ?? []) as {
        id: string; codigo_lote: string; proveedor: string | null; insumo_id: string
      }[]) {
        ;(porInsumo[l.insumo_id] ??= []).push({ id: l.id, codigo: l.codigo_lote, proveedor: l.proveedor })
        if (l.proveedor) proveedoresSet.add(l.proveedor)
      }
      setLotesPorInsumo(porInsumo)
      setProveedores([...proveedoresSet].sort((a, b) => a.localeCompare(b, "es")))
      setIsLoading(false)
    }
    void cargar()
  }, [supabase])

  const actualizar = useCallback((uid: string, cambios: Partial<FilaDesperdicio>) => {
    setFilas((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...cambios } : f)))
  }, [])

  const agregarFila = useCallback(() => {
    // Hereda la fecha de la última fila: casi siempre se cargan varios
    // desperdicios del mismo día.
    setFilas((prev) => [...prev, nuevaFila(prev[prev.length - 1]?.fecha ?? hoyISO())])
  }, [])

  const eliminarFila = useCallback((uid: string) => {
    setFilas((prev) => (prev.length === 1 ? [nuevaFila()] : prev.filter((f) => f.uid !== uid)))
  }, [])

  /** Al escribir un lote conocido, se ata la FK y se autocompleta el proveedor. */
  const onLoteChange = useCallback((fila: FilaDesperdicio, codigo: string) => {
    const lotes = fila.item?.insumoId ? lotesPorInsumo[fila.item.insumoId] ?? [] : []
    const match = lotes.find((l) => l.codigo === codigo)
    actualizar(fila.uid, {
      codigoLote: codigo,
      insumoLoteId: match?.id ?? null,
      proveedor: match?.proveedor && !fila.proveedor ? match.proveedor : fila.proveedor,
    })
  }, [actualizar, lotesPorInsumo])

  const activas = useMemo(() => filas.filter(filaTocada), [filas])
  const totalKg = useMemo(
    () => activas.reduce((acc, f) => acc + (Number(f.cantidadKg) || 0), 0),
    [activas]
  )

  const guardar = useCallback(async () => {
    if (activas.length === 0) {
      toast.error("No hay filas para registrar")
      return
    }
    for (const f of activas) {
      const error = errorDeFila(f)
      if (error) {
        toast.error(`${error} (fila ${filas.indexOf(f) + 1})`)
        return
      }
    }

    setIsSaving(true)
    const res = await fetch("/api/inventario/desperdicio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: activas.map((f) => ({
          fecha: f.fecha,
          insumo_id: f.item?.insumoId ?? null,
          producto_id: f.item?.productoId ?? null,
          variante_id: f.item?.varianteId ?? null,
          cantidad_kg: Number(f.cantidadKg),
          temperatura_c: f.temperaturaC.trim() === "" ? null : Number(f.temperaturaC),
          proveedor: f.proveedor.trim() || null,
          codigo_lote: f.codigoLote.trim() || null,
          insumo_lote_id: f.insumoLoteId,
          producto_lote_id: null,
          motivo: f.motivo,
          razon_dano: f.razonDano.trim(),
          accion_correctiva: f.accionCorrectiva.trim() || null,
        })),
      }),
    })

    const body = await res.json().catch(() => ({}))
    setIsSaving(false)

    if (!res.ok) {
      toast.error(body.error ?? "No se pudo registrar el desperdicio")
      return
    }

    toast.success(
      activas.length === 1
        ? "Desperdicio registrado"
        : `${activas.length} registros de desperdicio guardados`
    )
    setFilas([nuevaFila()])
  }, [activas, filas])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1400px]">
              <thead className="bg-muted/60">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium w-[140px]">Fecha</th>
                  <th className="px-3 py-2 font-medium w-[220px]">Producto</th>
                  <th className="px-3 py-2 font-medium w-[120px] text-right">Cantidad (kg)</th>
                  <th className="px-3 py-2 font-medium w-[110px] text-right">Temp. (°C)</th>
                  <th className="px-3 py-2 font-medium w-[180px]">Proveedor</th>
                  <th className="px-3 py-2 font-medium w-[150px]">Lote</th>
                  <th className="px-3 py-2 font-medium w-[190px]">Motivo</th>
                  <th className="px-3 py-2 font-medium w-[260px]">Razones por qué se dañó</th>
                  <th className="px-3 py-2 font-medium w-[240px]">Acción correctiva</th>
                  <th className="px-3 py-2 w-[48px]" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const lotes = f.item?.insumoId ? lotesPorInsumo[f.item.insumoId] ?? [] : []
                  const listId = `lotes-${f.uid}`
                  return (
                    <tr key={f.uid} className="border-t align-top">
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          className="h-9"
                          value={f.fecha}
                          onChange={(e) => actualizar(f.uid, { fecha: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <ItemCombobox
                          value={f.item}
                          options={opciones}
                          onChange={(item) => actualizar(f.uid, { item, codigoLote: "", insumoLoteId: null })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          className="h-9 text-right tabular-nums"
                          placeholder="0.00"
                          value={f.cantidadKg}
                          onChange={(e) => actualizar(f.uid, { cantidadKg: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          className="h-9 text-right tabular-nums"
                          placeholder="—"
                          value={f.temperaturaC}
                          onChange={(e) => actualizar(f.uid, { temperaturaC: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-9"
                          list={PROVEEDORES_LIST_ID}
                          placeholder="Opcional"
                          value={f.proveedor}
                          onChange={(e) => actualizar(f.uid, { proveedor: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-9 font-mono text-xs"
                          list={lotes.length > 0 ? listId : undefined}
                          placeholder="Opcional"
                          value={f.codigoLote}
                          onChange={(e) => onLoteChange(f, e.target.value)}
                        />
                        {lotes.length > 0 && (
                          <datalist id={listId}>
                            {lotes.map((l) => <option key={l.id} value={l.codigo} />)}
                          </datalist>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={f.motivo}
                          onValueChange={(v) => actualizar(f.uid, { motivo: (v as MotivoDesperdicio) ?? "otro" })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue>{MOTIVO_DESPERDICIO_LABELS[f.motivo]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(MOTIVO_DESPERDICIO_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          rows={2}
                          className="min-h-9 resize-y"
                          placeholder="Qué pasó con el producto"
                          value={f.razonDano}
                          onChange={(e) => actualizar(f.uid, { razonDano: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          rows={2}
                          className="min-h-9 resize-y"
                          placeholder="Opcional"
                          value={f.accionCorrectiva}
                          onChange={(e) => actualizar(f.uid, { accionCorrectiva: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => eliminarFila(f.uid)}
                          aria-label="Eliminar fila"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <datalist id={PROVEEDORES_LIST_ID}>
            {proveedores.map((p) => <option key={p} value={p} />)}
          </datalist>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
            <Button variant="outline" className="gap-1.5" onClick={agregarFila}>
              <Plus className="h-4 w-4" />Agregar fila
            </Button>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {activas.length === 0
                  ? "Sin filas diligenciadas"
                  : `${activas.length} ${activas.length === 1 ? "fila" : "filas"} · ${formatKg(totalKg)} kg`}
              </p>
              <Button className="gap-1.5" disabled={activas.length === 0 || isSaving} onClick={() => void guardar()}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar registro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Este reporte es informativo y trazable: <strong>no descuenta stock</strong>. El ajuste real
        del inventario se hace con el conteo físico, para no restar la misma pérdida dos veces.
      </p>
    </div>
  )
}
