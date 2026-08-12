import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ActiveRouteRow, DashboardCardState, DashboardStats, EstadoPedido, PedidoPagoPendienteRow, RecentPedidoRow,
} from "@/types";

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

  const [
    ventasResult, pendientesResult, enRutaResult, clientesResult, recentPedidosResult, activeRoutesResult,
    inventarioResult,
  ] =
    await Promise.allSettled([
      // E2: la suma la hace SQL en vez de traer todos los `total` del día.
      supabase.rpc("fn_ventas_resumen_periodo", {
        p_desde: startOfDayIso,
        p_estados: ESTADOS_VENTA_HOY as unknown as string[],
      }),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .in("estado", ESTADOS_PENDIENTE as unknown as EstadoPedido[]),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "despachado")
        .is("fecha_entrega_real", null),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso),
      supabase
        .from("pedidos")
        .select("id, numero_pedido, estado, estado_pago, total, created_at, clientes(nombre_completo)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("rutas")
        .select("id, nombre, mensajero_nombre, fecha, pedido_ruta(count)")
        .eq("estado", "en_preparacion")
        .order("created_at", { ascending: false })
        .limit(5),
      // E2: antes se traían las tres vistas completas para reducirlas en JS.
      supabase.rpc("fn_inventario_resumen"),
    ]);

  const recentPedidos: RecentPedidoRow[] =
    recentPedidosResult.status === "fulfilled" && !recentPedidosResult.value.error
      ? (recentPedidosResult.value.data as unknown as RecentPedidoRow[]) ?? []
      : [];

  const activeRoutes: ActiveRouteRow[] =
    activeRoutesResult.status === "fulfilled" && !activeRoutesResult.value.error
      ? ((activeRoutesResult.value.data ?? []) as Array<{
          id: string; nombre: string; mensajero_nombre: string; fecha: string;
          pedido_ruta: { count: number }[];
        }>).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          mensajero_nombre: r.mensajero_nombre,
          fecha: r.fecha,
          pedidos_count: r.pedido_ruta?.[0]?.count ?? 0,
        }))
      : [];

  type InventarioResumen = {
    valor_total: number; insumos_bajo_minimo: number; lotes_por_vencer: number;
    pt_producido: number; pt_empacado: number; pt_despachado: number;
  };
  const inventarioOk =
    inventarioResult.status === "fulfilled" && !inventarioResult.value.error;
  const inventario = inventarioOk
    ? ((inventarioResult.value.data ?? [])[0] as InventarioResumen | undefined)
    : undefined;

  const valorInventario: DashboardCardState<number> = inventarioOk
    ? { value: Number(inventario?.valor_total ?? 0), status: "ok" }
    : { value: null, status: "error" };

  const insumosBajoMinimo: DashboardCardState<number> = inventarioOk
    ? { value: Number(inventario?.insumos_bajo_minimo ?? 0), status: "ok" }
    : { value: null, status: "error" };

  const lotesPorVencer: DashboardCardState<number> = inventarioOk
    ? { value: Number(inventario?.lotes_por_vencer ?? 0), status: "ok" }
    : { value: null, status: "error" };

  const ptPorEstado: DashboardCardState<{ producido: number; empacado: number; despachado: number }> =
    inventarioOk
      ? {
          value: {
            producido: Number(inventario?.pt_producido ?? 0),
            empacado: Number(inventario?.pt_empacado ?? 0),
            despachado: Number(inventario?.pt_despachado ?? 0),
          },
          status: "ok",
        }
      : { value: null, status: "error" };

  return {
    ventasHoy: toSumCard(ventasResult, "revenue"),
    pedidosPendientes: toCountCard(pendientesResult),
    enviosEnRuta: toCountCard(enRutaResult),
    nuevosClientes: toCountCard(clientesResult),
    recentPedidos,
    activeRoutes,
    valorInventario,
    insumosBajoMinimo,
    lotesPorVencer,
    ptPorEstado,
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
      const err = result.value.error as { message?: string; code?: string } | null;
      console.error("[dashboard] sum query failed", err?.message ?? err);
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
      const err = result.value.error as { message?: string; code?: string } | null;
      console.error("[dashboard] count query failed", err?.message ?? err);
    } else if (result.status === "rejected") {
      console.error("[dashboard] count query threw", result.reason);
    }
    return { value: null, status: "error" };
  }
  return { value: result.value.count ?? 0, status: "ok" };
}

const EMPTY_CARD: DashboardCardState<number> = { value: null, status: "ok" };

export async function getVendedorDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const now = new Date();
  const periodoMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: { user } } = await supabase.auth.getUser();

  const [ventasResult, pendientesResult, comisionResult, clientesResult, pedidosResult] =
    await Promise.allSettled([
      supabase.rpc("fn_ventas_resumen_periodo", {
        p_desde: startOfDayIso,
        p_estados: ESTADOS_VENTA_HOY as unknown as string[],
      }),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .in("estado", ESTADOS_PENDIENTE as unknown as EstadoPedido[]),
      // Comisión estimada del período con la MISMA fuente única que /comisiones.
      user
        ? supabase.rpc("fn_estimar_comisiones_periodo", {
            p_vendedor_id: user.id,
            p_periodo_mes: periodoMes,
          })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("pedidos")
        .select("id, numero_pedido, estado, estado_pago, total, created_at, clientes(nombre_completo)")
        .in("estado", ESTADOS_VENTA_HOY as unknown as EstadoPedido[])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const misPedidosRecientes: RecentPedidoRow[] =
    pedidosResult.status === "fulfilled" && !pedidosResult.value.error
      ? (pedidosResult.value.data as unknown as RecentPedidoRow[]) ?? []
      : [];

  return {
    ventasHoy: EMPTY_CARD,
    pedidosPendientes: EMPTY_CARD,
    enviosEnRuta: EMPTY_CARD,
    nuevosClientes: EMPTY_CARD,
    recentPedidos: [],
    activeRoutes: [],
    misVentasHoy: toSumCard(ventasResult, "revenue"),
    misPedidosPendientes: toCountCard(pendientesResult),
    comisionEstimada: toSumCard(comisionResult, "monto_comision"),
    misClientes: toCountCard(clientesResult),
    misPedidosRecientes,
  };
}

export async function getLogisticaDashboardStats(): Promise<DashboardStats> {
  // S7: se usa el cliente de sesión, no el service-role. Las políticas RLS ya
  // dejan a logística leer los pedidos confirmados y las rutas; el bypass total
  // era un patrón frágil (cualquier refactor que expusiera esta función por otra
  // vía filtraba datos globales).
  const supabase = await createClient();

  const [listosResult, enRutaResult, rutasResult, preparacionResult, activeRoutesResult] =
    await Promise.allSettled([
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "listo_despacho"),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "despachado")
        .is("fecha_entrega_real", null),
      supabase
        .from("rutas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "en_preparacion"),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "en_preparacion"),
      supabase
        .from("rutas")
        .select("id, nombre, mensajero_nombre, fecha, pedido_ruta(count)")
        .eq("estado", "en_preparacion")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const activeRoutes: ActiveRouteRow[] =
    activeRoutesResult.status === "fulfilled" && !activeRoutesResult.value.error
      ? ((activeRoutesResult.value.data ?? []) as Array<{
          id: string; nombre: string; mensajero_nombre: string; fecha: string;
          pedido_ruta: { count: number }[];
        }>).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          mensajero_nombre: r.mensajero_nombre,
          fecha: r.fecha,
          pedidos_count: r.pedido_ruta?.[0]?.count ?? 0,
        }))
      : [];

  return {
    ventasHoy: EMPTY_CARD,
    pedidosPendientes: EMPTY_CARD,
    nuevosClientes: EMPTY_CARD,
    recentPedidos: [],
    activeRoutes,
    enviosEnRuta: toCountCard(enRutaResult),
    pedidosListosDespacho: toCountCard(listosResult),
    rutasActivasCount: toCountCard(rutasResult),
    pedidosEnPreparacion: toCountCard(preparacionResult),
  };
}

export async function getContableDashboardStats(): Promise<DashboardStats> {
  // S7: cliente de sesión. Las políticas RLS ya dan a contable acceso completo
  // a pedidos y comisiones; no hace falta el service-role.
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const [ventasResult, pagosPendResult, comisionesResult, enRutaResult, pagoPendListResult] =
    await Promise.allSettled([
      supabase.rpc("fn_ventas_resumen_periodo", {
        p_desde: startOfDayIso,
        p_estados: ESTADOS_VENTA_HOY as unknown as string[],
      }),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .neq("estado_pago", "confirmado")
        .not("estado", "in", '("devolucion","cambio")'),
      // E2: la suma la hace SQL en vez de traer todas las comisiones sin liquidar.
      supabase.rpc("fn_comisiones_resumen", {
        p_solo_sin_liquidar: true,
        p_solo_aplica: true,
      }),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("estado", "despachado")
        .is("fecha_entrega_real", null),
      supabase
        .from("pedidos")
        .select("id, numero_pedido, estado, estado_pago, total, created_at, clientes(nombre_completo)")
        .neq("estado_pago", "confirmado")
        .not("estado", "in", '("devolucion","cambio")')
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const pedidosPagoPendienteList: PedidoPagoPendienteRow[] =
    pagoPendListResult.status === "fulfilled" && !pagoPendListResult.value.error
      ? (pagoPendListResult.value.data as unknown as PedidoPagoPendienteRow[]) ?? []
      : [];

  return {
    pedidosPendientes: EMPTY_CARD,
    nuevosClientes: EMPTY_CARD,
    recentPedidos: [],
    activeRoutes: [],
    ventasHoy: toSumCard(ventasResult, "revenue"),
    enviosEnRuta: toCountCard(enRutaResult),
    pagosPendientesCount: toCountCard(pagosPendResult),
    comisionesPorLiquidar: toSumCard(comisionesResult, "monto_total"),
    pedidosPagoPendienteList,
  };
}

