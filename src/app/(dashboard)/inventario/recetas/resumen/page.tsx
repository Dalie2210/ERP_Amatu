"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Printer, ClipboardList } from "lucide-react"
import { formatGramaje } from "@/lib/inventario/mezcla"

interface DietaOption {
  receta_id: string
  producto_id: string
  producto_nombre: string
  receta_nombre: string
  base_gramos: number | null
}

interface VarianteOption {
  id: string
  producto_id: string
  presentacion: string
  gramaje_g: number | null
}

interface ResumenRow {
  insumo_id: string
  insumo_codigo: string
  insumo_nombre: string
  unidad_medida: string
  cocido_por_porcion: number
  merma_pct: number
  rendimiento_pct: number
  factor_conversion: number | null
  cocido_total: number
  crudo_total: number | null
  stock_disponible: number
  faltante: number
}

const fmt = (n: number | null | undefined, dec = 2) =>
  n == null ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: dec })

export default function ResumenRecetaPage() {
  const supabase = useMemo(() => createClient(), [])

  const [dietas, setDietas] = useState<DietaOption[]>([])
  const [variantes, setVariantes] = useState<VarianteOption[]>([])
  const [productoId, setProductoId] = useState<string>("")
  const [varianteId, setVarianteId] = useState<string>("")
  const [cantidad, setCantidad] = useState("40")
  const [filas, setFilas] = useState<ResumenRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from("recetas")
      .select("id, nombre, producto_id, base_gramos, producto:productos!producto_id(nombre)")
      .eq("is_active", true)
      .order("nombre")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        const list: DietaOption[] = (data ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => ({
            receta_id: r.id,
            producto_id: r.producto_id,
            producto_nombre: r.producto?.nombre ?? r.nombre,
            receta_nombre: r.nombre,
            base_gramos: r.base_gramos,
          })
        )
        setDietas(list)
      })

    supabase
      .from("producto_variantes")
      .select("id, producto_id, presentacion, gramaje_g")
      .eq("is_active", true)
      .order("gramaje_g")
      .then(({ data }) => setVariantes((data ?? []) as unknown as VarianteOption[]))
  }, [supabase])

  const variantesDeDieta = variantes.filter((v) => v.producto_id === productoId)
  const dietaSel = dietas.find((d) => d.producto_id === productoId) ?? null
  const varianteSel = variantes.find((v) => v.id === varianteId) ?? null

  const consultar = useCallback(async () => {
    const cant = parseFloat(cantidad)
    if (!productoId || !varianteId || isNaN(cant) || cant <= 0) {
      setFilas([])
      return
    }
    setIsLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc("fn_resumen_receta", {
      p_producto_id: productoId,
      p_cantidad: cant,
      p_variante_id: varianteId,
    })
    if (rpcErr) {
      setError(rpcErr.message)
      setFilas([])
    } else {
      setFilas((data ?? []) as unknown as ResumenRow[])
    }
    setIsLoading(false)
  }, [supabase, productoId, varianteId, cantidad])

  useEffect(() => { consultar() }, [consultar])

  const totalCrudo = filas.reduce((a, f) => a + (f.crudo_total ?? 0), 0)
  const hayFaltantes = filas.some((f) => f.faltante > 0)

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-start gap-3 print:hidden">
        <Link href="/inventario/recetas">
          <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-heading tracking-tight">Amarre de cocción</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Insumos requeridos para producir una cantidad dada de una dieta. Sale directo de la
            receta cargada en el sistema, con los mismos cálculos que usa la orden de producción.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      <Card className="border-none shadow-sm print:shadow-none">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <div className="min-w-56">
              <Label className="text-xs text-muted-foreground">Dieta</Label>
              <Select
                value={productoId}
                onValueChange={(v) => {
                  if (!v) return
                  setProductoId(v)
                  setVarianteId("")
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar dieta...">
                    {dietaSel?.producto_nombre ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dietas.map((d) => (
                    <SelectItem key={d.receta_id} value={d.producto_id}>
                      {d.producto_nombre} ({d.receta_nombre})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Presentación</Label>
              <Select
                value={varianteId}
                onValueChange={(v) => v && setVarianteId(v)}
                disabled={!productoId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Gramaje...">
                    {varianteSel?.presentacion ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {variantesDeDieta.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.presentacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Label className="text-xs text-muted-foreground">Cantidad (unidades)</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          </div>

          {dietaSel && varianteSel && (
            <div className="text-sm">
              <span className="font-semibold">{dietaSel.producto_nombre}</span> ·{" "}
              {cantidad} × {varianteSel.presentacion}
              {varianteSel.gramaje_g != null && (
                <span className="text-muted-foreground">
                  {" "}= {formatGramaje(Number(cantidad || 0) * varianteSel.gramaje_g)} de producto
                </span>
              )}
              {dietaSel.base_gramos != null && (
                <span className="text-muted-foreground">
                  {" "}· receta base {formatGramaje(dietaSel.base_gramos)}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : filas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">Elige una dieta, su presentación y la cantidad a producir.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Por porción</TableHead>
                    <TableHead className="text-right">Factor</TableHead>
                    <TableHead className="text-right">Cocido total</TableHead>
                    <TableHead className="text-right font-semibold">Crudo total</TableHead>
                    <TableHead className="text-right print:hidden">Stock</TableHead>
                    <TableHead className="text-right print:hidden">Faltante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((f) => (
                    <TableRow key={f.insumo_id}>
                      <TableCell>
                        <div className="font-medium text-sm">{f.insumo_nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.insumo_codigo} · merma {f.merma_pct}%
                          {f.rendimiento_pct !== 100 ? `, rendimiento ${f.rendimiento_pct}%` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt(f.cocido_por_porcion)} {f.unidad_medida}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {fmt(f.factor_conversion, 3)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt(f.cocido_total)} {f.unidad_medida}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">
                        {fmt(f.crudo_total)} {f.unidad_medida}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground print:hidden">
                        {fmt(f.stock_disponible)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums text-sm print:hidden ${
                          f.faltante > 0 ? "text-destructive font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {f.faltante > 0 ? fmt(f.faltante) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-xs text-muted-foreground mt-3">
                Total en crudo: <span className="font-medium text-foreground">{fmt(totalCrudo)}</span>
                {hayFaltantes && (
                  <span className="text-destructive"> · hay insumos con stock insuficiente</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
