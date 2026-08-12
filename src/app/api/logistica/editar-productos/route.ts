import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const LineaSchema = z.object({
  producto_id: z.string().uuid().nullable(),
  variante_id: z.string().uuid().nullable(),
  nombre_snapshot: z.string().min(1),
  cantidad: z.number().positive(),
  precio_unitario_snapshot: z.number().nonnegative(),
  aplica_descuento: z.boolean(),
  es_magistral: z.boolean(),
  gramaje_magistral: z.number().positive().nullable(),
  notas_magistral: z.string().nullable(),
  justificacion_precio: z.string().nullable(),
  es_promo: z.boolean(),
  promo_id: z.string().uuid().nullable(),
});

const EditarProductosSchema = z.object({
  pedido_id: z.string().uuid(),
  lineas: z.array(LineaSchema).min(1),
  // Bloqueo optimista (I2): el `updated_at` que el editor tenía en pantalla.
  // Si el pedido cambió entre medias, la RPC responde PT409 y aquí se traduce
  // a HTTP 409 para que la UI pida recargar en vez de pisar el cambio ajeno.
  updated_at_esperado: z.string().datetime({ offset: true }).nullish(),
});

type TotalesRpc = {
  subtotal_alimento: number;
  subtotal_snacks: number;
  subtotal_otros: number;
  pct_descuento_compra: number;
  monto_descuento_compra: number;
  descuento_envio: number;
  total_envio_cobrado: number;
  total: number;
  updated_at: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = EditarProductosSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { pedido_id, lineas, updated_at_esperado } = parsed.data;

  // Toda la operación (validaciones de rol/estado, borrado y reinserción de
  // líneas, recálculo de totales, comisión y bitácora) ocurre dentro de
  // fn_editar_lineas_pedido, en una sola transacción y con la fila de `pedidos`
  // bloqueada con FOR UPDATE.
  const { data, error } = await supabase.rpc("fn_editar_lineas_pedido", {
    p_pedido_id: pedido_id,
    p_lineas: lineas.map((l) => ({
      producto_id: l.producto_id,
      variante_id: l.variante_id,
      nombre_snapshot: l.nombre_snapshot,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario_snapshot,
      aplica_descuento: l.aplica_descuento,
      es_magistral: l.es_magistral,
      gramaje_magistral: l.gramaje_magistral,
      notas_magistral: l.notas_magistral,
      justificacion_precio: l.justificacion_precio,
      es_promo: l.es_promo,
      promo_id: l.promo_id,
    })),
    p_updated_at_esperado: updated_at_esperado ?? null,
  });

  if (error) {
    const status = ERROR_STATUS[error.code ?? ""] ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const totales = data as TotalesRpc | null;
  return NextResponse.json({ success: true, totales });
}

const ERROR_STATUS: Record<string, number> = {
  PT409: 409, // el pedido cambió mientras se editaba
  "42501": 403, // sin permisos
  "23514": 400, // estado bloqueado / payload inválido
  "23503": 404, // pedido no encontrado
};
