import type { EstadoPedido, TransicionEstado, UserRole } from "@/types";

export const STAGE_TRANSITIONS: Record<EstadoPedido, TransicionEstado[]> = {
  fecha_tentativa: [
    {
      estado: "confirmado",
      label: "Confirmar Pedido",
      description: "Confirmar pedido y registrar pago recibido",
    },
  ],
  confirmado: [
    {
      estado: "en_preparacion",
      label: "En Preparación",
      description: "Iniciar preparación del pedido",
    },
    {
      estado: "espera_produccion",
      label: "Espera Producción",
      description: "El alimento aún no está listo, en espera de producción",
    },
    {
      estado: "devolucion",
      label: "Marcar Devolución",
      description: "El cliente devuelve el pedido completo",
      destructive: true,
    },
    {
      estado: "cambio",
      label: "Marcar Cambio",
      description: "El cliente solicita cambio de producto",
      destructive: true,
    },
  ],
  en_preparacion: [
    {
      estado: "confirmado",
      label: "Volver a Confirmado",
      description: "Regresar el pedido al estado confirmado",
      allowedBackward: true,
    },
    {
      estado: "espera_produccion",
      label: "Espera Producción",
      description: "Pasar a espera de producción",
    },
    {
      estado: "listo_despacho",
      label: "Listo para Despacho",
      description: "Pedido empacado y listo para despachar",
      requiresBolsas: true,
    },
    {
      estado: "devolucion",
      label: "Marcar Devolución",
      description: "El cliente devuelve el pedido",
      destructive: true,
    },
    {
      estado: "cambio",
      label: "Marcar Cambio",
      description: "El cliente solicita cambio de producto",
      destructive: true,
    },
  ],
  espera_produccion: [
    {
      estado: "en_preparacion",
      label: "Volver a Preparación",
      description: "Producción lista, retomar preparación",
      allowedBackward: true,
    },
    {
      estado: "listo_despacho",
      label: "Listo para Despacho",
      description: "Producción y empaque completados, listo para despachar",
      requiresBolsas: true,
    },
    {
      estado: "devolucion",
      label: "Marcar Devolución",
      description: "El cliente devuelve el pedido",
      destructive: true,
    },
  ],
  listo_despacho: [
    {
      estado: "en_preparacion",
      label: "Volver a Preparación",
      description: "Regresar a preparación (ej: cambio solicitado por el cliente)",
      allowedBackward: true,
    },
    {
      estado: "espera_produccion",
      label: "Volver a Espera Producción",
      description: "Requiere reajuste de producción",
      allowedBackward: true,
    },
    {
      estado: "devolucion",
      label: "Marcar Devolución",
      description: "El cliente devuelve antes del despacho",
      destructive: true,
    },
    {
      estado: "cambio",
      label: "Marcar Cambio",
      description: "El cliente solicita cambio antes del despacho",
      destructive: true,
    },
  ],
  despachado: [],
  devolucion: [
    {
      estado: "confirmado",
      label: "Reactivar como Confirmado",
      description: "Reactivar el pedido desde devolución",
      allowedBackward: true,
    },
    {
      estado: "en_preparacion",
      label: "Reactivar a Preparación",
      description: "Reactivar directamente a preparación",
      allowedBackward: true,
    },
  ],
  cambio: [
    {
      estado: "confirmado",
      label: "Reactivar como Confirmado",
      description: "Reactivar el pedido desde cambio",
      allowedBackward: true,
    },
    {
      estado: "en_preparacion",
      label: "Reactivar a Preparación",
      description: "Reactivar directamente a preparación",
      allowedBackward: true,
    },
  ],
  parcial: [],
};

// Para drag-and-drop: solo transiciones primarias hacia adelante
// Las transiciones hacia atrás solo se hacen desde TaskCardDialog
export const DND_ALLOWED_DROPS: Record<string, string[]> = {
  por_confirmar: ["confirmado"],
  confirmado: ["preparacion"],
  preparacion: ["listo"],
  listo: [],           // listo_despacho requiere bolsas popup, se maneja en handleDragEnd
  despachado: [],
  devolucion: ["confirmado"],
  cambio: ["confirmado"],
};

// Roles que NO pueden confirmar pedidos (fecha_tentativa → confirmado)
const LOGISTICA_BLOCKED_FROM: EstadoPedido[] = ["fecha_tentativa"];

export function getTransitions(
  estadoActual: EstadoPedido,
  userRole: UserRole | null
): TransicionEstado[] {
  const all = STAGE_TRANSITIONS[estadoActual] ?? [];
  if (userRole !== "logistica") return all;
  // Logística no puede confirmar desde fecha_tentativa
  if (LOGISTICA_BLOCKED_FROM.includes(estadoActual)) return [];
  return all;
}
