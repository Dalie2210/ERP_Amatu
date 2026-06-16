"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PromocionFormDialog } from "@/components/admin/PromocionFormDialog"
import { KitFormDialog } from "@/components/admin/KitFormDialog"
import { Gift, Package, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { TipoPromocion } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromocionRow {
  id: string
  nombre: string
  tipo: TipoPromocion
  is_active: boolean
  producto_id: string | null
  variante_id: string | null
  paga_x: number | null
  lleva_extra: number | null
  trigger_producto_id: string | null
  trigger_variante_id: string | null
  regalo_producto_id: string | null
  regalo_variante_id: string | null
  regalo_cantidad: number
  // joined
  producto?: { nombre: string } | null
  variante?: { presentacion: string } | null
  trigger_producto?: { nombre: string } | null
  regalo_producto?: { nombre: string } | null
  regalo_variante?: { presentacion: string } | null
}

interface KitRow {
  id: string
  nombre: string
  descripcion: string | null
  is_active: boolean
  kit_items: {
    id: string
    producto_id: string
    variante_id: string | null
    cantidad: number
  }[]
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function promoDetalle(p: PromocionRow): string {
  if (p.tipo === "paga_x_lleva_mas") {
    const prod = p.producto?.nombre ?? "Producto"
    const vari = p.variante?.presentacion ? ` (${p.variante.presentacion})` : ""
    return `Paga ${p.paga_x} lleva +${p.lleva_extra} en ${prod}${vari}`
  }
  const trigger = p.trigger_producto?.nombre ?? "?"
  const regalo = p.regalo_producto?.nombre ?? "?"
  const vari = p.regalo_variante?.presentacion ? ` (${p.regalo_variante.presentacion})` : ""
  return `Al comprar ${trigger} → ${p.regalo_cantidad}x ${regalo}${vari} gratis`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromocionesKitsPage() {
  const supabase = useMemo(() => createClient(), [])

  // Promociones state
  const [promociones, setPromociones] = useState<PromocionRow[]>([])
  const [loadingPromos, setLoadingPromos] = useState(true)
  const [promoDialog, setPromoDialog] = useState(false)
  const [editPromo, setEditPromo] = useState<PromocionRow | null>(null)
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null)

  // Kits state
  const [kits, setKits] = useState<KitRow[]>([])
  const [loadingKits, setLoadingKits] = useState(true)
  const [kitDialog, setKitDialog] = useState(false)
  const [editKit, setEditKit] = useState<KitRow | null>(null)
  const [deleteKitId, setDeleteKitId] = useState<string | null>(null)

  const loadPromociones = useCallback(async () => {
    setLoadingPromos(true)
    const { data, error } = await supabase
      .from("promociones")
      .select(`
        *,
        producto:productos!producto_id(nombre),
        variante:producto_variantes!variante_id(presentacion),
        trigger_producto:productos!trigger_producto_id(nombre),
        regalo_producto:productos!regalo_producto_id(nombre),
        regalo_variante:producto_variantes!regalo_variante_id(presentacion)
      `)
      .order("created_at", { ascending: false })
    if (error) toast.error("Error cargando promociones")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else setPromociones((data ?? []) as any)
    setLoadingPromos(false)
  }, [supabase])

  const loadKits = useCallback(async () => {
    setLoadingKits(true)
    const { data, error } = await supabase
      .from("kits")
      .select(`*, kit_items(id, producto_id, variante_id, cantidad)`)
      .order("nombre")
    if (error) toast.error("Error cargando kits")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else setKits((data ?? []) as any)
    setLoadingKits(false)
  }, [supabase])

  useEffect(() => { loadPromociones() }, [loadPromociones])
  useEffect(() => { loadKits() }, [loadKits])

  async function handleDeletePromo() {
    if (!deletePromoId) return
    const { error } = await supabase.from("promociones").delete().eq("id", deletePromoId)
    if (error) toast.error("Error al eliminar: " + error.message)
    else { toast.success("Promoción eliminada"); loadPromociones() }
    setDeletePromoId(null)
  }

  async function handleDeleteKit() {
    if (!deleteKitId) return
    const { error } = await supabase.from("kits").delete().eq("id", deleteKitId)
    if (error) toast.error("Error al eliminar: " + error.message)
    else { toast.success("Kit eliminado"); loadKits() }
    setDeleteKitId(null)
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Promociones &amp; Kits</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configura promociones automáticas y kits de productos preconfigurados.
        </p>
      </div>

      <Tabs defaultValue="promociones">
        <TabsList>
          <TabsTrigger value="promociones" className="flex items-center gap-1.5">
            <Gift className="h-4 w-4" />
            Promociones
          </TabsTrigger>
          <TabsTrigger value="kits" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            Kits
          </TabsTrigger>
        </TabsList>

        {/* ── PROMOCIONES TAB ── */}
        <TabsContent value="promociones" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditPromo(null); setPromoDialog(true) }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva promoción
            </Button>
          </div>

          {loadingPromos ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : promociones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Gift className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay promociones configuradas</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promociones.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.tipo === "paga_x_lleva_mas" ? "Paga X lleva más" : "Producto gratis"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {promoDetalle(p)}
                      </TableCell>
                      <TableCell>
                        <Badge className={p.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"}>
                          {p.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditPromo(p); setPromoDialog(true) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletePromoId(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── KITS TAB ── */}
        <TabsContent value="kits" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditKit(null); setKitDialog(true) }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo kit
            </Button>
          </div>

          {loadingKits ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : kits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay kits configurados</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>N° productos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kits.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {k.descripcion ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{k.kit_items.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={k.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"}>
                          {k.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditKit(k); setKitDialog(true) }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteKitId(k.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PromocionFormDialog
        open={promoDialog}
        onOpenChange={setPromoDialog}
        promo={editPromo}
        onSaved={loadPromociones}
      />

      <KitFormDialog
        open={kitDialog}
        onOpenChange={setKitDialog}
        kit={editKit}
        onSaved={loadKits}
      />

      {/* Delete confirmation dialogs */}
      <Dialog open={!!deletePromoId} onOpenChange={(v) => !v && setDeletePromoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar promoción?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Los pedidos existentes con ítems de esta promoción no se verán afectados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePromoId(null)}>Cancelar</Button>
            <Button onClick={handleDeletePromo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteKitId} onOpenChange={(v) => !v && setDeleteKitId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar kit?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Se eliminarán también todos los ítems del kit.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKitId(null)}>Cancelar</Button>
            <Button onClick={handleDeleteKit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
