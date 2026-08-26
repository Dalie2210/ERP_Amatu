import type { Seccion } from "@/types"

// Lista completa de secciones configurables (ERP-ADM-01), mirror de
// app_seccion (enum DB) — usada para inicializar el mapa de permisos.
export const ALL_SECCIONES: Seccion[] = [
  "ventas", "catalogo", "clientes",
  "comisiones", "aliados",
  "logistica_tablero", "logistica_rutas", "logistica_mensajeros", "logistica_liquidacion",
  "inventario_dashboard", "inventario_explosion", "inventario_ingresos", "inventario_insumos",
  "inventario_recetas", "inventario_produccion", "inventario_productos", "inventario_remisiones",
  "inventario_conteo", "inventario_desperdicio",
  "admin",
]

// Mapa url del sidebar -> sección, usado para filtrar el menú de un usuario
// 'personalizado' (src/components/app-sidebar.tsx) y para los guards de
// layout/API (requireSeccion / requireSeccionApi).
export const SECCION_BY_URL: Record<string, Seccion> = {
  "/ventas/nueva": "ventas",
  "/ventas": "ventas",
  "/pedidos": "ventas",
  "/catalogo": "catalogo",
  "/clientes": "clientes",
  "/comisiones": "comisiones",
  "/comisiones/aliados": "aliados",
  "/logistica": "logistica_tablero",
  "/logistica/rutas": "logistica_rutas",
  "/logistica/mensajeros": "logistica_mensajeros",
  "/logistica/liquidacion-mensajero": "logistica_liquidacion",
  "/inventario": "inventario_dashboard",
  "/inventario/explosion": "inventario_explosion",
  "/inventario/ingresos": "inventario_ingresos",
  "/inventario/insumos": "inventario_insumos",
  "/inventario/recetas": "inventario_recetas",
  "/inventario/produccion": "inventario_produccion",
  "/inventario/productos": "inventario_productos",
  "/inventario/remisiones": "inventario_remisiones",
  "/inventario/conteo": "inventario_conteo",
  "/inventario/desperdicio": "inventario_desperdicio",
  "/admin": "admin",
}
