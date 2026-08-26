# Migración dev → producción · Amatu ERP

**Fecha:** 2026-08-20
**Origen (dev):** `jhznkgqnqulsesqcyszr` — PostgreSQL 17.6
**Destino (prod):** `jpdospwrcrbbwiwbedya`

> ⚠️ **Esta migración es destructiva.** Borra por completo el schema `public`
> de producción y lo reconstruye desde dev. Acordado: los datos actuales de
> prod son descartables. Los usuarios de **Supabase Auth se conservan**
> (`auth` y `storage` no se tocan).

---

## Por qué este método

El historial en `supabase/migrations/` **está desactualizado**: la última
migración es del 12-ago y no contiene `desperdicios`, `donaciones`,
`insumo_sobrante`, `insumo_sobrante_aplicacion`, `notificaciones`,
`user_permisos` ni `config_produccion`. Replicar ese historial **no**
reproduce el estado actual de dev.

Por eso la fuente de verdad es un `pg_dump` en vivo de dev, no el repo.

Se generó con **pg_dump nativo (18.4)** y no `supabase db dump`, porque este
último ejecuta pg_dump dentro de Docker y en esta máquina Docker no está
levantado. pg_dump 18 contra un servidor 17.6 es una combinación soportada.

Los 4 archivos de esta carpeta están pensados para **pegar en el SQL Editor
de Supabase**, uno por uno, en orden — no requieren psql ni la terminal.

---

## Lo que hay en esta carpeta

| Archivo | Qué es | Quién lo genera |
|---|---|---|
| `00_reset_prod.sql` | Borra y recrea `public`, permisos por defecto y extensiones | ya está |
| `01_schema_dev.sql` | Dump del schema de dev (63 tablas, 12 vistas, 81 funciones, 193 policies, 21 triggers) | ✅ **ya generado** (2026-08-20, 374 KB) |
| `02_seed_config.sql` | Datos de configuración sin los que la app no opera | ya está |
| `03_post_migracion.sql` | Trigger de `auth.users`, repoblado de perfiles, grants y verificación | ya está |
| `_referencia_schema_dev.sql` | Solo lectura: tablas/enums/constraints en formato legible, para consulta | ya está |

---

## Paso 0 — Respaldo de producción (opcional pero recomendado)

Aunque los datos sean descartables, no cuesta nada tener un respaldo. Desde
el dashboard de prod: **Database → Backups**, o si prefieres un dump manual,
pide la URI de conexión y lo genero por consola — pero como vas a trabajar
todo desde el SQL Editor, esto es lo único que seguiría necesitando la
terminal. Si lo saltas, no bloquea nada de lo que sigue.

## Paso 1 — Abrir el SQL Editor de producción

Dashboard del proyecto `jpdospwrcrbbwiwbedya` → **SQL Editor** → **New query**.
Vas a pegar y ejecutar (▶ Run) los 4 archivos de esta carpeta, **uno por uno,
en este orden exacto**, esperando a que cada uno termine sin errores antes de
pasar al siguiente:

1. `00_reset_prod.sql`
2. `01_schema_dev.sql`
3. `02_seed_config.sql`
4. `03_post_migracion.sql`

Abre cada archivo en tu editor, copia **todo el contenido** (Ctrl+A, Ctrl+C),
pégalo en una query nueva del SQL Editor y presiona Run. `01_schema_dev.sql`
son ~10.900 líneas — el editor lo acepta sin problema, solo tarda unos
segundos más en pegar y en ejecutar.

## Paso 2 — El schema de dev ✅ YA GENERADO

`01_schema_dev.sql` ya está listo (2026-08-20, ~376 KB) y verificado contra
dev: 63 tablas, 12 vistas, 27 enums, 81 funciones, 193 policies, 21 triggers,
100 índices, 63 `ENABLE ROW LEVEL SECURITY`. Coincide exactamente.

Ya está **limpio para pegar en el SQL Editor**: le quité las líneas
`\restrict`/`\unrestrict` que trae `pg_dump` (son meta-comandos exclusivos de
`psql`; si quedaran, el editor tiraría error de sintaxis en la primera línea)
y lo envolví en `BEGIN;`/`COMMIT;` para que, si algo falla a mitad de camino,
se revierta solo en vez de dejar objetos a medias.

Solo hace falta **regenerarlo si dev cambia** antes de migrar. Como ya no vas
a usar la consola para aplicar la migración, pídeme que lo regenere yo cuando
haga falta — vuelvo a correr el `pg_dump` (necesito la URI de dev) y repito
esta misma limpieza.

## Paso 3 — Aplicar en producción

Sigue el orden del Paso 1: `00` → `01` → `02` → `03`, cada uno en el SQL
Editor. Si alguno da error, **detente ahí** y no sigas con el siguiente —
dime el error exacto. Como `00` borra y recrea `public` por completo, si
necesitas reintentar cualquier paso, siempre puedes volver a correr `00` para
dejar todo limpio y empezar de nuevo desde `01`.

## Paso 4 — Designar un admin

`03_post_migracion.sql` deja a todos los usuarios como `vendedor`. Sin un
admin nadie puede crear usuarios ni tocar catálogo. En el SQL Editor de prod:

```sql
UPDATE public.users u
SET role = 'admin'::public.user_role
FROM auth.users au
WHERE au.id = u.id AND au.email = 'TU_CORREO_ADMIN@amatu.co';
```

## Paso 5 — Verificar

`03_post_migracion.sql` termina con un bloque de consultas de verificación.
Vuelve a correrlas y compara:

| Métrica | Esperado |
|---|---|
| tablas | 63 |
| vistas | 12 |
| enums | 27 |
| funciones de negocio | 81 |
| policies RLS | 193 |
| triggers en `public` | 21 |
| tablas sin RLS | **0 filas** |
| trigger en `auth.users` | 1 |
| transiciones / zonas / categorías / reglas / pesos / config_prod | 21 / 4 / 5 / 6 / 9 / 1 |
| perfiles vs usuarios de Auth | iguales, y ≥1 admin |

Y en la app: entrar, crear un cliente, crear un pedido y moverlo de
`fecha_tentativa` a `confirmado`. Ese último paso es el que valida que
`pedido_transiciones` quedó bien cargada.

---

## Pendientes y avisos

### 1. `config_comisiones` está vacía en dev
0 filas. Consecuencia: `fn_estimar_comisiones_periodo` devolverá **0%** en
todas las ventas, con la razón *"Porcentaje 0% en rango de cierre actual"*.
El módulo de comisiones arranca pero no calcula nada. Hay una plantilla
comentada al final de `02_seed_config.sql`.

### 2. Bug preexistente en dev: `fn_completar_item_produccion`
La sobrecarga de 3 argumentos `(p_item_id, p_cantidad_producida, p_motivo)`
hace `UPDATE orden_produccion_items SET ... motivo_diferencia = ...`, pero
esa columna **no existe**: se llama `motivo_parcial`.

Cualquier llamada a esa versión falla con *column "motivo_diferencia" does
not exist*. Además convive con una sobrecarga vieja de 2 argumentos, así que
una llamada con solo dos parámetros resuelve silenciosamente a la versión
antigua (sin lógica de parciales ni de reposición automática).

Este script **replica dev tal cual**, así que el bug viaja a producción. No
lo corregí porque cambiar la firma o la columna es una decisión de producto:
o se renombra la columna a `motivo_diferencia`, o se corrige la función a
`motivo_parcial`, y hay que decidir también si se elimina la sobrecarga de 2
argumentos. Dime cuál prefieres y lo dejo arreglado antes de migrar.

### 3. Catálogo y maestros de inventario
El dump es **schema-only**, así que prod queda sin productos, variantes,
insumos ni recetas. Dev tiene poco y parece de prueba (5 productos, 14
variantes, 5 insumos, 2 recetas). Opciones:

- **Cargarlos a mano en prod** desde la UI de Admin (recomendado si el
  catálogo real difiere del de pruebas).
- **Copiarlos de dev**, si el catálogo de dev ya es el bueno: dime y te genero
  un `04_catalogo_dev.sql` con los `INSERT` de productos/variantes/insumos/
  recetas, listo para pegar en el SQL Editor igual que los demás archivos.
  Los UUID de `categorias_producto` y `zonas_envio` en `02_seed_config.sql`
  son idénticos a los de dev justamente para que esto importe sin remapear.

### 4. Tablas ajenas al ERP que también viajan
`documents`, `prompt`, `ai_memory` y `precios_productos` no las usa el
frontend (son del asistente/bot). Van incluidas porque están en `public` en
dev y hay objetos que dependen de ellas (`match_documents`,
`normalizar_texto`, el índice `precios_productos_normalizado_unique`). Si
quieres dejarlas fuera de prod hay que quitar también esas funciones e
índices — dime y preparo la variante.

### 5. Variables de entorno
Verifica que el deploy de producción apunte a prod y no a dev:
`NEXT_PUBLIC_SUPABASE_URL` debe ser `https://jpdospwrcrbbwiwbedya.supabase.co`.
