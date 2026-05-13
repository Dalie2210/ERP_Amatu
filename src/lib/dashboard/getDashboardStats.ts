import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardCardState, DashboardStats } from "@/types";

const ESTADOS_VENTA_HOY = [
  "confirmado",
  "en_preparacion",
  "espera_produccion",
  "listo_despacho",
  "despachado",
] as const;

const ESTADOS_PENDIENTE = [
  "confirmado",
  "en_preparacion",
  "espera_produccion",
  "listo_despacho",
] as const;

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [ventasResult, pendientesResult, enRutaResult, clientesResult] =
    await Promise.allSettled([
      supabase
        .from("pedidos")
        .select("total")
        .in("estado", ESTADOS_VENTA_HOY as unknown as string[])
        .gte("created_at", startOfDayIso),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .in("estado", ESTADOS_PENDIENTE as unknown as string[]),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "despachado")
        .is("fecha_entrega_real", null),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso),
    ]);

  return {
    ventasHoy: toSumCard(ventasResult, "total"),
    pedidosPendientes: toCountCard(pendientesResult),
    enviosEnRuta: toCountCard(enRutaResult),
    nuevosClientes: toCountCard(clientesResult),
  };
}

type SupabaseSelectResult = {
  data: Array<Record<string, unknown>> | null;
  error: unknown;
};

type SupabaseCountResult = {
  count: number | null;
  error: unknown;
};

function toSumCard(
  result: PromiseSettledResult<SupabaseSelectResult>,
  field: string
): DashboardCardState<number> {
  if (result.status !== "fulfilled" || result.value.error) {
    if (result.status === "fulfilled" && result.value.error) {
      console.error("[dashboard] sum query failed", result.value.error);
    } else if (result.status === "rejected") {
      console.error("[dashboard] sum query threw", result.reason);
    }
    return { value: null, status: "error" };
  }
  const rows = result.value.data ?? [];
  const sum = rows.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
  return { value: sum, status: "ok" };
}

function toCountCard(
  result: PromiseSettledResult<SupabaseCountResult>
): DashboardCardState<number> {
  if (result.status !== "fulfilled" || result.value.error) {
    if (result.status === "fulfilled" && result.value.error) {
      console.error("[dashboard] count query failed", result.value.error);
    } else if (result.status === "rejected") {
      console.error("[dashboard] count query threw", result.reason);
    }
    return { value: null, status: "error" };
  }
  return { value: result.value.count ?? 0, status: "ok" };
}

