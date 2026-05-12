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
  | "parcial";

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
  aplicaDescuento: boolean;
  categoria: string;
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
  esContraentrega: boolean;
  fechaTentativaEntrega: string | null;
  esDistribuidor: boolean;
  pctDescuentoDistribuidor: number;
  tarifaEnvioBase: number;
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
