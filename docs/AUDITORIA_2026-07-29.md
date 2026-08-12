# Auditoría técnica — Amatu ERP

**Fecha:** 2026-07-29 · **Rama:** `dev` · **Alcance:** seguridad, integridad de datos, concurrencia, escalabilidad y mantenibilidad.

**Estado de la base:** `tsc --noEmit` limpio · `vitest` 11/11 verde (solo calculadoras) · `eslint` **79 errores, 123 warnings**.

---

## Resumen ejecutivo

| # | Hallazgo | Severidad | Área |
|---|----------|-----------|------|
| S1 | Un vendedor puede confirmar su propio pago e inflar el total de su pedido vía PostgREST | 🔴 Crítica | Fraude de comisiones |
| S2 | `promociones`, `kits`, `kit_items` sin RLS → lectura/escritura con la anon key | 🔴 Crítica | Seguridad |
| S3 | `/api/comisiones/liquidacion-mensual` queda **abierto** si `CRON_SECRET` no está definido | 🔴 Crítica | Seguridad |
| S4 | `users.is_active = false` no impide iniciar sesión ni operar | 🔴 Crítica | Seguridad |
| S5 | La máquina de estados de pedidos solo existe en el cliente | 🟠 Alta | Integridad |
| S6 | `pedido_numero_seq` escribible por cualquier autenticado | 🟠 Alta | Integridad |
| S7 | Dashboards de logística/contable usan service-role (bypass total de RLS) | 🟠 Alta | Seguridad |
| S8 | `comisiones_aliado` legible por todos; el vendedor **no ve** sus comisiones provisionales | 🟠 Alta | Seguridad / bug |
| I1 | `createOrder` no es transaccional → pedidos huérfanos sin líneas | 🟠 Alta | Integridad |
| I2 | `editar-productos` borra líneas y reinserta sin transacción ni bloqueo optimista | 🟠 Alta | Integridad |
| I3 | Doble despacho de ruta por carrera entre validación y RPC | 🟠 Alta | Integridad |
| E1 | **Faltan índices en todas las tablas de ventas** (`detalle_pedido.pedido_id`, `pedidos.cliente_id`, …) | 🔴 Crítica | Escalabilidad |
| E2 | Consultas sin cota que crecen con el histórico (dashboards, `/ventas`) | 🟠 Alta | Escalabilidad |
| E3 | Búsquedas `ILIKE %…%` sin índice trigram | 🟡 Media | Escalabilidad |
| E4 | Agregaciones de listas completas en JavaScript, algunas O(n²) | 🟡 Media | Escalabilidad |
| A1 | `useAuth` refetchea rol por componente (23 consumidores, sin contexto) | 🟡 Media | Rendimiento |
| A2 | Sin guardas de rol server-side fuera de `admin`/`inventario` | 🟡 Media | Defensa en profundidad |
| A3 | Inyección de filtros PostgREST en `.or(...)` con input crudo | 🟡 Media | Seguridad |
| A4 | 79 errores de ESLint; cobertura de tests ~0 sobre lógica de negocio | 🟡 Media | Mantenibilidad |
| A5 | Sin rate limiting ni idempotencia en endpoints de escritura | 🟡 Media | Robustez |

---

## 🔴 P0 — Seguridad crítica

### S1. Un vendedor puede autoconfirmar su pago e inflar su comisión

`supabase/migrations/20260616000000_baseline.sql:740-748`

```sql
CREATE POLICY pedidos_update_own ON public.pedidos FOR UPDATE TO authenticated
  USING (
    ... OR ((fn_get_user_role() = 'vendedor') AND (vendedor_id = auth.uid())
            AND (estado <> ALL (ARRAY['listo_despacho','despachado'])))
  );
```

La política no restringe **columnas** y no hay ningún trigger que valide `OLD` vs `NEW`
(el único `OLD.estado` en todo el esquema está en `baseline.sql:940`, para comisiones de aliado).
Con la anon key —que está en el bundle del navegador— un vendedor puede hacer:

```js
supabase.from('pedidos').update({ estado_pago: 'confirmado', total: 9999999 }).eq('id', suPedidoId)
```

`estado_pago = 'confirmado'` es exactamente lo que separa `montoGanado` de `montoBloqueado`
en `src/app/api/comisiones/preview/route.ts:650-655`, y `total` alimenta `base_calculo`.
Es fraude de comisiones directo, sin pasar por la app.

**Fix:** trigger `BEFORE UPDATE ON pedidos` que, cuando `fn_get_user_role() = 'vendedor'`,
rechace cambios en `estado_pago`, `total`, `subtotal_*`, `monto_descuento_compra`,
`pct_descuento_compra`, `numero_venta_cliente`, `vendedor_id` y `estado`. Los cambios
legítimos de estado pasan por RPC (`fn_confirmar_venta`, `fn_transicionar_pedido`).

### S2. Tres tablas sin RLS

`baseline.sql:600` lo documenta explícitamente:

```sql
-- Note: promociones, kits, kit_items do NOT have RLS enabled in production
```

En Supabase, una tabla del esquema `public` sin RLS queda expuesta por PostgREST al rol
`anon`. Cualquiera con la anon key (pública, va en el JS del navegador) puede **leer y
escribir** `promociones` — es decir, crear una promo "paga 1 lleva 100" sin autenticarse.

**Fix:** habilitar RLS + políticas (SELECT autenticado, INSERT/UPDATE/DELETE solo admin),
igual que el patrón de `productos`.

### S3. Endpoint de liquidación mensual abierto si falta la variable de entorno

`src/app/api/comisiones/liquidacion-mensual/route.ts:682-688`

```ts
const secret = process.env.CRON_SECRET
if (secret) {                                   // ← si no está definida, no valida nada
  if (req.headers.get("x-cron-secret") !== secret) return 401
}
```

Sin `CRON_SECRET`, cualquiera puede hacer POST y disparar `fn_liquidar_periodo_mensual`
para **todos los vendedores**. Es un endpoint que muta dinero y no verifica sesión.

**Fix:** invertir la lógica — si `CRON_SECRET` no está definida, responder 503. Añadir
además chequeo de rol admin como vía alternativa para disparo manual.

### S4. Desactivar un usuario no lo desconecta

`users.is_active` solo se escribe desde `/api/admin/usuarios` (PATCH). Nunca se lee:
ni en `src/lib/supabase/middleware.ts`, ni en `src/lib/auth/requireRole.ts`, ni en
ninguna política RLS. Un usuario "desactivado" conserva su sesión y sus permisos completos.

**Fix:** validar `is_active` en `requireRole` y en el middleware, incluirlo en
`fn_get_user_role()` (devolver `NULL` si está inactivo, lo que hace fallar todas las
políticas), y revocar la sesión con `admin.auth.admin.signOut(userId)` al desactivar.

---

## 🟠 P1 — Integridad de datos y concurrencia

### S5. Máquina de estados solo en el cliente

`src/lib/logistica/transitions.ts` define `STAGE_TRANSITIONS` y `getTransitions()`, pero
la base acepta cualquier valor del enum. Combinado con S1, un cliente puede saltar de
`confirmado` a `despachado` sin pasar por `fn_despachar_ruta` → **no se descuenta stock**,
no se generan remisiones ni movimientos de inventario.

**Fix:** llevar `STAGE_TRANSITIONS` a una tabla o a un `CHECK` en un trigger
`BEFORE UPDATE`, validando `(OLD.estado, NEW.estado, fn_get_user_role())`.

### S6. Secuencia de numeración escribible

`baseline.sql:729-730`

```sql
CREATE POLICY authenticated_rw_seq ON public.pedido_numero_seq FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

Cualquier autenticado puede reescribir `ultimo_numero` y provocar colisiones en el
`UNIQUE (numero_pedido)` — bloqueando la creación de pedidos para todo el equipo.
Lo mismo aplica a `ingreso_numero_seq`, `op_numero_seq`, `remision_numero_seq`
(`20260626_sprint_2a_01_schema.sql:271-273`).

**Fix:** `REVOKE ALL ... FROM authenticated` sobre las 4 tablas y dejar que solo las
funciones trigger (marcadas `SECURITY DEFINER`) las toquen. El `INSERT … ON CONFLICT
DO UPDATE … RETURNING` ya es atómico, el problema es solo el acceso directo.

### S7. Dashboards con service-role

`src/lib/dashboard/getDashboardStats.ts:243` y `:300`

```ts
export async function getLogisticaDashboardStats() {
  const supabase = createAdminClient();   // service role → bypass total de RLS
```

Aunque hoy el rol se resuelve antes en `dashboard/page.tsx:33`, es un patrón frágil:
cualquier refactor que exponga estas funciones por otra vía filtra datos globales.
El service-role key debe quedarse en las rutas `/api/admin/*` donde es imprescindible.

**Fix:** usar el cliente de sesión y arreglar las políticas RLS que hoy fuerzan el bypass
(logística ya puede leer pedidos confirmados; contable ya lee todo).

### S8. Comisiones — un permiso de más y uno de menos

`baseline.sql:813`: `com_aliado_select ... USING (true)` — cualquier autenticado
(incluido logística) lee todas las comisiones de aliados.

`baseline.sql:796-804`: `com_detalle_select` solo deja ver filas cuya `liquidacion_id`
apunte a una liquidación del propio vendedor. Las comisiones **provisionales** tienen
`liquidacion_id = NULL`, así que un vendedor **no puede ver sus propias comisiones del
mes en curso** — `rawComisiones` vuelve vacío en `/api/comisiones/preview` y el dashboard
de comisiones queda en blanco hasta la liquidación. Es un bug funcional, no solo de permisos.

**Fix:** añadir `OR (vendedor_id = auth.uid())` a `com_detalle_select`, y restringir
`com_aliado_select` a admin/contable.

### I1. `createOrder` no es transaccional

`src/lib/pedidos/createOrder.ts:71-131` — tres escrituras independientes desde el navegador:
`pedidos` → `detalle_pedido` → `pedido_mascotas`. Si la segunda falla (RLS, red, cierre de
pestaña), queda un pedido con `total` correcto y **cero líneas**, con su comisión provisional
ya creada por `trg_crear_comision_provisional`, contando además para
`numero_venta_cliente` de los pedidos siguientes de ese cliente. El `catch` de
`confirmarPedido` (línea 145) además traga el error de reserva de demanda.

**Fix:** RPC `fn_crear_pedido(p_cabecera jsonb, p_items jsonb, p_mascotas uuid[])` que haga
todo en una transacción, recalculando totales **en el servidor** (hoy los calcula el cliente
y los envía; ver S1).

### I2. `editar-productos`: borrado destructivo sin transacción

`src/app/api/logistica/editar-productos/route.ts:265-295`

```ts
await supabase.from("detalle_pedido").delete().eq("pedido_id", pedido_id);
// ← si el proceso muere aquí, el pedido pierde TODAS sus líneas
await supabase.from("detalle_pedido").insert(newLineas);
```

Sin transacción y sin control de concurrencia: dos usuarios editando el mismo pedido
producen pérdida silenciosa del trabajo del primero. No hay `updated_at` esperado ni
número de versión.

**Fix:** RPC transaccional + bloqueo optimista (`WHERE updated_at = p_updated_at_esperado`,
409 si no coincide).

### I3. Doble despacho de ruta

`src/app/api/despachar-ruta/route.ts:37-39` valida `ruta.estado === 'despachada'` en TS y
recién después llama a `fn_despachar_ruta`. `fn_despachar_ruta`
(`20260709150000_despacho_atomico.sql`) no bloquea la fila de `rutas` ni revalida el estado.
Dos clics simultáneos (o dos usuarios de logística) descuentan el stock dos veces.

**Fix:** mover la validación dentro de la función, con
`SELECT ... FROM rutas WHERE id = p_ruta_id FOR UPDATE` y `RAISE EXCEPTION` si ya está
despachada. Las RPC de producción ya usan este patrón correctamente
(`20260702_sprint_2c_01_rpc.sql:141`, `20260724020000_ordenes_multi_pt.sql:253-259`).

---

## 🔴 P2 — Escalabilidad

### E1. Faltan índices en todo el módulo de ventas

`20260616000000_baseline.sql` crea 28 tablas y **cero índices**. Los únicos dos del módulo
de ventas se agregaron en el parche P0 (`idx_clientes_creado_por`, `idx_pedidos_vendedor_id`).
Todo el resto de índices del proyecto (51) pertenece a inventario.

En Postgres las claves foráneas **no** crean índice. Consecuencias medibles hoy:

| Falta | Impacto |
|-------|---------|
| `detalle_pedido(pedido_id)` | Seq scan completo cada vez que se abre un pedido, se despacha una ruta o se edita un pedido. Es la tabla que más crece. |
| `pedidos(cliente_id)` | La política `clientes_select_auth` hace `EXISTS (SELECT 1 FROM pedidos WHERE cliente_id = …)` **por cada fila de clientes**. El trigger `fn_calcular_numero_venta_cliente` hace lo mismo en cada alta de pedido. |
| `pedidos(estado)`, `pedidos(estado_pago)`, `pedidos(created_at DESC)` | Todos los dashboards y el Kanban filtran por ahí. |
| `comisiones_detalle(vendedor_id, periodo_mes)` | Filtro exacto de `/api/comisiones/preview` y de las dos RPC de comisiones. |
| `comisiones_detalle(liquidacion_id)` | `com_detalle_select` y el dashboard contable. |
| `pedido_ruta(pedido_id)` | El `UNIQUE (ruta_id, pedido_id)` cubre `ruta_id`, no `pedido_id`. |
| `pedido_actividad(pedido_id, created_at DESC)`, `mascotas(cliente_id)`, `pedido_mascotas(pedido_id)`, `leads_meta_ads(vendedor_id, periodo_mes)`, `detalle_pedido(producto_id)` | Ídem. |

Con RLS activo el costo se multiplica: cada política que hace `EXISTS` sobre una tabla sin
índice convierte una consulta lineal en cuadrática.

### E2. Consultas sin cota

`src/app/(dashboard)/ventas/page.tsx:143-148` — el peor caso, **sin filtro de fecha ni límite**:

```ts
supabase.from("pedidos")
  .select("fuente, total, aliado_id, aliados(nombre)")
  .in("fuente", ["referido_veterinario", "referido_entrenador"])
  .not("aliado_id", "is", null)
```

Trae todo el histórico de pedidos referidos en cada carga de `/ventas`, y luego lo agrega
en JS con un `.find()` anidado dentro del bucle (`ventas/page.tsx:186-196`) → **O(n²)**.

Otras del mismo tipo:

- `ventas/page.tsx:126-133` — `pedidos` y `comisiones_detalle` del mes completos, para sumar.
- `ventas/page.tsx:137-141` — `count` de cierres Meta Ads sobre **todo el histórico**, no del período.
- `getDashboardStats.ts:65-67` — `v_valor_inventario`, `v_stock_insumos`, `v_stock_productos` completas, agregadas en JS.
- `getDashboardStats.ts:317-321` — todas las `comisiones_detalle` sin liquidar, para sumarlas.
- `getDashboardStats.ts:38-42` — todos los `total` del día, para sumarlos.

**Fix:** mover cada agregación a una RPC/vista con `SUM()`/`COUNT()` en SQL (ya existe el
patrón: `fn_pedidos_estado_counts`, `fn_top_productos_vendidos`, `20260710160000_ventas_stats_agregadas.sql`).
Añadir siempre filtro de período.

### E3. Búsquedas sin índice

Ocho búsquedas `ILIKE '%…%'` (`clientes/page.tsx:124`, `ClientSelector.tsx:114`,
`ProductSearchBox.tsx:487`, `catalogo/page.tsx:193`, `pedidos/page.tsx:111`,
`insumos/page.tsx:121`, `TrazabilidadPanel.tsx:31`). Con comodín inicial, ningún B-tree
sirve: es seq scan siempre.

**Fix:** `CREATE EXTENSION pg_trgm` + índices GIN `gin_trgm_ops` sobre
`clientes(nombre_completo)`, `clientes(celular)`, `productos(nombre)`, `productos(sku)`,
`insumos(nombre)`.

### E4. Paginación inconsistente

Solo 7 de ~40 listados usan `.range()`. El Kanban de logística (`logistica/page.tsx:407`)
usa `.limit(30)` sin paginación —silenciosamente oculta pedidos cuando la operación crece—
y varios usan `.limit(100)` como tope duro (`inventario/produccion/page.tsx:69`,
`inventario/explosion/page.tsx:70`).

---

## 🟡 P3 — Arquitectura y mantenibilidad

### A1. `useAuth` sin contexto compartido

`src/hooks/useAuth.ts` hace `auth.getUser()` + `SELECT role FROM users` en cada montaje.
Lo consumen 23 archivos, varios simultáneos en la misma pantalla (`app-sidebar` + página +
diálogos) → 3-5 round-trips redundantes por navegación, y otra tanda en cada
`onAuthStateChange` (que dispara también en el refresh de token, cada hora).

**Fix:** `AuthProvider` con React Context en `(dashboard)/layout.tsx`, alimentado por el
perfil ya resuelto en el servidor.

### A2. Guardas de rol server-side incompletas

Solo `admin/layout.tsx` e `inventario/layout.tsx` llaman a `requireRole`. `/comisiones`,
`/logistica`, `/ventas`, `/pedidos`, `/clientes`, `/catalogo` no tienen guarda: la
navegación se oculta en el sidebar (cliente) y el resto depende de RLS. Funciona, pero un
usuario de logística que escriba `/comisiones` en la barra de direcciones carga la página
completa; lo que ve depende enteramente de que cada política esté bien — y S8 muestra que
no siempre lo están.

### A3. Inyección de filtros PostgREST

`clientes/page.tsx:124`, `ClientSelector.tsx:114`, `pedidos/page.tsx:111`,
`TrazabilidadPanel.tsx:31` interpolan el término de búsqueda crudo en `.or("...")`.
Los caracteres `,`, `.`, `(`, `)` son sintaxis de PostgREST: un término como
`x,is_active.eq.false` reescribe el filtro. No cruza RLS —no es escalada de privilegios—
pero sí ensancha resultados dentro del alcance del rol y produce errores 400 con nombres
de clientes que lleven paréntesis o comas.

**Fix:** sanitizar (`term.replace(/[,().*:]/g, " ")`) o migrar a `textSearch` / una RPC de búsqueda.

### A4. Calidad de código

- **79 errores de ESLint**, mayoría `react-hooks/set-state-in-effect` (cascadas de render) y `@typescript-eslint/no-floating-promises` (errores async tragados).
- **37 `as unknown as`** — casts que anulan la verificación de tipos justo en el borde de los datos, que es donde importa.
- **Cobertura de tests ≈ 0** sobre lógica de negocio: los 11 tests cubren solo `discounts.ts` y `commissions.ts`. Cero tests sobre RLS, RPC de inventario, transiciones o creación de pedidos.
- **Componentes de 600-800 líneas** (`catalogo/page.tsx` 816, `clientes/[id]/page.tsx` 795, `produccion/[id]/page.tsx` 759) mezclando fetch, estado y render.

### A5. Sin rate limiting ni idempotencia

Ningún endpoint de `/api` limita frecuencia ni acepta clave de idempotencia. `/api/comisiones/liquidar`
y `/api/despachar-ruta` son especialmente sensibles: mutan dinero e inventario y son
reintentables desde el navegador con un doble clic.

---

## Plan de ejecución

### Fase 1 — Cerrar el fraude y la exposición (1-2 días) 🔴

Todo en una migración `20260730000000_p0_hardening.sql` + cambios puntuales de código.

1. **S2** — RLS + políticas en `promociones`, `kits`, `kit_items`.
2. **S1** — Trigger `fn_guard_pedido_update()` que bloquee la mutación de columnas financieras y de estado por parte de vendedores.
3. **S6** — `REVOKE` sobre las 4 tablas `*_numero_seq`; marcar `SECURITY DEFINER` las funciones que las usan.
4. **S3** — Invertir el guard de `CRON_SECRET` (503 si falta) + permitir disparo manual solo a admin.
5. **S4** — `is_active` en `fn_get_user_role()`, en `requireRole` y en el middleware; `signOut` al desactivar.
6. **S8** — `OR vendedor_id = auth.uid()` en `com_detalle_select`; restringir `com_aliado_select`.

**Verificación:** script de pruebas RLS con un usuario por rol que intente cada operación prohibida.

### Fase 2 — Índices y agregaciones (1 día) 🔴

Migración `20260730010000_indices_ventas.sql` con `CREATE INDEX CONCURRENTLY` (fuera de
transacción) para los 12 índices de E1, más `pg_trgm` y los GIN de E3.

Luego: sustituir las 6 consultas sin cota de E2 por RPC agregadas. Es el cambio con mejor
relación esfuerzo/impacto de toda la auditoría — la app pasa de degradarse linealmente con
el histórico a tener costo constante en los dashboards.

**Verificación:** `EXPLAIN ANALYZE` antes/después sobre las 5 consultas más calientes;
`get_advisors` de Supabase tras la migración.

### Fase 3 — Transaccionalidad (2-3 días) 🟠

1. **I1** — RPC `fn_crear_pedido`, con cálculo de totales del lado servidor. `createOrder.ts` pasa a ser un wrapper delgado.
2. **I2** — RPC `fn_editar_lineas_pedido` con bloqueo optimista; el endpoint devuelve 409 en conflicto.
3. **I3** — `FOR UPDATE` + revalidación de estado dentro de `fn_despachar_ruta`.
4. **S5** — Trigger de validación de transiciones de estado, derivado de `STAGE_TRANSITIONS`.
5. **S7** — Quitar `createAdminClient` de `getDashboardStats.ts`, ajustando las políticas necesarias.

**Verificación:** tests de integración contra una instancia Supabase local (`supabase start`),
incluyendo el caso de dos escrituras concurrentes.

### Fase 4 — Preparar la operación multiusuario (3-4 días) 🟡

1. **A1** — `AuthProvider` + eliminar los 23 fetches redundantes de rol.
2. **A2** — `requireRole` en los layouts de `comisiones`, `logistica`, `ventas`, `pedidos`.
3. **A3** — Helper `sanitizeSearchTerm()` en `src/lib/utils.ts`, aplicado en los 4 puntos.
4. **E4** — Paginación real en el Kanban y en los listados con `.limit()` duro.
5. **A5** — Rate limiting en `/api` (middleware propio o Upstash) + clave de idempotencia en `liquidar` y `despachar-ruta`.

### Fase 5 — Sostenibilidad (continuo) 🟡

1. **A4** — Bajar ESLint a cero errores; empezar por `no-floating-promises` (esconde fallos reales de red).
2. Tests de integración por módulo, priorizando comisiones e inventario.
3. Extraer el fetching de los componentes de +500 líneas a hooks (`useCatalogo`, `useClienteDetalle`, …).
4. Reemplazar los `as unknown as` por tipos generados de Supabase con relaciones anidadas.

---

## Notas

- El proyecto ya tiene los **patrones correctos** para casi todo lo señalado: `FOR UPDATE` en las RPC de producción, RPC agregadas en `20260710160000_ventas_stats_agregadas.sql`, guardas de rol en `requireRole.ts`, índices completos en inventario. El problema es que el módulo de ventas —el más antiguo y el que más crece— quedó fuera de esas mejoras.
- Las cabeceras de seguridad de `next.config.ts` están bien planteadas. El `'unsafe-eval'` del CSP se puede quitar en producción (solo lo necesita el dev server de Next).
- No hay secretos en el repositorio: `.gitignore:34` cubre `.env*` y solo `.env.example` está versionado.
