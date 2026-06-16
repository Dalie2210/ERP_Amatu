import type { EstadoPedido } from "@/types";

export const ESTADO_LOGISTICA_LABELS: Record<EstadoPedido, string> = {
  fecha_tentativa: "Por Confirmar",
  confirmado: "Confirmado",
  en_preparacion: "En Preparación",
  espera_produccion: "Espera Producción",
  listo_despacho: "Listo para Despacho",
  despachado: "Despachado",
  devolucion: "Devolución",
  cambio: "Cambio",
  parcial: "Parcial",
};

export const ESTADO_LOGISTICA_STYLES: Record<EstadoPedido, string> = {
  fecha_tentativa: "bg-amber-100 text-amber-800 border-amber-200",
  confirmado: "bg-green-100 text-green-800 border-green-200",
  en_preparacion: "bg-blue-100 text-blue-800 border-blue-200",
  espera_produccion: "bg-yellow-100 text-yellow-800 border-yellow-200",
  listo_despacho: "bg-indigo-100 text-indigo-800 border-indigo-200",
  despachado: "bg-gray-100 text-gray-700 border-gray-200",
  devolucion: "bg-red-100 text-red-800 border-red-200",
  cambio: "bg-orange-100 text-orange-800 border-orange-200",
  parcial: "bg-purple-100 text-purple-800 border-purple-200",
};
