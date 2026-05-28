import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import type { QuickAction } from "@/components/dashboard/QuickActions";
import { formatCOP } from "@/lib/format";
import type { DashboardStats } from "@/types";
import {
  TrendingUp, Package, Truck, Users, DollarSign, Route,
  ShoppingBag, Leaf, UserCog, Handshake, ChevronRight,
  ClipboardCheck, Clock,
} from "lucide-react";
import Link from "next/link";

export const estadoColors: Record<string, string> = {
  fecha_tentativa: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-green-100 text-green-800",
  en_preparacion: "bg-blue-100 text-blue-800",
  espera_produccion: "bg-orange-100 text-orange-800",
  listo_despacho: "bg-indigo-100 text-indigo-800",
  despachado: "bg-emerald-100 text-emerald-800",
  devolucion: "bg-red-100 text-red-800",
  parcial: "bg-amber-100 text-amber-800",
};

export const estadoLabels: Record<string, string> = {
  fecha_tentativa: "Por Confirmar",
  confirmado: "Confirmado",
  en_preparacion: "Preparación",
  espera_produccion: "Esp. Producción",
  listo_despacho: "Listo",
  despachado: "Despachado",
  devolucion: "Devolución",
  parcial: "Parcial",
};

const ADMIN_ACTIONS: QuickAction[] = [
  { label: "Nueva Venta", href: "/ventas/nueva", icon: ShoppingBag, description: "Crear un pedido" },
  { label: "Crear Ruta", href: "/logistica/rutas", icon: Route, description: "Gestionar despachos" },
  { label: "Gestionar Usuarios", href: "/admin/usuarios", icon: UserCog, description: "Roles y accesos" },
];

const VENDEDOR_ACTIONS: QuickAction[] = [
  { label: "Nueva Venta", href: "/ventas/nueva", icon: ShoppingBag, description: "Crear un pedido" },
  { label: "Mis Clientes", href: "/clientes", icon: Users, description: "Ver directorio" },
  { label: "Ver Catálogo", href: "/catalogo", icon: Leaf, description: "Productos y precios" },
];

const LOGISTICA_ACTIONS: QuickAction[] = [
  { label: "Kanban", href: "/logistica", icon: Truck, description: "Estado de pedidos" },
  { label: "Crear Ruta", href: "/logistica/rutas", icon: Route, description: "Asignar despachos" },
  { label: "Liq. Mensajero", href: "/logistica/liquidacion-mensajero", icon: DollarSign, description: "Pagos mensajeros" },
];

const CONTABLE_ACTIONS: QuickAction[] = [
  { label: "Liquidar Comisiones", href: "/comisiones", icon: DollarSign, description: "Ver comisiones" },
  { label: "Aliados", href: "/comisiones/aliados", icon: Handshake, description: "Comisiones aliados" },
];

export function AdminDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventas del Día" icon={TrendingUp} state={stats.ventasHoy} format={formatCOP} description="Total facturado hoy" emptyHint="Sin ventas hoy" />
        <StatCard title="Pedidos Pendientes" icon={Package} state={stats.pedidosPendientes} format={(n) => n.toString()} description="Por preparar o despachar" emptyHint="Sin pendientes" />
        <StatCard title="Envíos en Ruta" icon={Truck} state={stats.enviosEnRuta} format={(n) => n.toString()} description="Despachos en curso" emptyHint="Ninguno en ruta" />
        <StatCard title="Nuevos Clientes" icon={Users} state={stats.nuevosClientes} format={(n) => `+${n}`} description="En los últimos 7 días" emptyHint="Sin altas recientes" />
      </div>

      <QuickActions actions={ADMIN_ACTIONS} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentPedidosCard pedidos={stats.recentPedidos} href="/pedidos" />
        <ActiveRoutesCard routes={stats.activeRoutes} />
      </div>
    </div>
  );
}

export function VendedorDashboard({ stats }: { stats: DashboardStats }) {
  const misVentasHoy = stats.misVentasHoy ?? { value: null, status: "ok" as const };
  const misPedidosPendientes = stats.misPedidosPendientes ?? { value: null, status: "ok" as const };
  const comisionEstimada = stats.comisionEstimada ?? { value: null, status: "ok" as const };
  const misClientes = stats.misClientes ?? { value: null, status: "ok" as const };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mis Ventas Hoy" icon={TrendingUp} state={misVentasHoy} format={formatCOP} description="Mis ventas de hoy" emptyHint="Sin ventas hoy" />
        <StatCard title="Mis Pedidos Pendientes" icon={Package} state={misPedidosPendientes} format={(n) => n.toString()} description="Por preparar o despachar" emptyHint="Sin pendientes" />
        <StatCard title="Comisión Estimada" icon={DollarSign} state={comisionEstimada} format={formatCOP} description="Este mes (sin liquidar)" emptyHint="Sin comisiones" />
        <StatCard title="Mis Clientes" icon={Users} state={misClientes} format={(n) => n.toString()} description="Total de clientes" emptyHint="Sin clientes aún" />
      </div>

      <QuickActions actions={VENDEDOR_ACTIONS} />

      <RecentPedidosCard pedidos={stats.misPedidosRecientes ?? []} href="/ventas" title="Mis Últimos Pedidos" />
    </div>
  );
}

export function LogisticaDashboard({ stats }: { stats: DashboardStats }) {
  const pedidosListosDespacho = stats.pedidosListosDespacho ?? { value: null, status: "ok" as const };
  const pedidosEnPreparacion = stats.pedidosEnPreparacion ?? { value: null, status: "ok" as const };
  const rutasActivasCount = stats.rutasActivasCount ?? { value: null, status: "ok" as const };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Listos para Despacho" icon={ClipboardCheck} state={pedidosListosDespacho} format={(n) => n.toString()} description="Pedidos esperando ruta" emptyHint="Ninguno listo" />
        <StatCard title="Envíos en Ruta" icon={Truck} state={stats.enviosEnRuta} format={(n) => n.toString()} description="Despachos en curso" emptyHint="Ninguno en ruta" />
        <StatCard title="Rutas Activas" icon={Route} state={rutasActivasCount} format={(n) => n.toString()} description="Rutas en preparación" emptyHint="Sin rutas activas" />
        <StatCard title="En Preparación" icon={Clock} state={pedidosEnPreparacion} format={(n) => n.toString()} description="Pedidos en proceso" emptyHint="Ninguno" />
      </div>

      <QuickActions actions={LOGISTICA_ACTIONS} />

      <ActiveRoutesCard routes={stats.activeRoutes} />
    </div>
  );
}

export function ContableDashboard({ stats }: { stats: DashboardStats }) {
  const pagosPendientesCount = stats.pagosPendientesCount ?? { value: null, status: "ok" as const };
  const comisionesPorLiquidar = stats.comisionesPorLiquidar ?? { value: null, status: "ok" as const };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventas del Día" icon={TrendingUp} state={stats.ventasHoy} format={formatCOP} description="Total facturado hoy" emptyHint="Sin ventas hoy" />
        <StatCard title="Pagos Pendientes" icon={Package} state={pagosPendientesCount} format={(n) => n.toString()} description="Por confirmar pago" emptyHint="Sin pendientes" />
        <StatCard title="Comisiones por Liquidar" icon={DollarSign} state={comisionesPorLiquidar} format={formatCOP} description="Total pendiente de pago" emptyHint="Sin pendientes" />
        <StatCard title="Envíos en Ruta" icon={Truck} state={stats.enviosEnRuta} format={(n) => n.toString()} description="Despachos en curso" emptyHint="Ninguno en ruta" />
      </div>

      <QuickActions actions={CONTABLE_ACTIONS} />

      <PagoPendienteCard pedidos={stats.pedidosPagoPendienteList ?? []} />
    </div>
  );
}

function RecentPedidosCard({
  pedidos,
  href,
  title = "Últimos Pedidos",
}: {
  pedidos: DashboardStats["recentPedidos"];
  href: string;
  title?: string;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-heading">{title}</CardTitle>
        <Link href={href} className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {pedidos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-6">
            No hay pedidos registrados aún.
          </div>
        ) : (
          <div className="divide-y">
            {pedidos.map((p) => (
              <Link key={p.id} href={`/ventas/${p.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.numero_pedido}</span>
                    <Badge className={`text-[10px] h-4 px-1.5 ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-700"}`}>
                      {estadoLabels[p.estado] ?? p.estado}
                    </Badge>
                    {p.estado_pago !== "confirmado" && (
                      <Badge className="text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700">Pago pend.</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{p.clientes?.nombre_completo ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold">{formatCOP(p.total)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveRoutesCard({ routes }: { routes: DashboardStats["activeRoutes"] }) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-heading">Rutas Activas</CardTitle>
        <Link href="/logistica/rutas" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todas <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {routes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-6">
            No hay rutas en preparación.
          </div>
        ) : (
          <div className="divide-y">
            {routes.map((r) => (
              <Link key={r.id} href={`/logistica/rutas/${r.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Route className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">{r.mensajero_nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    {r.pedidos_count} pedido{r.pedidos_count !== 1 ? "s" : ""}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PagoPendienteCard({ pedidos }: { pedidos: NonNullable<DashboardStats["pedidosPagoPendienteList"]> }) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-heading">Pedidos con Pago Pendiente</CardTitle>
        <Link href="/ventas" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {pedidos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-6">
            No hay pagos pendientes.
          </div>
        ) : (
          <div className="divide-y">
            {pedidos.map((p) => (
              <Link key={p.id} href={`/ventas/${p.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.numero_pedido}</span>
                    <Badge className={`text-[10px] h-4 px-1.5 ${estadoColors[p.estado] ?? "bg-gray-100 text-gray-700"}`}>
                      {estadoLabels[p.estado] ?? p.estado}
                    </Badge>
                    <Badge className="text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700">Pago pend.</Badge>
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{p.clientes?.nombre_completo ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold">{formatCOP(p.total)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
