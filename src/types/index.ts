/**
 * Amatu ERP — Business type definitions
 * These types complement the auto-generated database.types.ts from Supabase CLI.
 */

// ============================================================
// Enums (mirror PostgreSQL enums for type safety)
// ============================================================

export type UserRole = "admin" | "vendedor" | "logistica" | "contable";

export type TipoDocumento = "CC" | "CE" | "NIT" | "Pasaporte";

export type TipoCliente = "publico" | "distribuidor";

export type FuenteCliente =
  | "meta_ads"
  | "referido_cliente"
  | "referido_veterinario"
  | "referido_entrenador"
  | "distribuidor"
  | "otro";

export type EstadoPedido =
  | "fecha_tentativa"
  | "confirmado"
  | "en_preparacion"
  | "espera_produccion"
  | "listo_despacho"
  | "despachado"
  | "devolucion"
  | "parcial"
  | "cambio";

export type EstadoPago = "pendiente" | "confirmado";

export type MetodoPago =
  | "nequi"
  | "daviplata"
  | "efectivo"
  | "bancolombia"
  | "pse_openpay"
  | "bold"
  | "contraentrega";

export type FranjaHoraria = "AM" | "PM" | "intermedia" | "sin_franja";

export type TipoPrecio = "fijo" | "por_variante" | "por_gramo" | "escala";

export type EstadoRuta = "en_preparacion" | "despachada";

export type EstadoLiquidacion = "borrador" | "cerrado" | "pagado";

export type TipoAliado = "veterinario" | "entrenador_canino" | "otro";

export type TipoComisionAliado = "primera_compra" | "recompra";

export type EstadoComisionAliado = "pendiente" | "liquidada";

// ============================================================
// Cart (Zustand store types)
// ============================================================

export interface CartItem {
  productoId: string;
  varianteId?: string;
  sku: string;
  nombre: string;
  presentacion?: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  esMagistral: boolean;
  gramajeMagistral?: number;
  notasMagistral?: string;
  justificacionPrecio?: string;
  aplicaDescuento: boolean;
  categoria: string;
  // Promotions
  esPromo?: boolean;   // true → inyectado por promo, sin controles de cantidad
  promoId?: string;    // qué promoción generó este ítem
}

export interface CartState {
  items: CartItem[];
  clienteId: string | null;
  mascotaId: string | null;
  zonaId: string | null;
  fuente: FuenteCliente | null;
  fuenteSubtipo: string | null;
  notasVentas: string;
  franjaHoraria: FranjaHoraria;
  metodoPago: MetodoPago | null;
  fechaTentativaEntrega: string | null;
  esDistribuidor: boolean;
  pctDescuentoDistribuidor: number;
  tarifaEnvioBase: number;
  // B3: alternate delivery address (null = use client address)
  usaDireccionAlterna: boolean;
  direccionAlterna: string | null;
  complementoAlterna: string | null;
  barrioAlterna: string | null;
  zonaAlternaId: string | null;
  // B5: aliado referido for referido_veterinario / referido_entrenador
  aliadoId: string | null;
  // B6: 5% discount for clients referred by vet/trainer (active period, venta ≤ 2)
  descuentoReferidoVet: number;
}

// ============================================================
// Discount engine types
// ============================================================

export interface ReglaDescuento {
  id: string;
  montoMinimo: number;
  pctDescuentoCompra: number;
  descuentoEnvioFijo: number;
}

export interface CalculoDescuento {
  subtotalAlimento: number;
  subtotalSnacks: number;
  subtotalOtros: number;
  reglaAplicada: ReglaDescuento | null;
  montoDescuentoCompra: number;
  pctDescuentoCompra: number;
  montoDescuentoReferidoVet: number;
  pctDescuentoReferidoVet: number;
  tarifaEnvioBase: number;
  descuentoEnvio: number;
  totalEnvioCobrado: number;
  total: number;
}

// ============================================================
// Commission engine types
// ============================================================

export interface ConfigComision {
  id: string;
  cierreMin: number;
  cierreMax: number;
  venta2Pct: number;
  venta3Pct: number;
  venta4Pct: number;
  venta5Pct: number;
  venta6Pct: number;
}

export interface CalculoComision {
  pedidoId: string;
  numeroVentaCliente: number;
  baseCalculo: number;
  pctComision: number;
  montoComision: number;
  aplicaComision: boolean;
  razonNoComision?: string;
}

// Result from fn_get_cierre_meta_actual RPC
export interface CierreMetaResult {
  totalLeads: number;
  totalCierres: number;
  pctCierre: number;
  rangoLabel: string;
  configId: string | null;
  venta2Pct: number;
  venta3Pct: number;
  venta4Pct: number;
  venta5Pct: number;
  venta6Pct: number;
}

// Result from fn_recalcular_comisiones_periodo RPC
export interface RecalcularComisionesResult {
  totalLeads: number;
  totalCierres: number;
  pctCierre: number;
  rangoLabel: string;
  montoTotal: number;
  montoConfirmado: number;
  montoBloqueado: number;
  ordenesCount: number;
}

// comisiones_detalle row (with new columns)
export interface ComisionDetalleRow {
  id: string;
  pedidoId: string;
  liquidacionId: string | null;
  vendedorId: string | null;
  periodoMes: string | null;
  numeroVentaCliente: number;
  baseCalculo: number;
  pctComision: number;
  montoComision: number;
  aplicaComision: boolean;
  razonNoComision: string | null;
  isProvisional: boolean;
  createdAt: string;
}

// comisiones_aliado row
export interface ComisionAliado {
  id: string;
  aliadoReferidoId: string;
  pedidoId: string;
  tipo: TipoComisionAliado;
  baseCalculo: number;
  porcentaje: number;
  monto: number;
  estado: EstadoComisionAliado;
  createdAt: string;
}

// aliados row
export interface Aliado {
  id: string;
  nombre: string;
  tipo: TipoAliado;
  celular: string | null;
  correo: string | null;
  isActive: boolean;
  createdAt: string;
}

// aliados_referidos row
export interface AliadorReferido {
  id: string;
  aliadoId: string;
  clienteId: string;
  fechaInicioComision: string | null;
  fechaFinComision: string | null;
  periodoActivo: boolean;
  pedidoPrimeraEntregaId: string | null;
  createdAt: string;
}

// ============================================================
// Route/dispatch payload (for n8n webhook)
// ============================================================

export interface PedidoDespachoPayload {
  nombreMascota: string;
  nombreCliente: string;
  franjaHoraria: string;
  notasVentas: string;
  direccion: string;
  complementoDireccion: string;
  notasDespacho: string;
  celular: string;
  numeroBolsas: number;
  esContraentrega: boolean;
  total: number;
}

export interface RutaDespachoPayload {
  rutaId: string;
  nombreRuta: string;
  fecha: string;
  franja: string;
  mensajeroNombre: string;
  mensajeroCelular: string;
  pedidos: PedidoDespachoPayload[];
}

// ============================================================
// Dashboard KPIs
// ============================================================

export type DashboardCardStatus = "ok" | "error";

export interface DashboardCardState<T> {
  value: T | null;
  status: DashboardCardStatus;
}

export interface RecentPedidoRow {
  id: string;
  numero_pedido: string;
  estado: string;
  estado_pago: string;
  total: number;
  created_at: string;
  clientes: { nombre_completo: string } | null;
}

export interface ActiveRouteRow {
  id: string;
  nombre: string;
  mensajero_nombre: string;
  fecha: string;
  pedidos_count: number;
}

export interface PedidoPagoPendienteRow {
  id: string;
  numero_pedido: string;
  estado: string;
  estado_pago: string;
  total: number;
  created_at: string;
  clientes: { nombre_completo: string } | null;
}

// ============================================================
// Promotions & Kits
// ============================================================

export type TipoPromocion = "paga_x_lleva_mas" | "producto_gratis";

export interface Promocion {
  id: string;
  nombre: string;
  tipo: TipoPromocion;
  isActive: boolean;
  // Tipo 1: paga_x_lleva_mas
  productoId?: string;
  varianteId?: string;
  pagaX?: number;
  llevaExtra?: number;
  // Tipo 2: producto_gratis
  triggerProductoId?: string;
  triggerVarianteId?: string;
  regaloProductoId?: string;
  regaloVarianteId?: string;
  regaloCantidad?: number;
  // Metadata resuelta via JOIN (para UI y syncPromos)
  productoNombre?: string;
  productoSku?: string;
  productoPresentacion?: string;
  productoCategoria?: string;
  triggerNombre?: string;
  regaloNombre?: string;
  regaloSku?: string;
  regaloPresentacion?: string;
  regaloCategoria?: string;
}

export interface KitItem {
  id: string;
  kitId: string;
  productoId: string;
  varianteId?: string;
  cantidad: number;
  // Campos resueltos via JOIN
  sku: string;
  nombre: string;
  presentacion?: string;
  precioUnitario: number;
  aplicaDescuento: boolean;
  categoria: string;
}

export interface Kit {
  id: string;
  nombre: string;
  descripcion?: string;
  isActive: boolean;
  items: KitItem[];
}

export interface DashboardStats {
  // Base (admin)
  ventasHoy: DashboardCardState<number>;
  pedidosPendientes: DashboardCardState<number>;
  enviosEnRuta: DashboardCardState<number>;
  nuevosClientes: DashboardCardState<number>;
  recentPedidos: RecentPedidoRow[];
  activeRoutes: ActiveRouteRow[];
  // Vendedor
  misVentasHoy?: DashboardCardState<number>;
  misPedidosPendientes?: DashboardCardState<number>;
  comisionEstimada?: DashboardCardState<number>;
  misClientes?: DashboardCardState<number>;
  misPedidosRecientes?: RecentPedidoRow[];
  // Logística
  pedidosListosDespacho?: DashboardCardState<number>;
  pedidosEnPreparacion?: DashboardCardState<number>;
  rutasActivasCount?: DashboardCardState<number>;
  // Contable
  pagosPendientesCount?: DashboardCardState<number>;
  comisionesPorLiquidar?: DashboardCardState<number>;
  pedidosPagoPendienteList?: PedidoPagoPendienteRow[];
}

// ============================================================
// Logistics — Task Card types (Trello-style Kanban)
// ============================================================

export type TipoActividadLogistica =
  | "pedido_creado"
  | "estado_cambiado"
  | "nota_agregada"
  | "nota_completada"
  | "productos_editados"
  | "bolsas_asignadas";

export interface NotaLogistica {
  id: string;
  pedido_id: string;
  texto: string;
  creado_por: string;
  created_at: string;
  completada: boolean;
  completada_por: string | null;
  completada_en: string | null;
  autor: { full_name: string } | null;
  completador: { full_name: string } | null;
}

export interface PedidoActividad {
  id: string;
  pedido_id: string;
  tipo: TipoActividadLogistica;
  usuario_id: string | null;
  usuario_nombre: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
}

export interface TransicionEstado {
  estado: EstadoPedido;
  label: string;
  description: string;
  destructive?: boolean;
  requiresBolsas?: boolean;
  allowedBackward?: boolean;
}

export interface PedidoExpanded {
  id: string;
  numero_pedido: string;
  estado: EstadoPedido;
  estado_pago: string;
  franja_horaria: string;
  fecha_tentativa_entrega: string | null;
  notas_ventas: string | null;
  notas_despacho: string | null;
  total: number;
  subtotal_alimento: number;
  subtotal_snacks: number;
  subtotal_otros: number;
  monto_descuento_compra: number;
  pct_descuento_compra: number;
  tarifa_envio_cliente: number;
  descuento_envio: number;
  total_envio_cobrado: number;
  es_contraentrega: boolean;
  metodo_pago: string | null;
  fuente: string | null;
  numero_bolsas: number;
  fue_editado: boolean;
  created_at: string;
  vendedor_id: string | null;
  clientes: {
    nombre_completo: string;
    celular: string;
    direccion: string;
    complemento_direccion: string | null;
  } | null;
  mascotas: { nombre: string; raza: string | null } | null;
  zonas_envio: { nombre: string } | null;
  vendedor: { full_name: string } | null;
  pedido_ruta: {
    ruta_id: string;
    numero_bolsas: number;
    rutas: { nombre: string; estado: string } | null;
  }[];
}

export interface DetalleItemExpanded {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  variante_id: string | null;
  cantidad: number;
  precio_unitario_snapshot: number;
  subtotal: number;
  nombre_snapshot: string;
  es_magistral: boolean;
  gramaje_magistral: number | null;
  notas_magistral: string | null;
  aplica_descuento: boolean;
  justificacion_precio: string | null;
  es_promo: boolean;
  promo_id: string | null;
}
