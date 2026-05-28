import {
  AdminDashboard,
  VendedorDashboard,
  LogisticaDashboard,
  ContableDashboard,
} from "@/components/dashboard/RoleDashboard";
import {
  getDashboardStats,
  getVendedorDashboardStats,
  getLogisticaDashboardStats,
  getContableDashboardStats,
} from "@/lib/dashboard/getDashboardStats";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role as UserRole) ?? "vendedor";
  const greetingName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Equipo";

  const stats = await (
    role === "vendedor"  ? getVendedorDashboardStats() :
    role === "logistica" ? getLogisticaDashboardStats() :
    role === "contable"  ? getContableDashboardStats() :
    getDashboardStats()
  );

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

      {role === "admin"     && <AdminDashboard stats={stats} />}
      {role === "vendedor"  && <VendedorDashboard stats={stats} />}
      {role === "logistica" && <LogisticaDashboard stats={stats} />}
      {role === "contable"  && <ContableDashboard stats={stats} />}
    </div>
  );
}
