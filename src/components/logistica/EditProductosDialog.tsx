"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Search, AlertTriangle } from "lucide-react";
import type { DetalleItemExpanded } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LineaEditando {
  key: string; // local unique key
  producto_id: string | null;
  variante_id: string | null;
  nombre_snapshot: string;
  cantidad: number;
  precio_unitario_snapshot: number;
  aplica_descuento: boolean;
  es_magistral: boolean;
  gramaje_magistral: number | null;
  notas_magistral: string | null;
  justificacion_precio: string | null;
  es_promo: boolean;
  promo_id: string | null;
}

interface ProductoOpcion {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  tipo_precio: string;
  precio_fijo: number | null;
  aplica_descuento: boolean;
  variantes: {
    id: string;
    presentacion: string;
    precio: number;
  }[];
}

interface EditProductosDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoId: string;
  pedidoNumero: string;
  detallesActuales: DetalleItemExpanded[];
  supabase: SupabaseClient;
  onSuccess: () => void;
}

export function EditProductosDialog({
  open,
  onOpenChange,
  pedidoId,
  pedidoNumero,
  detallesActuales,
  supabase,
  onSuccess,
}: EditProductosDialogProps) {
  const [step, setStep] = useState<"warning" | "editor">("warning");
  const [lineas, setLineas] = useState<LineaEditando[]>([]);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("warning");
      setLineas(
        detallesActuales.map((d, i) => ({
          key: `existing-${i}`,
          producto_id: d.producto_id,
          variante_id: d.variante_id,
          nombre_snapshot: d.nombre_snapshot,
          cantidad: d.cantidad,
          precio_unitario_snapshot: d.precio_unitario_snapshot,
          aplica_descuento: d.aplica_descuento,
          es_magistral: d.es_magistral,
          gramaje_magistral: d.gramaje_magistral,
          notas_magistral: d.notas_magistral,
          justificacion_precio: d.justificacion_precio,
          es_promo: d.es_promo ?? false,
          promo_id: d.promo_id ?? null,
        }))
      );
      loadProductos();
    }
  }, [open]);

  async function loadProductos() {
    const { data } = await supabase
      .from("productos")
      .select(`
        id, nombre, sku, categoria, tipo_precio, precio_fijo, aplica_descuento,
        producto_variantes(id, presentacion, precio)
      `)
      .eq("is_active", true)
      .order("nombre");
    setProductos(
      (data ?? []).map((p) => ({
        ...p,
        variantes: p.producto_variantes ?? [],
      }))
    );
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (!q) return [];
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [busqueda, productos]);

  function agregarProducto(producto: ProductoOpcion, variante?: ProductoOpcion["variantes"][0]) {
    const precio = variante?.precio ?? producto.precio_fijo ?? 0;
    const nombre = variante
      ? `${producto.nombre} ${variante.presentacion}`
      : producto.nombre;

    setLineas((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        producto_id: producto.id,
        variante_id: variante?.id ?? null,
        nombre_snapshot: nombre,
        cantidad: 1,
        precio_unitario_snapshot: precio,
        aplica_descuento: producto.aplica_descuento,
        es_magistral: false,
        gramaje_magistral: null,
        notas_magistral: null,
        justificacion_precio: null,
        es_promo: false,
        promo_id: null,
      },
    ]);
    setBusqueda("");
  }

  function updateCantidad(key: string, cantidad: number) {
    setLineas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, cantidad: Math.max(1, cantidad) } : l))
    );
  }

  function removeLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  const subtotal = useMemo(
    () => lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario_snapshot, 0),
    [lineas]
  );

  async function handleSave() {
    if (lineas.length === 0) {
      toast.error("El pedido debe tener al menos un producto");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/logistica/editar-productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_id: pedidoId,
          lineas: lineas.map((l) => ({
            producto_id: l.producto_id,
            variante_id: l.variante_id,
            nombre_snapshot: l.nombre_snapshot,
            cantidad: l.cantidad,
            precio_unitario_snapshot: l.precio_unitario_snapshot,
            aplica_descuento: l.aplica_descuento,
            es_magistral: l.es_magistral,
            gramaje_magistral: l.gramaje_magistral,
            notas_magistral: l.notas_magistral,
            justificacion_precio: l.justificacion_precio,
            es_promo: l.es_promo,
            promo_id: l.promo_id,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al guardar");
        return;
      }
      toast.success("Productos actualizados correctamente");
      onOpenChange(false);
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  if (step === "warning") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Editar productos del pedido
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Estás a punto de editar los productos del pedido{" "}
                <strong>{pedidoNumero}</strong>.
              </span>
              <span className="block">
                Los totales y descuentos serán <strong>recalculados</strong> automáticamente.
                Esta acción quedará registrada en el historial del pedido.
              </span>
              <span className="block text-amber-700 font-medium">
                Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setStep("editor")}>
              Entiendo, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar productos — {pedidoNumero}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Current line items */}
          <div className="space-y-2">
            {lineas.map((linea) => (
              <div
                key={linea.key}
                className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{linea.nombre_snapshot}</p>
                  <p className="text-xs text-muted-foreground">
                    ${linea.precio_unitario_snapshot.toLocaleString("es-CO")} c/u
                    {linea.aplica_descuento && (
                      <Badge variant="outline" className="ml-1 text-xs py-0">Alimento</Badge>
                    )}
                    {linea.es_magistral && (
                      <Badge variant="outline" className="ml-1 text-xs py-0 text-purple-700">Magistral</Badge>
                    )}
                    {linea.es_promo && (
                      <Badge variant="outline" className="ml-1 text-xs py-0 text-green-700">Promo</Badge>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={linea.cantidad}
                    onChange={(e) => updateCantidad(linea.key, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center text-sm"
                    disabled={linea.es_promo}
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    ${(linea.cantidad * linea.precio_unitario_snapshot).toLocaleString("es-CO")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLinea(linea.key)}
                    disabled={linea.es_promo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {lineas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin productos. Agrega al menos uno.
              </p>
            )}
          </div>

          {/* Subtotal */}
          <div className="flex justify-end text-sm font-medium border-t pt-2">
            Subtotal bruto:{" "}
            <span className="ml-2">${subtotal.toLocaleString("es-CO")}</span>
          </div>

          {/* Product search / add */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Plus className="h-4 w-4" /> Agregar producto
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nombre o SKU..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {productosFiltrados.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {productosFiltrados.map((p) => (
                  <div key={p.id}>
                    {p.variantes.length > 0 ? (
                      p.variantes.map((v) => (
                        <button
                          key={v.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                          onClick={() => agregarProducto(p, v)}
                        >
                          <span>
                            {p.nombre}{" "}
                            <span className="text-muted-foreground">{v.presentacion}</span>
                          </span>
                          <span className="text-muted-foreground">
                            ${v.precio.toLocaleString("es-CO")}
                          </span>
                        </button>
                      ))
                    ) : (
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                        onClick={() => agregarProducto(p)}
                      >
                        <span>{p.nombre}</span>
                        <span className="text-muted-foreground">
                          ${(p.precio_fijo ?? 0).toLocaleString("es-CO")}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || lineas.length === 0}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
