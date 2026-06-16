"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package,
  User,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  History,
  ChevronRight,
  Truck,
  Phone,
  Tag,
  CreditCard,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type {
  PedidoExpanded,
  DetalleItemExpanded,
  NotaLogistica,
  PedidoActividad,
  EstadoPedido,
  UserRole,
} from "@/types";
import { ESTADO_LOGISTICA_LABELS, ESTADO_LOGISTICA_STYLES } from "@/lib/logistica/estadoLabels";
import { getTransitions } from "@/lib/logistica/transitions";
import { BolsasPopup } from "./BolsasPopup";
import { EditProductosDialog } from "./EditProductosDialog";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TaskCardDialogProps {
  pedidoId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStateChange: () => void;
  userRole: UserRole | null;
  userId: string;
  userName: string;
  supabase: SupabaseClient;
}

const FRANJA_LABELS: Record<string, string> = {
  AM: "AM (mañana)",
  PM: "PM (tarde)",
  intermedia: "Intermedia",
  sin_franja: "Sin franja",
};

const METODO_LABELS: Record<string, string> = {
  nequi: "Nequi",
  daviplata: "Daviplata",
  efectivo: "Efectivo",
  bancolombia: "Bancolombia",
  pse_openpay: "PSE / OpenPay",
  bold: "Bold",
  contraentrega: "Contraentrega",
};

const ACTIVIDAD_ICONS: Record<string, React.ReactNode> = {
  pedido_creado: <Plus className="h-3 w-3" />,
  estado_cambiado: <ChevronRight className="h-3 w-3" />,
  nota_agregada: <Pencil className="h-3 w-3" />,
  nota_completada: <CheckCircle2 className="h-3 w-3" />,
  productos_editados: <Package className="h-3 w-3" />,
  bolsas_asignadas: <Truck className="h-3 w-3" />,
};

function actividadTexto(a: PedidoActividad): string {
  switch (a.tipo) {
    case "pedido_creado": return "Pedido creado";
    case "estado_cambiado": {
      const p = a.payload as { de?: string; a?: string } | null;
      const de = p?.de ? ESTADO_LOGISTICA_LABELS[p.de as EstadoPedido] ?? p.de : "—";
      const hacia = p?.a ? ESTADO_LOGISTICA_LABELS[p.a as EstadoPedido] ?? p.a : "—";
      return `Estado cambiado: ${de} → ${hacia}`;
    }
    case "nota_agregada": {
      const p = a.payload as { texto?: string } | null;
      return `Nota agregada: "${(p?.texto ?? "").slice(0, 40)}${(p?.texto ?? "").length > 40 ? "…" : ""}"`;
    }
    case "nota_completada": return "Nota marcada como completada";
    case "productos_editados": return "Productos del pedido editados";
    case "bolsas_asignadas": {
      const p = a.payload as { numero_bolsas?: number } | null;
      return `Bolsas asignadas: ${p?.numero_bolsas ?? "—"}`;
    }
    default: return a.tipo;
  }
}

export function TaskCardDialog({
  pedidoId,
  open,
  onOpenChange,
  onStateChange,
  userRole,
  userId,
  userName,
  supabase,
}: TaskCardDialogProps) {
  const [pedido, setPedido] = useState<PedidoExpanded | null>(null);
  const [detalles, setDetalles] = useState<DetalleItemExpanded[]>([]);
  const [notas, setNotas] = useState<NotaLogistica[]>([]);
  const [actividad, setActividad] = useState<PedidoActividad[]>([]);
  const [loading, setLoading] = useState(true);

  const [nuevaNota, setNuevaNota] = useState("");
  const [savingNota, setSavingNota] = useState(false);

  const [savingEstado, setSavingEstado] = useState(false);

  const [showBolsas, setShowBolsas] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<EstadoPedido | null>(null);

  const [showEditProductos, setShowEditProductos] = useState(false);

  const canEditProductos = pedido
    ? !["listo_despacho", "despachado", "devolucion", "parcial"].includes(pedido.estado)
    : false;

  const transiciones = useMemo(
    () => (pedido ? getTransitions(pedido.estado, userRole) : []),
    [pedido, userRole]
  );

  const fetchData = useCallback(async () => {
    if (!pedidoId) return;
    setLoading(true);
    const [pedidoRes, detallesRes, notasRes, actividadRes] = await Promise.all([
      supabase
        .from("pedidos")
        .select(`
          id, numero_pedido, estado, estado_pago, franja_horaria, fecha_tentativa_entrega,
          notas_ventas, notas_despacho, total, subtotal_alimento, subtotal_snacks, subtotal_otros,
          monto_descuento_compra, pct_descuento_compra, tarifa_envio_cliente, descuento_envio,
          total_envio_cobrado, es_contraentrega, metodo_pago, fuente, numero_bolsas,
          fue_editado, created_at, vendedor_id,
          clientes(nombre_completo, celular, direccion, complemento_direccion),
          mascotas(nombre, raza),
          zonas_envio!zona_id(nombre),
          vendedor:users!pedidos_vendedor_id_fkey(full_name),
          pedido_ruta(ruta_id, numero_bolsas, rutas(nombre, estado))
        `)
        .eq("id", pedidoId)
        .single(),
      supabase
        .from("detalle_pedido")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at"),
      supabase
        .from("notas_logistica")
        .select(`
          id, pedido_id, texto, creado_por, created_at, completada, completada_por, completada_en,
          autor:users!notas_logistica_creado_por_fkey(full_name),
          completador:users!notas_logistica_completada_por_fkey(full_name)
        `)
        .eq("pedido_id", pedidoId)
        .order("created_at"),
      supabase
        .from("pedido_actividad")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (pedidoRes.data) setPedido(pedidoRes.data as unknown as PedidoExpanded);
    if (detallesRes.data) setDetalles(detallesRes.data as DetalleItemExpanded[]);
    if (notasRes.data) setNotas(notasRes.data as unknown as NotaLogistica[]);
    if (actividadRes.data) setActividad(actividadRes.data as PedidoActividad[]);
    setLoading(false);
  }, [pedidoId, supabase]);

  useEffect(() => {
    if (open && pedidoId) {
      fetchData();
      setNuevaNota("");
    }
  }, [open, pedidoId, fetchData]);

  async function logActividad(tipo: PedidoActividad["tipo"], payload?: Record<string, unknown>) {
    await supabase.from("pedido_actividad").insert({
      pedido_id: pedidoId,
      tipo,
      usuario_id: userId,
      usuario_nombre: userName,
      payload: payload ?? null,
    });
  }

  async function handleCambiarEstado(nuevoEstado: EstadoPedido, bolsas?: number) {
    if (!pedido) return;
    setSavingEstado(true);
    try {
      const updates: Record<string, unknown> = { estado: nuevoEstado };
      if (nuevoEstado === "confirmado" && pedido.estado === "fecha_tentativa") {
        updates.estado_pago = "confirmado";
      }
      if (bolsas !== undefined) updates.numero_bolsas = bolsas;

      const { error } = await supabase.from("pedidos").update(updates).eq("id", pedidoId);
      if (error) { toast.error("Error al cambiar estado"); return; }

      await logActividad("estado_cambiado", { de: pedido.estado, a: nuevoEstado });
      if (bolsas !== undefined) {
        await logActividad("bolsas_asignadas", { numero_bolsas: bolsas });
      }

      toast.success(`Estado actualizado a "${ESTADO_LOGISTICA_LABELS[nuevoEstado]}"`);
      onStateChange();
      fetchData();
    } finally {
      setSavingEstado(false);
    }
  }

  function handleEstadoSelect(nuevoEstado: EstadoPedido) {
    const transicion = transiciones.find((t) => t.estado === nuevoEstado);
    if (transicion?.requiresBolsas) {
      setPendingEstado(nuevoEstado);
      setShowBolsas(true);
    } else {
      handleCambiarEstado(nuevoEstado);
    }
  }

  async function handleAgregarNota() {
    if (!nuevaNota.trim()) return;
    setSavingNota(true);
    try {
      const { data, error } = await supabase
        .from("notas_logistica")
        .insert({
          pedido_id: pedidoId,
          texto: nuevaNota.trim(),
          creado_por: userId,
        })
        .select(`
          id, pedido_id, texto, creado_por, created_at, completada, completada_por, completada_en,
          autor:users!notas_logistica_creado_por_fkey(full_name),
          completador:users!notas_logistica_completada_por_fkey(full_name)
        `)
        .single();

      if (error) { toast.error("Error al agregar nota"); return; }

      await logActividad("nota_agregada", { nota_id: data.id, texto: nuevaNota.trim() });
      setNotas((prev) => [...prev, data as unknown as NotaLogistica]);
      setActividad((prev) => [
        {
          id: crypto.randomUUID(),
          pedido_id: pedidoId,
          tipo: "nota_agregada",
          usuario_id: userId,
          usuario_nombre: userName,
          created_at: new Date().toISOString(),
          payload: { nota_id: data.id, texto: nuevaNota.trim() },
        },
        ...prev,
      ]);
      setNuevaNota("");
    } finally {
      setSavingNota(false);
    }
  }

  async function handleCompletarNota(notaId: string) {
    const { error } = await supabase
      .from("notas_logistica")
      .update({
        completada: true,
        completada_por: userId,
        completada_en: new Date().toISOString(),
      })
      .eq("id", notaId);

    if (error) { toast.error("Error al completar nota"); return; }

    await logActividad("nota_completada", { nota_id: notaId });
    const ahora = new Date().toISOString();
    setNotas((prev) =>
      prev.map((n) =>
        n.id === notaId
          ? {
              ...n,
              completada: true,
              completada_por: userId,
              completada_en: ahora,
              completador: { full_name: userName },
            }
          : n
      )
    );
    setActividad((prev) => [
      {
        id: crypto.randomUUID(),
        pedido_id: pedidoId,
        tipo: "nota_completada",
        usuario_id: userId,
        usuario_nombre: userName,
        created_at: ahora,
        payload: { nota_id: notaId },
      },
      ...prev,
    ]);
  }

  const canAddNotas = userRole === "admin" || userRole === "logistica";

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!w-[85vw] !h-[80vh] !max-w-none max-h-[95vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-base sm:text-lg truncate">
                {loading ? "Cargando..." : pedido?.numero_pedido ?? pedidoId}
              </DialogTitle>
              {pedido && (
                <Badge
                  className={`text-xs border ${ESTADO_LOGISTICA_STYLES[pedido.estado]}`}
                  variant="outline"
                >
                  {ESTADO_LOGISTICA_LABELS[pedido.estado]}
                </Badge>
              )}
              {pedido?.es_contraentrega && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                  C/E
                </Badge>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-10 text-muted-foreground">
              Cargando pedido...
            </div>
          ) : !pedido ? (
            <div className="flex-1 flex items-center justify-center p-10 text-destructive">
              No se encontró el pedido.
            </div>
          ) : (
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* LEFT PANEL */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

                {/* [A] Stage change */}
                {transiciones.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                      Cambiar etapa
                    </p>
                    <Select
                      onValueChange={(v) => handleEstadoSelect(v as EstadoPedido)}
                      disabled={savingEstado}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nueva etapa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transiciones.map((t) => (
                          <SelectItem key={t.estado} value={t.estado}>
                            <span className={t.destructive ? "text-destructive" : ""}>
                              {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </section>
                )}

                <Separator />

                {/* [B] Products */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Productos
                    </p>
                    {canEditProductos && canAddNotas && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setShowEditProductos(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline ml-1">Editar</span>
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {detalles.map((d) => (
                      <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm p-2 rounded border border-transparent hover:border-muted">
                        <span className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {d.nombre_snapshot}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5 sm:hidden">
                            {d.es_magistral && (
                              <Badge variant="outline" className="text-xs py-0 text-purple-700">Magistral</Badge>
                            )}
                            {d.es_promo && (
                              <Badge variant="outline" className="text-xs py-0 text-green-700">Promo</Badge>
                            )}
                          </div>
                        </span>
                        <div className="flex items-center justify-between gap-2 mt-2 sm:mt-0 sm:gap-3">
                          <span className="text-muted-foreground text-xs">
                            {d.cantidad} × ${d.precio_unitario_snapshot.toLocaleString("es-CO")}
                          </span>
                          {(d.es_magistral || d.es_promo) && (
                            <div className="hidden sm:flex gap-1">
                              {d.es_magistral && (
                                <Badge variant="outline" className="text-xs py-0 text-purple-700">Magistral</Badge>
                              )}
                              {d.es_promo && (
                                <Badge variant="outline" className="text-xs py-0 text-green-700">Promo</Badge>
                              )}
                            </div>
                          )}
                          <span className="font-medium text-right min-w-fit">
                            ${d.subtotal.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial summary */}
                  <div className="border rounded-md p-2 sm:p-3 bg-muted/30 space-y-1 text-xs sm:text-sm mt-2">
                    {pedido.subtotal_alimento > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal alimento</span>
                        <span>${pedido.subtotal_alimento.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {pedido.subtotal_snacks > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal snacks</span>
                        <span>${pedido.subtotal_snacks.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {pedido.subtotal_otros > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal otros</span>
                        <span>${pedido.subtotal_otros.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {pedido.monto_descuento_compra > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Descuento compra ({pedido.pct_descuento_compra}%)</span>
                        <span>- ${pedido.monto_descuento_compra.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    {pedido.total_envio_cobrado > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Envío</span>
                        <span>${pedido.total_envio_cobrado.toLocaleString("es-CO")}</span>
                      </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className={pedido.es_contraentrega ? "text-orange-600" : ""}>
                        ${pedido.total.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* [C] Client & delivery */}
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Cliente y entrega
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div className="flex items-start gap-1.5">
                      <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{pedido.clientes?.nombre_completo ?? "—"}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Phone className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{pedido.clientes?.celular ?? "—"}</span>
                    </div>
                    <div className="flex items-start gap-1.5 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>
                        {pedido.clientes?.direccion ?? "—"}
                        {pedido.clientes?.complemento_direccion
                          ? ` — ${pedido.clientes.complemento_direccion}`
                          : ""}
                        {pedido.zonas_envio ? ` (${pedido.zonas_envio.nombre})` : ""}
                      </span>
                    </div>
                    {pedido.mascotas && (
                      <div className="flex items-start gap-1.5">
                        <Tag className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>
                          {pedido.mascotas.nombre}
                          {pedido.mascotas.raza ? ` (${pedido.mascotas.raza})` : ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5">
                      <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{FRANJA_LABELS[pedido.franja_horaria] ?? pedido.franja_horaria}</span>
                    </div>
                    {pedido.fecha_tentativa_entrega && (
                      <div className="flex items-start gap-1.5">
                        <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>Entrega: {pedido.fecha_tentativa_entrega}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <span>
                        {pedido.metodo_pago
                          ? METODO_LABELS[pedido.metodo_pago] ?? pedido.metodo_pago
                          : "—"}
                        {" · "}
                        <span className={pedido.estado_pago === "confirmado" ? "text-green-700" : "text-amber-600"}>
                          {pedido.estado_pago === "confirmado" ? "Pago confirmado" : "Pago pendiente"}
                        </span>
                      </span>
                    </div>
                    {pedido.numero_bolsas > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Package className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-indigo-700 font-medium">
                          {pedido.numero_bolsas} bolsa{pedido.numero_bolsas !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {pedido.vendedor && (
                      <div className="flex items-start gap-1.5 sm:col-span-2">
                        <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Vendedor: {pedido.vendedor.full_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Seller notes (read-only, highlighted) */}
                  {pedido.notas_ventas && (
                    <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-sm">
                      <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Notas del vendedor
                      </p>
                      <p className="text-amber-900 whitespace-pre-wrap">{pedido.notas_ventas}</p>
                    </div>
                  )}

                  {/* Dispatch notes */}
                  {pedido.notas_despacho && (
                    <div className="mt-1 p-2.5 rounded-md bg-blue-50 border border-blue-200 text-sm">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Notas de despacho</p>
                      <p className="text-blue-900 whitespace-pre-wrap">{pedido.notas_despacho}</p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* [D] Logistics notes checklist */}
                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Notas de producción / logística
                  </p>

                  {/* Note list */}
                  <div className="space-y-2">
                    {notas.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Sin notas.</p>
                    )}
                    {notas.map((nota) => (
                      <div key={nota.id} className="flex items-start gap-2">
                        <button
                          className="mt-0.5 shrink-0"
                          onClick={() => !nota.completada && canAddNotas && handleCompletarNota(nota.id)}
                          disabled={nota.completada || !canAddNotas}
                          title={nota.completada ? "Completada" : "Marcar como completada"}
                        >
                          {nota.completada ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground hover:text-green-600 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${nota.completada ? "line-through text-muted-foreground" : ""}`}
                          >
                            {nota.texto}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {nota.autor?.full_name ?? "Desconocido"} ·{" "}
                            {formatDistanceToNow(new Date(nota.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                            {nota.completada && nota.completador && (
                              <span className="text-green-700">
                                {" · "}Completada por {nota.completador.full_name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add note */}
                  {canAddNotas && (
                    <div className="flex flex-col sm:flex-row sm:gap-2 gap-1.5">
                      <Textarea
                        placeholder="Agregar nota de producción/logística..."
                        value={nuevaNota}
                        onChange={(e) => setNuevaNota(e.target.value)}
                        rows={2}
                        className="flex-1 text-sm resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAgregarNota();
                        }}
                      />
                      <Button
                        size="sm"
                        className="w-full sm:w-auto sm:self-end"
                        onClick={handleAgregarNota}
                        disabled={!nuevaNota.trim() || savingNota}
                      >
                        <Plus className="h-4 w-4 sm:mr-0" /> <span className="sm:hidden">Agregar</span>
                      </Button>
                    </div>
                  )}
                </section>
              </div>

              {/* RIGHT PANEL — Activity log */}
              <div className="w-full md:w-80 lg:w-96 md:shrink-0 md:border-l border-t md:border-t-0 flex flex-col max-h-48 md:max-h-none">
                <div className="px-4 py-3 border-b">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                    <History className="h-3.5 w-3.5" /> Historial
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
                  {actividad.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin actividad registrada.</p>
                  )}
                  {actividad.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded-full bg-muted p-1 text-muted-foreground">
                        {ACTIVIDAD_ICONS[a.tipo] ?? <ChevronRight className="h-3 w-3" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs leading-snug">{actividadTexto(a)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {a.usuario_nombre ?? "Sistema"} ·{" "}
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bolsas popup (for stage change inside dialog) */}
      {pedido && pendingEstado && (
        <BolsasPopup
          open={showBolsas}
          pedidoNumero={pedido.numero_pedido}
          defaultValue={pedido.numero_bolsas > 0 ? pedido.numero_bolsas : 1}
          onConfirm={async (bolsas) => {
            setShowBolsas(false);
            await handleCambiarEstado(pendingEstado, bolsas);
            setPendingEstado(null);
          }}
          onCancel={() => {
            setShowBolsas(false);
            setPendingEstado(null);
          }}
        />
      )}

      {/* Edit products dialog */}
      {pedido && (
        <EditProductosDialog
          open={showEditProductos}
          onOpenChange={setShowEditProductos}
          pedidoId={pedidoId}
          pedidoNumero={pedido.numero_pedido}
          detallesActuales={detalles}
          supabase={supabase}
          onSuccess={() => {
            fetchData();
            onStateChange();
          }}
        />
      )}
    </>
  );
}
