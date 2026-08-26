"use client"

import { use, useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Save, FlaskConical, History, ClipboardList, CheckCircle2,
  AlertTriangle, ChevronRight, Clock, Blend, PackageMinus,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import type { Json } from "@/types/database.types"
import type {
  OrdenProduccionItemExpanded,
  OrdenProduccionProcesoExpanded,
  OrdenMezclaExpanded,
  OrdenProduccionActividad,
  EstadoProduccion,
  TipoActividadProduccion,
} from "@/types"
import { ESTADO_PRODUCCION_LABELS } from "@/lib/constants/labels"
import { CompletarItemCard } from "@/components/inventario/CompletarItemCard"
import { MezclaPanel } from "@/components/inventario/MezclaPanel"
import { SobrantePanel } from "@/components/inventario/SobrantePanel"
import { cn } from "@/lib/utils"

// ------------------------------------------------------------
// Encabezado / metadatos de la orden (subset que consultamos)
// ------------------------------------------------------------
interface OrdenDetalle {
  id: string
  numero: string | null
  estado: EstadoProduccion
  fecha: string
  notas: string | null
  orden_origen_id: string | null
  updated_at: string | null
  updated_by: string | null
  editor: { full_name: string } | null
}

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planificada: "secondary",
  en_proceso: "outline",
  parcial: "outline",
  completada: "default",
  cancelada: "destructive",
}

/** Formato numérico corto y consistente para las columnas del amarre. */
function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 })
}

const ACTIVIDAD_ICONS: Record<string, React.ReactNode> = {
  proceso_guardado: <Save className="h-3 w-3" />,
  mezcla_guardada: <Blend className="h-3 w-3" />,
  mezcla_agrupada: <Blend className="h-3 w-3" />,
  sobrante_registrado: <PackageMinus className="h-3 w-3" />,
  saldos_aplicados: <PackageMinus className="h-3 w-3" />,
  item_completado: <CheckCircle2 className="h-3 w-3" />,
  item_parcial: <AlertTriangle className="h-3 w-3" />,
  orden_completada: <CheckCircle2 className="h-3 w-3" />,
  orden_cancelada: <AlertTriangle className="h-3 w-3" />,
}

function actividadTexto(a: OrdenProduccionActividad): string {
  const p = (a.payload ?? {}) as Record<string, unknown>
  switch (a.tipo) {
    case "proceso_guardado": {
      const cambios = Array.isArray(p.cambios) ? p.cambios.length : 0
      return cambios > 0
        ? `Guardó la documentación del proceso (${cambios} cambio${cambios !== 1 ? "s" : ""})`
        : "Guardó la documentación del proceso"
    }
    case "mezcla_guardada": {
      const cambios = Array.isArray(p.cambios) ? p.cambios.length : 0
      return cambios > 0
        ? `Guardó la hoja de mezcla (${cambios} cambio${cambios !== 1 ? "s" : ""})`
        : "Guardó la hoja de mezcla"
    }
    case "mezcla_agrupada":
      return `Combinó ${p.dietas ?? "varias"} dietas en una misma mezcla`
    case "sobrante_registrado":
      return `Registró sobrante de producto cocido${p.dieta ? ` en "${p.dieta}"` : ""}`
    case "saldos_aplicados":
      return `Aplicó los saldos a favor${p.insumos ? ` (${p.insumos} insumo${p.insumos === 1 ? "" : "s"})` : ""}`
    case "item_completado":
      return `Completó ${p.producto ? `"${p.producto}"` : "un producto"}${p.cantidad ? ` (${p.cantidad})` : ""}`
    case "item_parcial":
      return `Cerró como parcial ${p.producto ? `"${p.producto}"` : "un producto"}${p.cantidad ? ` (${p.cantidad})` : ""}`
    case "orden_completada":
      return "La orden quedó completada"
    case "orden_cancelada":
      return "Canceló la orden"
    default:
      return a.tipo
  }
}

// Etiquetas legibles de los campos editables de la hoja de proceso, usadas
// tanto para construir el diff al guardar como para mostrarlo en el historial.
const CAMPO_LABELS: Record<string, string> = {
  cant_obtenida_cocido: "Cantidad obtenida (cocido)",
  temp_descongelacion: "Temp. descongelación (°C)",
  cant_real_crudo: "Cantidad real en crudo",
  lotes: "Lote(s)",
  tiempo_coccion_horas: "Tiempo de cocción (h)",
  temp_final_coccion: "Temp. final de cocción (°C)",
  responsable_coccion: "Responsable de cocción",
  kilos_antes_molido: "Kilos antes de molido",
  tiempo_molienda: "Tiempo de molienda",
  kilos_final_molido: "Kilos final (molido)",
  empaque_conforme: "Empaque conforme",
  rotulado: "Rotulado",
  liberacion_lote: "Liberación de lote",
  responsable: "Responsable",
}

const CAMPOS_EDITABLES = Object.keys(CAMPO_LABELS) as (keyof OrdenProduccionProcesoExpanded)[]

// Diff genérico de un cambio de campo en la hoja de proceso o de mezcla:
// qué entidad (materia prima o dieta), qué campo, valor anterior y nuevo.
// Usado tanto por proceso_guardado como por mezcla_guardada en el historial.
interface CambioActividad {
  entidad: string
  campo: string
  campo_label: string
  anterior: string | number | boolean | null
  nuevo: string | number | boolean | null
}

// Compara la hoja de proceso original (tal como se cargó) contra la actual y
// arma la lista de cambios campo por campo, para dejar registro detallado en
// el historial (qué insumo, qué campo, valor anterior y nuevo).
function diffProcesos(
  original: OrdenProduccionProcesoExpanded[],
  actual: OrdenProduccionProcesoExpanded[]
): CambioActividad[] {
  const cambios: CambioActividad[] = []
  for (const p of actual) {
    const orig = original.find((o) => o.id === p.id)
    if (!orig) continue
    for (const campo of CAMPOS_EDITABLES) {
      const antes = (orig[campo] as string | number | boolean | null) ?? null
      const despues = (p[campo] as string | number | boolean | null) ?? null
      if (antes !== despues) {
        cambios.push({
          entidad: p.insumo?.nombre ?? "—",
          campo: campo as string,
          campo_label: CAMPO_LABELS[campo as string],
          anterior: antes,
          nuevo: despues,
        })
      }
    }
  }
  return cambios
}

function formatValorCambio(v: string | number | boolean | null): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "Sí" : "No"
  if (typeof v === "number") return v.toLocaleString("es-CO", { maximumFractionDigits: 2 })
  return String(v)
}

function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return "?"
  const partes = nombre.trim().split(/\s+/)
  const a = partes[0]?.[0] ?? ""
  const b = partes.length > 1 ? partes[partes.length - 1][0] : ""
  return (a + b).toUpperCase() || "?"
}

// Campos numéricos y de texto editables de la fila de proceso.
type CampoNumerico =
  | "cant_obtenida_cocido"
  | "temp_descongelacion" | "cant_real_crudo" | "tiempo_coccion_horas"
  | "temp_final_coccion" | "kilos_antes_molido" | "tiempo_molienda" | "kilos_final_molido"
type CampoTexto = "lotes" | "responsable_coccion" | "responsable"
type CampoCheck = "empaque_conforme" | "rotulado" | "liberacion_lote"

export default function OrdenProduccionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ordenId } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, role } = useAuth()
  const userId = user?.id ?? ""
  const [userName, setUserName] = useState("")

  const [orden, setOrden] = useState<OrdenDetalle | null>(null)
  const [items, setItems] = useState<OrdenProduccionItemExpanded[]>([])
  const [procesos, setProcesos] = useState<OrdenProduccionProcesoExpanded[]>([])
  // Snapshot de la hoja de proceso tal como se cargó, para poder calcular el
  // diff (qué cambió, valor anterior/nuevo) al guardar.
  const [procesosOriginal, setProcesosOriginal] = useState<OrdenProduccionProcesoExpanded[]>([])
  const [mezclas, setMezclas] = useState<OrdenMezclaExpanded[]>([])
  const [actividad, setActividad] = useState<OrdenProduccionActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [savingProcesos, setSavingProcesos] = useState(false)
  const [aplicandoSaldos, setAplicandoSaldos] = useState(false)
  // Insumo y cantidad con los que precargar el panel de sobrantes desde el Δ.
  const [sobrantePrecarga, setSobrantePrecarga] = useState<{ insumoId: string; cocido: number } | null>(null)
  const [dirty, setDirty] = useState(false)

  const tab = searchParams.get("tab") ?? "proceso"
  // Una orden completada o cancelada queda congelada: nada se vuelve a editar
  // (ni la hoja de proceso, ni la de mezclas, ni la completación de productos).
  // Los campos quedan visibles con su último valor guardado, solo lectura.
  const bloqueado = orden?.estado === "completada" || orden?.estado === "cancelada"
  const canEdit = (role === "admin" || role === "logistica" || role === "jefe_produccion") && !bloqueado

  function setTab(value: string) {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("tab", value)
    router.replace(`/inventario/produccion/${ordenId}?${sp.toString()}`, { scroll: false })
  }

  // Nombre del usuario actual (para registrar el historial).
  useEffect(() => {
    if (!userId) return
    supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single()
      .then(({ data }: { data: { full_name: string } | null }) => {
        if (data?.full_name) setUserName(data.full_name)
      })
  }, [userId, supabase])

  const fetchData = useCallback(async () => {
    setLoading(true)
    // Asegura que existan la hoja de proceso y la hoja de mezcla (idempotentes)
    // antes de leerlas.
    await Promise.all([
      supabase.rpc("fn_get_or_create_procesos_orden", { p_orden_id: ordenId }),
      supabase.rpc("fn_get_or_create_mezclas_orden", { p_orden_id: ordenId }),
    ])

    const [ordenRes, itemsRes, procesosRes, mezclasRes, actividadRes] = await Promise.all([
      supabase
        .from("ordenes_produccion")
        .select(`
          id, numero, estado, fecha, notas, orden_origen_id, updated_at, updated_by,
          editor:users!ordenes_produccion_updated_by_fkey(full_name)
        `)
        .eq("id", ordenId)
        .single(),
      supabase
        .from("orden_produccion_items")
        .select(`
          *,
          producto:productos!producto_id(nombre),
          variante:producto_variantes!variante_id(presentacion),
          receta:recetas!receta_id(nombre, rendimiento)
        `)
        .eq("orden_id", ordenId)
        .order("created_at"),
      supabase
        .from("orden_produccion_procesos")
        .select(`
          *,
          insumo:insumos!insumo_id(nombre, codigo, unidad_medida, tipo)
        `)
        .eq("orden_id", ordenId)
        .order("orden_index"),
      supabase
        .from("orden_mezcla")
        .select(`
          *,
          producto:productos!producto_id(nombre)
        `)
        .eq("orden_id", ordenId)
        .order("orden_index"),
      supabase
        .from("orden_produccion_actividad")
        .select("*")
        .eq("orden_id", ordenId)
        .order("created_at", { ascending: false })
        .limit(100),
    ])

    if (ordenRes.data) setOrden(ordenRes.data as unknown as OrdenDetalle)
    if (itemsRes.data) setItems(itemsRes.data as unknown as OrdenProduccionItemExpanded[])
    if (procesosRes.data) {
      const p = procesosRes.data as unknown as OrdenProduccionProcesoExpanded[]
      setProcesos(p)
      setProcesosOriginal(p)
    }
    if (mezclasRes.data) setMezclas(mezclasRes.data as unknown as OrdenMezclaExpanded[])
    if (actividadRes.data) setActividad(actividadRes.data as unknown as OrdenProduccionActividad[])
    setDirty(false)
    setLoading(false)
  }, [ordenId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function logActividad(tipo: TipoActividadProduccion, payload?: Record<string, unknown>) {
    const { error } = await supabase.from("orden_produccion_actividad").insert({
      orden_id: ordenId,
      tipo,
      usuario_id: userId || null,
      usuario_nombre: userName || null,
      payload: (payload ?? null) as Json,
    })
    if (error) console.error("No se registró la actividad:", error.message)
  }

  // --- Edición local de la hoja de proceso ---
  function updateNumerico(id: string, campo: CampoNumerico, valor: string) {
    const num = valor.trim() === "" ? null : Number(valor)
    setProcesos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: num } : p)))
    setDirty(true)
  }
  function updateTexto(id: string, campo: CampoTexto, valor: string) {
    setProcesos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor === "" ? null : valor } : p)))
    setDirty(true)
  }
  function updateCheck(id: string, campo: CampoCheck, valor: boolean) {
    setProcesos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
    setDirty(true)
  }

  // El sobrante se registra contra una DIETA, pero la hoja de proceso está
  // organizada por insumo, y un mismo insumo puede alimentar varias dietas de
  // la orden. Con una sola dieta la atribución es inequívoca y se abre directo;
  // con varias hay que elegirla a mano en la hoja de mezcla.
  function abrirSobrante(insumoId: string, cocido: number) {
    if (mezclas.length === 1) {
      setSobrantePrecarga({ insumoId, cocido })
      return
    }
    setTab("mezcla")
    toast.info(
      "Elige la dieta en la que sobró: pulsa \"Sobró producto\" en su hoja de mezcla."
    )
  }

  // Consume los sobrantes de días anteriores y baja lo que hay que cocinar hoy
  // (ERP-PROD-02). La RPC es idempotente: suelta primero lo que esta orden ya
  // tenía tomado, así que pulsar dos veces no duplica el descuento.
  async function handleAplicarSaldos() {
    if (!canEdit) return
    setAplicandoSaldos(true)
    const res = await fetch("/api/inventario/produccion/sobrantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aplicar", orden_id: ordenId }),
    })
    const json = await res.json().catch(() => ({}))
    setAplicandoSaldos(false)

    if (!res.ok) {
      toast.error(json.error ?? "No se pudieron aplicar los saldos.")
      return
    }
    await logActividad("saldos_aplicados", {
      insumos: Array.isArray(json.aplicados) ? json.aplicados.length : 0,
    })
    toast.success("Saldos a favor aplicados.")
    await fetchData()
  }

  async function handleGuardarProcesos() {
    if (!canEdit) return
    setSavingProcesos(true)
    const cambios = diffProcesos(procesosOriginal, procesos)
    const payload = procesos.map((p) => ({
      id: p.id,
      orden_id: p.orden_id,
      insumo_id: p.insumo_id,
      cant_requerida_crudo: p.cant_requerida_crudo,
      cant_obtenida_cocido: p.cant_obtenida_cocido,
      temp_descongelacion: p.temp_descongelacion,
      cant_real_crudo: p.cant_real_crudo,
      lotes: p.lotes,
      tiempo_coccion_horas: p.tiempo_coccion_horas,
      temp_final_coccion: p.temp_final_coccion,
      kilos_antes_molido: p.kilos_antes_molido,
      tiempo_molienda: p.tiempo_molienda,
      kilos_final_molido: p.kilos_final_molido,
      responsable_coccion: p.responsable_coccion,
      responsable: p.responsable,
      empaque_conforme: p.empaque_conforme,
      rotulado: p.rotulado,
      liberacion_lote: p.liberacion_lote,
      orden_index: p.orden_index,
    }))

    const { error } = await supabase.from("orden_produccion_procesos").upsert(payload)
    if (error) {
      setSavingProcesos(false)
      toast.error("Error al guardar: " + error.message)
      return
    }
    // Bump de auditoría en la orden (el trigger fija updated_by = auth.uid()).
    await supabase.from("ordenes_produccion").update({ updated_at: new Date().toISOString() }).eq("id", ordenId)
    if (cambios.length > 0) {
      await logActividad("proceso_guardado", { cambios: cambios as unknown as Record<string, unknown>[] })
    }
    setSavingProcesos(false)
    setDirty(false)
    toast.success("Cambios guardados.")
    fetchData()
  }

  async function handleItemCompletado(item: OrdenProduccionItemExpanded, info: { cantidad: number; parcial: boolean }) {
    const producto = `${item.producto?.nombre ?? ""} ${item.variante?.presentacion ?? ""}`.trim()
    await logActividad(info.parcial ? "item_parcial" : "item_completado", {
      producto,
      cantidad: info.cantidad,
    })
  }

  async function handleItemDone() {
    await fetchData()
  }

  const estadoBadge = orden && (
    <Badge
      variant={ESTADO_VARIANT[orden.estado] ?? "secondary"}
      className={cn("gap-1", orden.estado === "parcial" && "border-amber-500 text-amber-600")}
    >
      {orden.estado === "parcial" && <AlertTriangle className="h-3 w-3" />}
      {ESTADO_PRODUCCION_LABELS[orden.estado] ?? orden.estado}
    </Badge>
  )

  const pendientes = items.filter((it) => it.estado === "planificada" || it.estado === "en_proceso")

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/inventario/produccion">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight truncate">
          {loading ? "Cargando..." : orden?.numero ?? ordenId}
        </h1>
        {estadoBadge}
        {orden?.orden_origen_id && (
          <Badge variant="outline" className="text-xs">Reposición</Badge>
        )}

        {orden && (
          <Button
            variant={tab === "completar" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTab(tab === "completar" ? "proceso" : "completar")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completar producción
            {pendientes.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendientes.length}</Badge>
            )}
          </Button>
        )}

        {/* Última modificación */}
        {orden?.updated_at && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Última modificación{" "}
              {formatDistanceToNow(new Date(orden.updated_at), { addSuffix: true, locale: es })}
            </span>
            {orden.editor?.full_name && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-default" />}>
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {iniciales(orden.editor.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{orden.editor.full_name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {!loading && orden && bloqueado && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Esta orden está {orden.estado === "cancelada" ? "cancelada" : "completada"}: todos los campos quedaron
          bloqueados con su último valor guardado y no se pueden modificar.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : !orden ? (
        <div className="flex items-center justify-center p-10 text-destructive">
          No se encontró la orden de producción.
        </div>
      ) : tab === "completar" ? (
        /* ---------------- Completar (vista dedicada, no es una pestaña) ---------------- */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setTab("proceso")}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <h2 className="text-lg font-semibold">Completar producción</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Registra la cantidad realmente producida de cada producto terminado. Cada uno consume
            insumos (FEFO) y genera su lote de PT.
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta orden no tiene productos.</p>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <CompletarItemCard
                  key={it.id}
                  item={it}
                  bloqueado={bloqueado}
                  onDone={handleItemDone}
                  onCompleted={(info) => handleItemCompletado(it, info)}
                />
              ))}
            </div>
          )}
          {pendientes.length === 0 && items.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Todos los productos fueron cerrados.
            </div>
          )}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="proceso">
              <ClipboardList className="h-4 w-4" /> Proceso
            </TabsTrigger>
            <TabsTrigger value="mezcla">
              <Blend className="h-4 w-4" /> Mezcla
            </TabsTrigger>
            <TabsTrigger value="historial">
              <History className="h-4 w-4" /> Historial de cambios
            </TabsTrigger>
          </TabsList>

          {/* ---------------- Proceso ---------------- */}
          <TabsContent value="proceso" className="space-y-4 pt-2">
            {procesos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <FlaskConical className="h-10 w-10 opacity-30" />
                <p>Esta orden no tiene materias primas para documentar.</p>
                <p className="text-xs">Verifica que sus productos tengan receta con insumos de tipo materia prima.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Documenta el proceso por materia prima. Al pesar lo cocinado, ingresa la
                    cantidad obtenida: verás al instante si falta o sobra. Puedes guardar y
                    continuar más tarde.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      // No se auto-aplica al cargar: dos personas abriendo dos
                      // órdenes competirían por el mismo sobrante. Aplicar es un
                      // acto explícito y queda en el historial.
                      <Button
                        variant="outline"
                        onClick={handleAplicarSaldos}
                        disabled={aplicandoSaldos}
                        className="gap-2"
                      >
                        <PackageMinus className="h-4 w-4" />
                        {aplicandoSaldos ? "Aplicando..." : "Aplicar saldos a favor"}
                      </Button>
                    )}
                    {canEdit && (
                      <Button onClick={handleGuardarProcesos} disabled={savingProcesos || !dirty} className="gap-2">
                        <Save className="h-4 w-4" />
                        {savingProcesos ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-lg bg-white">
                  <Table className="min-w-[1400px]">
                    <TableHeader>
                      {/* Grupos */}
                      <TableRow className="bg-muted/40">
                        <TableHead className="sticky left-0 bg-muted/40 z-10 w-[220px]">Materia prima</TableHead>
                        <TableHead className="text-center border-l" colSpan={5}>Amarre de cocción</TableHead>
                        <TableHead className="text-center border-l">Descong.</TableHead>
                        <TableHead className="text-center border-l" colSpan={5}>Cocción</TableHead>
                        <TableHead className="text-center border-l" colSpan={3}>Molido</TableHead>
                        <TableHead className="text-center border-l" colSpan={4}>Control de calidad</TableHead>
                      </TableRow>
                      {/* Sub-encabezados */}
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 w-[220px] text-xs">
                          Requerido en crudo
                        </TableHead>
                        <TableHead className="text-xs text-center border-l">Req. crudo</TableHead>
                        <TableHead className="text-xs text-center">Factor</TableHead>
                        <TableHead className="text-xs text-center">Saldo a favor</TableHead>
                        <TableHead className="text-xs text-center font-semibold">A cocinar</TableHead>
                        <TableHead className="text-xs text-center">Obtenido / Δ</TableHead>
                        <TableHead className="text-xs text-center border-l">Temp °C</TableHead>
                        <TableHead className="text-xs text-center border-l">Real crudo</TableHead>
                        <TableHead className="text-xs text-center">Lote(s)</TableHead>
                        <TableHead className="text-xs text-center">Tiempo (h)</TableHead>
                        <TableHead className="text-xs text-center">Temp final °C</TableHead>
                        <TableHead className="text-xs text-center">Responsable</TableHead>
                        <TableHead className="text-xs text-center border-l">Kg antes</TableHead>
                        <TableHead className="text-xs text-center">Tiempo mol.</TableHead>
                        <TableHead className="text-xs text-center">Kg final</TableHead>
                        <TableHead className="text-xs text-center border-l w-20">Empaque</TableHead>
                        <TableHead className="text-xs text-center w-20">Rotulado</TableHead>
                        <TableHead className="text-xs text-center w-20">Liberación</TableHead>
                        <TableHead className="text-xs text-center">Responsable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procesos.map((p) => {
                        const unidad = p.insumo?.unidad_medida ?? ""
                        // Δ se calcula en render, no se persiste: reacciona al
                        // tecleo para que el jefe de planta decida en el momento
                        // si cocina más o registra el excedente como sobrante.
                        const delta =
                          p.cant_obtenida_cocido != null && p.cant_cocido_requerido != null
                            ? p.cant_obtenida_cocido - p.cant_cocido_requerido
                            : null
                        const deltaClase =
                          delta == null || Math.abs(delta) < 0.01
                            ? "text-muted-foreground"
                            : delta < 0
                              ? "text-destructive"
                              : "text-amber-600"
                        return (
                        <TableRow key={p.id}>
                          <TableCell className="sticky left-0 bg-background z-10 w-[220px]">
                            <div className="font-medium text-sm">{p.insumo?.nombre ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.cant_requerida_crudo != null
                                ? `${p.cant_requerida_crudo.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${unidad}`
                                : "—"}
                            </div>
                          </TableCell>
                          {/* Amarre de cocción (ERP-PROD-03) */}
                          <TableCell className="border-l text-center text-xs tabular-nums">
                            {fmtNum(p.cant_requerida_crudo)}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                            {p.factor_conversion != null
                              ? p.factor_conversion.toLocaleString("es-CO", { maximumFractionDigits: 3 })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            {p.cant_saldo_crudo > 0 ? (
                              <span className="text-emerald-600 font-medium">
                                −{fmtNum(p.cant_saldo_crudo)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm tabular-nums font-semibold">
                            {fmtNum(p.cant_a_cocinar_crudo ?? p.cant_requerida_crudo)}
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <NumInput
                              value={p.cant_obtenida_cocido}
                              disabled={!canEdit}
                              onChange={(v) => updateNumerico(p.id, "cant_obtenida_cocido", v)}
                            />
                            {delta != null && Math.abs(delta) >= 0.01 && (
                              <div className={`mt-0.5 text-[11px] text-center ${deltaClase}`}>
                                {delta > 0 ? "+" : ""}
                                {fmtNum(delta)} {unidad}
                                {delta > 0 && canEdit && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-1 h-5 px-1 text-[11px]"
                                    onClick={() => abrirSobrante(p.insumo_id, delta)}
                                  >
                                    Registrar sobrante
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          {/* Descongelación */}
                          <TableCell className="border-l">
                            <NumInput value={p.temp_descongelacion} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "temp_descongelacion", v)} />
                          </TableCell>
                          {/* Cocción */}
                          <TableCell className="border-l">
                            <NumInput value={p.cant_real_crudo} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "cant_real_crudo", v)} />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-28"
                              value={p.lotes ?? ""}
                              disabled={!canEdit}
                              onChange={(e) => updateTexto(p.id, "lotes", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <NumInput value={p.tiempo_coccion_horas} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "tiempo_coccion_horas", v)} />
                          </TableCell>
                          <TableCell>
                            <NumInput value={p.temp_final_coccion} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "temp_final_coccion", v)} />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-28"
                              value={p.responsable_coccion ?? ""}
                              disabled={!canEdit}
                              onChange={(e) => updateTexto(p.id, "responsable_coccion", e.target.value)}
                            />
                          </TableCell>
                          {/* Molido */}
                          <TableCell className="border-l">
                            <NumInput value={p.kilos_antes_molido} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "kilos_antes_molido", v)} />
                          </TableCell>
                          <TableCell>
                            <NumInput value={p.tiempo_molienda} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "tiempo_molienda", v)} />
                          </TableCell>
                          <TableCell>
                            <NumInput value={p.kilos_final_molido} disabled={!canEdit} onChange={(v) => updateNumerico(p.id, "kilos_final_molido", v)} />
                          </TableCell>
                          {/* Control de calidad */}
                          <TableCell className="border-l">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                className="size-5"
                                checked={!!p.empaque_conforme}
                                disabled={!canEdit}
                                onCheckedChange={(c) => updateCheck(p.id, "empaque_conforme", c === true)}
                                aria-label="Empaque conforme"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                className="size-5"
                                checked={!!p.rotulado}
                                disabled={!canEdit}
                                onCheckedChange={(c) => updateCheck(p.id, "rotulado", c === true)}
                                aria-label="Rotulado"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                className="size-5"
                                checked={!!p.liberacion_lote}
                                disabled={!canEdit}
                                onCheckedChange={(c) => updateCheck(p.id, "liberacion_lote", c === true)}
                                aria-label="Liberación de lote"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-28"
                              value={p.responsable ?? ""}
                              disabled={!canEdit}
                              onChange={(e) => updateTexto(p.id, "responsable", e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>

          {/* ---------------- Mezcla ---------------- */}
          <TabsContent value="mezcla">
            <MezclaPanel
              ordenId={ordenId}
              items={items}
              mezclas={mezclas}
              canEdit={canEdit}
              bloqueado={bloqueado}
              onLog={(payload) => logActividad("mezcla_guardada", payload)}
              onSaved={fetchData}
            />
          </TabsContent>

          {/* ---------------- Historial ---------------- */}
          <TabsContent value="historial" className="pt-2">
            <div className="border rounded-lg bg-white">
              <div className="px-4 py-3 border-b">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Historial de cambios
                </p>
              </div>
              <div className="px-4 py-3 space-y-4">
                {actividad.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin actividad registrada.</p>
                ) : (
                  actividad.map((a) => {
                    const payload = (a.payload ?? {}) as Record<string, unknown>
                    const cambios = (a.tipo === "proceso_guardado" || a.tipo === "mezcla_guardada") && Array.isArray(payload.cambios)
                      ? (payload.cambios as unknown as CambioActividad[])
                      : []
                    return (
                      <div key={a.id} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded-full bg-muted p-1 text-muted-foreground">
                          {ACTIVIDAD_ICONS[a.tipo] ?? <ChevronRight className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">{actividadTexto(a)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {a.usuario_nombre ?? "Sistema"} ·{" "}
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                          </p>
                          {cambios.length > 0 && (
                            <ul className="mt-2 space-y-1 border-l-2 pl-3">
                              {cambios.map((c, idx) => {
                                const esNuevo = c.anterior === null && c.nuevo !== null
                                const esEliminado = c.anterior !== null && c.nuevo === null
                                return (
                                  <li key={idx} className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{c.entidad}</span>
                                    {" — "}
                                    {c.campo_label}:{" "}
                                    {esNuevo ? (
                                      <>agregó <span className="font-medium text-foreground">{formatValorCambio(c.nuevo)}</span></>
                                    ) : esEliminado ? (
                                      <>eliminó <span className="font-medium text-foreground">{formatValorCambio(c.anterior)}</span></>
                                    ) : (
                                      <>
                                        <span className="line-through">{formatValorCambio(c.anterior)}</span>
                                        {" → "}
                                        <span className="font-medium text-foreground">{formatValorCambio(c.nuevo)}</span>
                                      </>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Registro de sobrante disparado desde el Δ de la hoja de proceso */}
      <SobrantePanel
        open={sobrantePrecarga !== null}
        onOpenChange={(v) => { if (!v) setSobrantePrecarga(null) }}
        ordenMezclaId={mezclas.length === 1 ? mezclas[0].id : null}
        dietaNombre={mezclas[0]?.producto?.nombre ?? ""}
        precarga={
          sobrantePrecarga ? { [sobrantePrecarga.insumoId]: sobrantePrecarga.cocido } : undefined
        }
        onSaved={() => {
          void logActividad("sobrante_registrado", {
            dieta: mezclas[0]?.producto?.nombre ?? null,
          })
          void fetchData()
        }}
      />
    </div>
  )
}

// Input numérico compacto para la tabla de proceso.
function NumInput({
  value, onChange, disabled,
}: { value: number | null; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Input
      type="number"
      className="h-8 text-xs w-20"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
