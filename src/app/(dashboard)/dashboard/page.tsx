import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { getDashboardStats } from "@/lib/dashboard/getDashboardStats";
import { createClient } from "@/lib/supabase/server";
import { formatCOP } from "@/lib/format";
import { Package, TrendingUp, Users, Truck } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: { user } }, stats] = await Promise.all([
    supabase.auth.getUser(),
    getDashboardStats(),
  ]);

  const greetingName = user?.email?.split("@")[0] || "Equipo";

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">
          ¡Hola, {greetingName}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Aquí tienes un resumen de la operación de hoy.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventas del Día"
          icon={TrendingUp}
          state={stats.ventasHoy}
          format={formatCOP}
          description="Total facturado hoy"
          emptyHint="Sin ventas registradas hoy"
        />
        <StatCard
          title="Pedidos Pendientes"
          icon={Package}
          state={stats.pedidosPendientes}
          format={(n) => n.toString()}
          description="Por preparar o despachar"
          emptyHint="Sin pendientes"
        />
        <StatCard
          title="Envíos en Ruta"
          icon={Truck}
          state={stats.enviosEnRuta}
          format={(n) => n.toString()}
          description="Despachos en curso"
          emptyHint="Ninguno en ruta"
        />
        <StatCard
          title="Nuevos Clientes"
          icon={Users}
          state={stats.nuevosClientes}
          format={(n) => `+${n}`}
          description="En los últimos 7 días"
          emptyHint="Sin altas recientes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <Card className="border-none shadow-sm min-h-[300px]">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Últimos Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center text-muted-foreground h-[200px]">
            El módulo de pedidos se conectará en el próximo sprint.
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm min-h-[300px]">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Rutas Activas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center text-muted-foreground h-[200px]">
            El módulo de logística se conectará próximamente.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
