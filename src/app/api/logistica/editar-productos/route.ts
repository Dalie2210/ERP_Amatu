import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calcularDescuentos } from "@/lib/calculators/discounts";
import type { ReglaDescuento } from "@/types";

interface LineaEditada {
  producto_id: string | null;
  variante_id: string | null;
  nombre_snapshot: string;
  cantidad: number;
  precio_unitario_snapshot: number;
  aplica_descuento: boolean;
  es_magistral: boolean;
  gramaje_magistral: number | null;
  notas_magistral: string | null;
  justificacion_precio: string | null;
  es_promo: boolean;
  promo_id: string | null;
}

interface EditarProductosBody {
  pedido_id: string;
  lineas: LineaEditada[];
}

const ESTADOS_BLOQUEADOS = ["listo_despacho", "despachado", "devolucion", "parcial"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verify role
  const { data: userData } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "logistica"].includes(userData.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body: EditarProductosBody = await req.json();
  const { pedido_id, lineas } = body;

  if (!pedido_id || !lineas || lineas.length === 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Fetch current pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id, estado, tarifa_envio_cliente, detalle_pedido(*)")
    .eq("id", pedido_id)
    .single();

  if (pedidoError || !pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (ESTADOS_BLOQUEADOS.includes(pedido.estado)) {
    return NextResponse.json(
      { error: `No se puede editar un pedido en estado '${pedido.estado}'` },
      { status: 400 }
    );
  }

  // Fetch discount rules
  const { data: reglasRaw } = await supabase
    .from("reglas_descuento")
    .select("id, monto_minimo, pct_descuento_compra, descuento_envio_fijo");

  const reglas: ReglaDescuento[] = (reglasRaw ?? []).map((r) => ({
    id: r.id,
    montoMinimo: r.monto_minimo,
    pctDescuentoCompra: r.pct_descuento_compra,
    descuentoEnvioFijo: r.descuento_envio_fijo,
  }));

  // Compute new subtotals
  let subtotalAlimento = 0;
  let subtotalSnacks = 0;
  let subtotalOtros = 0;

  for (const linea of lineas) {
    const sub = linea.cantidad * linea.precio_unitario_snapshot;
    if (linea.aplica_descuento) {
      subtotalAlimento += sub;
    } else if (linea.es_magistral) {
      subtotalOtros += sub;
    } else {
      // Distinguish snacks vs otros by presence of producto_id with snack category
      // For simplicity: magistral → otros, aplica_descuento → alimento, else → snacks
      subtotalSnacks += sub;
    }
  }

  const calculo = calcularDescuentos(
    subtotalAlimento,
    subtotalSnacks,
    subtotalOtros,
    pedido.tarifa_envio_cliente ?? 0,
    reglas
  );

  // Snapshot of old items for activity log
  const itemsAntes = (pedido.detalle_pedido ?? []).map((d: Record<string, unknown>) => ({
    nombre: d.nombre_snapshot,
    cantidad: d.cantidad,
    precio: d.precio_unitario_snapshot,
  }));

  const itemsDespues = lineas.map((l) => ({
    nombre: l.nombre_snapshot,
    cantidad: l.cantidad,
    precio: l.precio_unitario_snapshot,
  }));

  // Delete old line items
  const { error: deleteError } = await supabase
    .from("detalle_pedido")
    .delete()
    .eq("pedido_id", pedido_id);

  if (deleteError) {
    return NextResponse.json({ error: "Error al eliminar líneas anteriores" }, { status: 500 });
  }

  // Insert new line items
  const newLineas = lineas.map((l) => ({
    pedido_id,
    producto_id: l.producto_id,
    variante_id: l.variante_id,
    nombre_snapshot: l.nombre_snapshot,
    cantidad: l.cantidad,
    precio_unitario_snapshot: l.precio_unitario_snapshot,
    subtotal: Math.round(l.cantidad * l.precio_unitario_snapshot),
    aplica_descuento: l.aplica_descuento,
    es_magistral: l.es_magistral,
    gramaje_magistral: l.gramaje_magistral,
    notas_magistral: l.notas_magistral,
    justificacion_precio: l.justificacion_precio,
    es_promo: l.es_promo,
    promo_id: l.promo_id,
  }));

  const { error: insertError } = await supabase.from("detalle_pedido").insert(newLineas);
  if (insertError) {
    return NextResponse.json({ error: "Error al insertar nuevas líneas" }, { status: 500 });
  }

  // Update pedido totals
  const { error: updatePedidoError } = await supabase
    .from("pedidos")
    .update({
      subtotal_alimento: calculo.subtotalAlimento,
      subtotal_snacks: calculo.subtotalSnacks,
      subtotal_otros: calculo.subtotalOtros,
      monto_descuento_compra: calculo.montoDescuentoCompra,
      pct_descuento_compra: calculo.pctDescuentoCompra,
      descuento_envio: calculo.descuentoEnvio,
      total_envio_cobrado: calculo.totalEnvioCobrado,
      total: calculo.total,
      fue_editado: true,
      editado_por_id: user.id,
      editado_en: new Date().toISOString(),
    })
    .eq("id", pedido_id);

  if (updatePedidoError) {
    return NextResponse.json({ error: "Error al actualizar totales del pedido" }, { status: 500 });
  }

  // Update comisiones_detalle (recalculate amounts, keep pct_comision)
  const { data: comision } = await supabase
    .from("comisiones_detalle")
    .select("id, pct_comision")
    .eq("pedido_id", pedido_id)
    .single();

  if (comision) {
    const baseCalculo = Math.round((calculo.total - calculo.totalEnvioCobrado) * 0.95);
    const montoComision = Math.round(baseCalculo * (comision.pct_comision / 100));
    await supabase
      .from("comisiones_detalle")
      .update({ base_calculo: baseCalculo, monto_comision: montoComision, is_provisional: true })
      .eq("id", comision.id);
  }

  // Log activity
  await supabase.from("pedido_actividad").insert({
    pedido_id,
    tipo: "productos_editados",
    usuario_id: user.id,
    usuario_nombre: userData.full_name,
    payload: { items_antes: itemsAntes, items_despues: itemsDespues },
  });

  return NextResponse.json({ success: true, totales: calculo });
}
