"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AnularIngresoDialog } from "@/components/inventario/AnularIngresoDialog"
import { ArrowLeft, Ban, Pencil } from "lucide-react"
import type { Ingreso, MovimientoInventario } from "@/types"
import { TIPO_INSUMO_LABELS, TIPO_MOVIMIENTO_LABELS } from "@/lib/constants/labels"

type IngresoItemRow = {
  id: string
  insumo_id: string
  cantidad: number
  precio_compra: number
  precio_unitario: number | null
  codigo_lote: string
  fecha_vencimiento: string | null
  insumos: { nombre: string } | null
}

type MovimientoRow = MovimientoInventario & { insumos: { nombre: string } | null }

export default function IngresoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { role } = useAuth()

  const [ingreso, setIngreso] = useState<Ingreso | null>(null)
  const [items, setItems] = useState<IngresoItemRow[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const canWrite = role === "admin" || role === "logistica"

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: ingresoData }, { data: itemsData }, { data: movimientosData }] = await Promise.all([
      supabase.from("ingresos").select("*").eq("id", id).single(),
      supabase.from("ingreso_items").select("*, insumos(nombre)").eq("ingreso_id", id),
      supabase
        .from("movimientos_inventario")
        .select("*, insumos(nombre)")
        .eq("referencia_id", id)
        .in("referencia_tipo", ["ingreso", "ingreso_editado", "ingreso_anulado"])
        .order("created_at", { ascending: true }),
    ])

    setIngreso(ingresoData ?? null)
    setItems((itemsData as IngresoItemRow[]) ?? [])
    setMovimientos((movimientosData as MovimientoRow[]) ?? [])
    setIsLoading(false)
  }, [supabase, id])

  useEffect(() => { fetchData() }, [fetchData])

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Cargando ingreso...</div>
  }

  if (!ingreso) {
    return (
      <div className="p-6 text-muted-foreground">
        Ingreso no encontrado.
        <Button variant="link" onClick={() => router.push("/inventario/ingresos")}>Volver</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventario/ingresos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading tracking-tight">{ingreso.numero ?? "Ingreso"}</h1>
              {ingreso.anulado && <Badge variant="destructive">Anulado</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">
              {TIPO_INSUMO_LABELS[ingreso.tipo_ingreso]} · {new Date(ingreso.fecha).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        {canWrite && !ingreso.anulado && (
          <div className="flex gap-2">
            <Link href={`/inventario/ingresos/${id}/editar`}>
              <Button variant="outline" className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <AnularIngresoDialog
              ingresoId={id}
              numero={ingreso.numero}
              onAnulado={fetchData}
              trigger={
                <Button variant="destructive" className="gap-2">
                  <Ban className="h-4 w-4" />
                  Anular Ingreso
                </Button>
              }
            />
          </div>
        )}
      </div>

      {ingreso.anulado && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm p-4 space-y-1">
          <p className="font-medium">Este ingreso fue anulado.</p>
          {ingreso.anulado_motivo && <p>Motivo: {ingreso.anulado_motivo}</p>}
          {ingreso.anulado_at && (
            <p>Fecha: {new Date(ingreso.anulado_at).toLocaleString("es-CO")}</p>
          )}
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Datos del Ingreso</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Proveedor</p>
            <p className="font-medium">{ingreso.proveedor ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium">${ingreso.total_costo.toLocaleString("es-CO", { maximumFractionDigits: 2 })}</p>
          </div>
          {ingreso.temperatura_llegada != null && (
            <div>
              <p className="text-muted-foreground">Temperatura de Llegada</p>
              <p className="font-medium">{ingreso.temperatura_llegada}°C</p>
            </div>
          )}
          {ingreso.placa_vehiculo && (
            <div>
              <p className="text-muted-foreground">Placa del Vehículo</p>
              <p className="font-medium">{ingreso.placa_vehiculo}</p>
            </div>
          )}
          {ingreso.notas && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notas</p>
              <p className="font-medium">{ingreso.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Ítems</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Compra</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.insumos?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right">{it.cantidad.toLocaleString("es-CO")}</TableCell>
                  <TableCell className="text-right">
                    ${it.precio_compra.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {it.precio_unitario != null
                      ? `$${it.precio_unitario.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{it.codigo_lote}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {it.fecha_vencimiento ? new Date(it.fecha_vencimiento).toLocaleDateString("es-CO") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Movimientos de Inventario</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Sin movimientos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(mov.created_at).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {TIPO_MOVIMIENTO_LABELS[mov.tipo] ?? mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{mov.insumos?.nombre ?? "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${mov.cantidad < 0 ? "text-destructive" : ""}`}>
                      {mov.cantidad.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{mov.notas ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
