# Amatu ERP Design Pillars

## 1. Visual Identity & Colors
The Amatu ERP brand is defined by a sophisticated yet energetic palette:

- **Primary Purple (#6F39BC):** The anchor of the brand. Represents luxury, quality, and authority. Used for primary buttons, sidebar, and key navigation elements.
- **Secondary Yellow (#FFCE00):** The energy. Used for accents, highlights, warnings, and to bring life to the interface.
- **Background White (#FFFFFF):** The canvas. Ensures extreme clarity and professional focus.

## 2. Typography
A unified font strategy for a modern and clean look:

- **Primary Font (Plus Jakarta Sans):** A modern, geometric font that balances character with extreme legibility. Used for all titles, body copy, and UI elements.

## 3. Visual Language & Shapes
- **Roundness:** A consistent base radius (0.5rem) is applied to cards and inputs to balance modern precision with approachability.
- **Shadows:** Use soft, ambient shadows instead of borders to define depth. Hierarchy is created through tonal layering.
- **Whitespace:** "Over-padding" is a feature. Every component should have room to breathe, avoiding the cramped feel of traditional ERPs.

## 4. Design Principles
- **Modern Heritage:** Blending high-end enterprise precision with the warmth of premium pet care.
- **Quiet Luxury:** Avoiding visual noise. If you think you need a divider, try using more whitespace first.
- **Data Vibrancy:** Let the numbers stand out through size contrast and the judicious use of the secondary yellow.

## 5. Implementation (Tailwind)
```css
--primary: #6F39BC;
--secondary: #FFCE00;
--background: #ffffff;
```
Always use semantic tokens (`bg-primary`, `text-primary-foreground`, etc.) to ensure consistency across the application.

Además de los tokens de marca, existen tokens de **estado** para significados que se repiten en toda la app
(éxito/pendiente/info), definidos en `globals.css` y expuestos vía Tailwind:

- `bg-success` / `text-success` / `border-success` — pago confirmado, comisión ganada/liquidada, descuento aplicado.
- `bg-warning` / `text-warning` / `border-warning` — pago pendiente, comisión bloqueada, alertas no críticas.
- `bg-info` / `text-info` / `border-info` — notas informativas (p. ej. notas de despacho), estados neutrales de progreso.
- `bg-destructive` / `text-destructive` — errores, acciones irreversibles, contraentrega.

Usar siempre estos tokens (con opacidad vía `/10`, `/20`, etc. para fondos suaves) en vez de paleta Tailwind
cruda (`emerald-*`, `amber-*`, `blue-*`, `red-*`) cuando el color representa uno de estos significados. Paletas
crudas siguen siendo aceptables para categorías sin semántica de estado (p. ej. franjas horarias, badges de rol,
tags como "Magistral").

## 6. Escala de componentes

### Tamaños de `Button` (`src/components/ui/button.tsx`)
La escala ya existe completa vía `cva` (`default | sm | lg | xs` + `icon | icon-sm | icon-lg | icon-xs`). Guía de uso:

| Tamaño | Cuándo usarlo |
|---|---|
| `default` | Acción primaria de un formulario o card (Guardar, Crear, Confirmar). |
| `sm` | Acciones secundarias en toolbars, filas de tabla, o botones agrupados junto a un `default`. |
| `lg` | CTAs de pantalla completa — poco frecuente, reservado a momentos como "Confirmar Pedido" en `OrderSummaryCard.tsx`. |
| `xs` | Controles muy compactos dentro de listas densas (raramente necesario; preferir `sm` salvo espacio muy limitado). |
| `icon` | Botón de icono estándar (header, toolbar). |
| `icon-sm` | Botón de icono dentro de filas de tabla o listas densas. |
| `icon-lg` | Icono como acción principal aislada (poco común). |

No crear nuevos tamaños — la escala existente cubre todos los casos; el problema histórico fue adopción
dispar, no falta de opciones.

### Ancho de `Dialog` / `Sheet`
Los diálogos y paneles laterales se agrupan en 4 intenciones de ancho. Elegir según el contenido, no copiar
el ancho de un componente similar sin pensarlo:

| Intención | Ancho sugerido | Ejemplo |
|---|---|---|
| Confirmación pequeña | `380–440px` (`max-w-sm`) | `DeleteConfirmDialog`, `BolsasPopup`, confirmaciones inline. |
| Formulario mediano | `480–640px` (`sm:max-w-[640px]` o `Sheet` `sm:max-w-xl`) | `OrderEditDialog`, `CreateRutaDialog`, `AliadoFormDialog`, `KitFormDialog`. |
| Formulario largo con scroll | `max-w-2xl` con `overflow-y-auto` | `RecetaFormDialog`, `CompletarOrdenDialog`, `EmpacarLoteDialog`, `EditProductosDialog` (paso editor). |
| Panel completo (página) | N/A — usar una ruta dedicada, no un `Dialog`/`Sheet` | Cockpit de pedido (`/logistica/pedido/[id]`), antes `TaskCardDialog`. |

Los formularios medianos/largos con scroll usan `Sheet` (lateral derecho) desde P2.1.b — solo confirmaciones
pequeñas y el cockpit de pedido quedan fuera de ese patrón (el primero porque su tamaño ya es apropiado como
`Dialog`, el segundo porque pasó a ser página completa). Esta guía aplica a **diálogos nuevos**; no es
necesario migrar retroactivamente los que ya caen naturalmente en estos rangos.
