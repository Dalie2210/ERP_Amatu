"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ClipboardCheck, Search, ChevronLeft, ChevronRight, Save, X, MessageSquare, Sliders } from "lucide-react"
import type { CategoriaConteo } from "@/types"
import { CATEGORIA_CONTEO_LABELS } from "@/lib/constants/labels"
import { AjusteRapidoDialog, type AjustePreset } from "@/components/inventario/AjusteRapidoDialog"
import { GuardarConteoDialog } from "./GuardarConteoDialog"
import { normalizar, type ConteoItemRow, type ConteoDraftItem } from "./utils"

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
const ALL = "all"

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function ConteoCapturaPanel() {
  const supabase = useMemo(() => createClient(), [])

  const [categoria, setCategoria] = useState<CategoriaConteo>("materia_prima")
  const [items, setItems] = useState<ConteoItemRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [pageSize, setPageSize] = useState<number | typeof ALL>(50)
  const [page, setPage] = useState(0)
  const [mostrarNotas, setMostrarNotas] = useState(false)

  // Borrador indexado por `key` del ítem — nunca por índice de fila, para que el
  // valor sobreviva al buscar, paginar o cambiar el tamaño de página.
  const [conteos, setConteos] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  const pendingFocus = useRef<"first" | "last" | null>(null)

  const loadItems = useCallback(async () => {
    setIsLoading(true)

    if (categoria === "producto_terminado") {
      const { data: variantes } = await supabase
        .from("producto_variantes")
        .select("id, presentacion, producto_id, productos(nombre)")
        .eq("is_active", true)
        .order("presentacion")

      const { data: stockRows } = await supabase
        .from("v_stock_productos")
        .select("variante_id, estado, stock_disponible")

      const stockByVariante = new Map<string, number>()
      for (const r of (stockRows ?? []) as { variante_id: string; estado: string; stock_disponible: number }[]) {
        if (r.estado === "despachado") continue
        stockByVariante.set(r.variante_id, (stockByVariante.get(r.variante_id) ?? 0) + Number(r.stock_disponible))
      }

      const rows: ConteoItemRow[] = ((variantes ?? []) as unknown as { id: string; presentacion: string; producto_id: string; productos: { nombre: string } | null }[]).map((v) => ({
        key: v.id,
        codigo: null,
        nombre: v.productos?.nombre ?? "—",
        detalle: v.presentacion,
        stockMinimo: null,
        cantidadSistema: stockByVariante.get(v.id) ?? 0,
        insumoId: null,
        productoId: v.producto_id,
        varianteId: v.id,
      }))
      setItems(rows)
    } else {
      const { data: insumos } = await supabase
        .from("insumos")
        .select("id, codigo, nombre, unidad_medida, stock_minimo")
        .eq("tipo", categoria)
        .eq("is_active", true)
        .order("nombre")

      const { data: stockRows } = await supabase.from("v_stock_insumos").select("insumo_id, stock_disponible")
      const stockByInsumo = new Map(
        ((stockRows ?? []) as { insumo_id: string; stock_disponible: number }[]).map((s) => [s.insumo_id, Number(s.stock_disponible)])
      )

      const rows: ConteoItemRow[] = ((insumos ?? []) as { id: string; codigo: string | null; nombre: string; unidad_medida: string; stock_minimo: number }[]).map((i) => ({
        key: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        detalle: i.unidad_medida,
        stockMinimo: i.stock_minimo,
        cantidadSistema: stockByInsumo.get(i.id) ?? 0,
        insumoId: i.id,
        productoId: null,
        varianteId: null,
      }))
      setItems(rows)
    }
    setIsLoading(false)
  }, [supabase, categoria])

  useEffect(() => { void loadItems() }, [loadItems])

  // --- Filtrado y paginación (en memoria: el catálogo se carga completo) ---
  const filtered = useMemo(() => {
    const q = normalizar(debouncedSearch.trim())
    if (!q) return items
    return items.filter((it) =>
      normalizar(it.codigo ?? "").includes(q) ||
      normalizar(it.nombre).includes(q) ||
      normalizar(it.detalle).includes(q)
    )
  }, [items, debouncedSearch])

  const total = filtered.length
  const size = pageSize === ALL ? Math.max(total, 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(page, totalPages - 1)
  const visible = useMemo(
    () => filtered.slice(currentPage * size, currentPage * size + size),
    [filtered, currentPage, size]
  )

  // --- Borrador ---
  const draftItems = useMemo<ConteoDraftItem[]>(() => {
    const out: ConteoDraftItem[] = []
    for (const it of items) {
      const raw = conteos[it.key]
      if (raw === undefined || raw.trim() === "") continue
      const contada = Number(raw)
      if (!Number.isFinite(contada) || contada < 0) continue
      out.push({ item: it, cantidadContada: contada, nota: notas[it.key]?.trim() || null })
    }
    return out
  }, [items, conteos, notas])

  const conDiferencia = useMemo(
    () => draftItems.filter((d) => d.cantidadContada !== d.item.cantidadSistema),
    [draftItems]
  )

  const hayBorrador = draftItems.length > 0

  useEffect(() => {
    if (!hayBorrador) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hayBorrador])

  const descartar = useCallback(() => {
    setConteos({})
    setNotas({})
  }, [])

  const cambiarCategoria = useCallback((value: CategoriaConteo) => {
    if (hayBorrador && !window.confirm("Hay un conteo sin guardar. ¿Descartarlo y cambiar de categoría?")) return
    descartar()
    setCategoria(value)
    setPage(0)
  }, [hayBorrador, descartar])

  // --- Navegación con teclado ---
  // Tras avanzar/retroceder de página el foco se aplica en el render siguiente.
  useEffect(() => {
    if (!pendingFocus.current || visible.length === 0) return
    const target = pendingFocus.current === "first" ? visible[0] : visible[visible.length - 1]
    pendingFocus.current = null
    const el = inputRefs.current.get(target.key)
    el?.focus()
    el?.select()
  }, [visible])

  const focusRow = useCallback((key: string) => {
    const el = inputRefs.current.get(key)
    el?.focus()
    el?.select()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Escape") {
      e.preventDefault()
      const key = visible[index].key
      setConteos((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      if (index < visible.length - 1) {
        focusRow(visible[index + 1].key)
      } else if (currentPage < totalPages - 1) {
        pendingFocus.current = "first"
        setPage(currentPage + 1)
      } else {
        e.currentTarget.blur()
      }
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (index > 0) {
        focusRow(visible[index - 1].key)
      } else if (currentPage > 0) {
        pendingFocus.current = "last"
        setPage(currentPage - 1)
      }
    }
  }, [visible, currentPage, totalPages, focusRow])

  // --- Guardado ---
  const handleSaved = useCallback(() => {
    setConfirmOpen(false)
    descartar()
    void loadItems()
  }, [descartar, loadItems])

  const registrarRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el)
    else inputRefs.current.delete(key)
  }, [])

  const resumen = `${draftItems.length} ${draftItems.length === 1 ? "ítem contado" : "ítems contados"} · ${conDiferencia.length} con diferencia`

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Select value={categoria} onValueChange={(v) => v && cambiarCategoria(v as CategoriaConteo)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue>{CATEGORIA_CONTEO_LABELS[categoria]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIA_CONTEO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
              />
            </div>

            <Select
              value={String(pageSize)}
              onValueChange={(v) => { if (v) { setPageSize(v === ALL ? ALL : Number(v)); setPage(0) } }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue>{pageSize === ALL ? "Todos" : `${pageSize} por página`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
                ))}
                <SelectItem value={ALL}>Todos</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={mostrarNotas ? "secondary" : "outline"}
              onClick={() => setMostrarNotas((v) => !v)}
              className="gap-1.5"
            >
              <MessageSquare className="h-4 w-4" />
              Observaciones
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {hayBorrador && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b bg-muted/40">
              <p className="text-sm font-medium">{resumen}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={descartar} className="gap-1.5">
                  <X className="h-4 w-4" />Descartar
                </Button>
                <Button size="sm" onClick={() => setConfirmOpen(true)} className="gap-1.5">
                  <Save className="h-4 w-4" />Guardar cambios
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <ClipboardCheck className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {debouncedSearch.trim()
                  ? "Ningún ítem coincide con la búsqueda."
                  : "No hay ítems activos en esta categoría."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Ítem</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Sistema</TableHead>
                      <TableHead className="w-[130px] text-right">Conteo</TableHead>
                      <TableHead className="w-[110px] text-right">Diferencia</TableHead>
                      {mostrarNotas && <TableHead className="w-[220px]">Observación</TableHead>}
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((it, index) => {
                      const raw = conteos[it.key] ?? ""
                      const contada = raw.trim() === "" ? null : Number(raw)
                      const valido = contada !== null && Number.isFinite(contada) && contada >= 0
                      const diferencia = valido ? contada - it.cantidadSistema : null

                      const preset: AjustePreset = it.insumoId
                        ? {
                            tipo: "insumo",
                            nombre: it.nombre,
                            detalle: it.detalle,
                            insumoId: it.insumoId,
                            stockActual: it.cantidadSistema,
                            stockMinimo: it.stockMinimo ?? undefined,
                          }
                        : {
                            tipo: "producto",
                            nombre: it.nombre,
                            detalle: it.detalle,
                            productoId: it.productoId ?? undefined,
                            varianteId: it.varianteId ?? undefined,
                            stockActual: it.cantidadSistema,
                          }

                      return (
                        <TableRow key={it.key} className={diferencia !== null && diferencia !== 0 ? "bg-muted/30" : undefined}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{it.codigo ?? "—"}</TableCell>
                          <TableCell className="font-medium">{it.nombre}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{it.detalle}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {it.cantidadSistema.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              ref={(el) => registrarRef(it.key, el)}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              value={raw}
                              placeholder="—"
                              className="h-9 text-right tabular-nums"
                              onChange={(e) => setConteos((prev) => ({ ...prev, [it.key]: e.target.value }))}
                              onFocus={(e) => e.currentTarget.select()}
                              onKeyDown={(e) => handleKeyDown(e, index)}
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {diferencia === null ? (
                              <span className="text-muted-foreground font-normal">—</span>
                            ) : diferencia === 0 ? (
                              <span className="text-muted-foreground font-normal">0</span>
                            ) : (
                              <span className={diferencia > 0 ? "text-emerald-600" : "text-destructive"}>
                                {diferencia > 0 ? "+" : ""}
                                {diferencia.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </TableCell>
                          {mostrarNotas && (
                            <TableCell>
                              <Input
                                value={notas[it.key] ?? ""}
                                placeholder="Opcional"
                                className="h-9"
                                onChange={(e) => setNotas((prev) => ({ ...prev, [it.key]: e.target.value }))}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            {/* El conteo masivo no cubre mermas: para eso queda el ajuste puntual. */}
                            <AjusteRapidoDialog
                              preset={preset}
                              onSaved={loadItems}
                              trigger={
                                <Button variant="ghost" size="icon" title="Ajuste puntual / merma">
                                  <Sliders className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {currentPage * size + 1}–{Math.min((currentPage + 1) * size, total)} de {total}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">{currentPage + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>
                      Siguiente<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {hayBorrador && (
        <div className="sticky bottom-0 z-10 -mx-2 px-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-sm font-medium">{resumen}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={descartar} className="gap-1.5">
                <X className="h-4 w-4" />Descartar
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} className="gap-1.5">
                <Save className="h-4 w-4" />Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      <GuardarConteoDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        categoria={categoria}
        draftItems={draftItems}
        conDiferencia={conDiferencia}
        onSaved={handleSaved}
      />
    </div>
  )
}
