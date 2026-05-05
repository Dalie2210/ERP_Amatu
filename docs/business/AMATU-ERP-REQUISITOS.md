# 📋 AMATU ERP — Documento Maestro de Requisitos de Negocio
> Última actualización: 2026-05-05 | Fase 1 + Comisiones

---

## 1. Catálogo de Productos

### 1.1 Tipos de Productos
- **Dietas individuales:** Producto estándar con variantes de tamaño.
- **Kits:** Bundles de dietas + snacks con un SKU propio y descuento especial incluido en el precio del kit.
- **Snacks:** Sin variantes de tamaño ni precio.
- **Dietas Magistrales:** Producto personalizado generado por pedido. Se guarda en el catálogo bajo la categoría `magistral`, nombrado típicamente con el nombre del perro, tipo de dieta y presentación. Puede reutilizarse en pedidos futuros del mismo cliente.
- **Accesorios Pet:**
  - Moldes de silicona (precio único, varía según cotización del mercado/dólar — actualizable por admin).
  - Bolsas compostables de popó (precio por volumen, ver tabla 1.3).

### 1.2 Variantes de Producto
- **Dietas individuales y Kits:** Tienen variantes de tamaño con precios diferentes:
  - 300g
  - 400g *(solo aplica para la dieta Senior-Light Pollo)*
  - 500g
  - 1200g
- **Snacks:** Sin variantes.
- **Accesorios:** Sin variantes de tamaño.

### 1.3 Precios — Bolsas Compostables (Escala por Volumen)
| Cantidad     | Precio Lista | Precio Con Descuento |
|--------------|-------------|----------------------|
| 1 rollo      | $6.900      | $6.900 (sin dcto)    |
| 3 rollos     | $20.700     | $16.500              |
| 6 rollos     | $41.400     | $32.650              |
| 10 rollos    | $69.000     | $54.400              |

> El descuento aplica desde 3 rollos en adelante. El sistema debe calcular automáticamente el precio correcto según la cantidad seleccionada.

### 1.4 Precios — Dietas Magistrales
El precio de una dieta magistral se calcula así:
- Se determina el tramo de tamaño por el gramaje solicitado:
  - Gramaje < 300g → precio/gramo de la presentación de 300g.
  - Gramaje entre 300g y 500g → precio/gramo de la presentación de 500g.
  - Gramaje entre 500g y 1200g → precio/gramo de la presentación de 1200g.
- Fórmula: `(precio_por_gramo × gramaje) × 1.03` *(+3% por personalización)*
- **Excepción:** En aproximadamente 1 de cada 10 casos, la mixtura puede ser muy diferente y justifica un ajuste manual del precio/gramo. Un admin puede sobreescribir el precio calculado con justificación registrada.

### 1.5 Lista de Precios
- **Precio público:** Precio estándar al consumidor final.
- **Precio distribuidor:** Se aplica un porcentaje de descuento sobre el precio público. Actualmente gestionado con un archivo separado; en el ERP, el admin configurará el % de descuento para distribuidores en el catálogo o por cliente.

### 1.6 Stock
- En Fase 1 **no** se implementa control de inventario en tiempo real.
- La arquitectura de base de datos debe prever la futura adición de un módulo de inventario (campo `stock_actual` y tabla de movimientos de inventario en futuras fases).

### 1.7 Unidad de Medida
- Todos los productos se venden por **unidad**.

---

## 2. Clientes

### 2.1 Identificación del Cliente
- Cada cliente tiene un **código de cliente único** generado automáticamente por el sistema.
- No pueden existir clientes duplicados.

### 2.2 Datos Requeridos del Cliente
| Campo                          | Tipo       | Notas                                      |
|-------------------------------|------------|--------------------------------------------|
| Nombre completo               | Texto      | Obligatorio                                |
| Tipo de documento             | Select     | CC / CE / NIT / Pasaporte                  |
| Número de documento           | Texto      | Obligatorio, único                         |
| Celular                       | Texto      | Obligatorio                                |
| Correo electrónico            | Email      | Opcional                                   |
| Dirección                     | Texto      | Obligatorio                                |
| Conjunto/Indicaciones entrega | Texto      | Nombre del edificio, torre, apto, etc.     |
| Barrio / Ciudad / Zona        | Select/Text| Relacionado con tarifas de envío           |
| Fuente (cómo nos conoció)     | Select     | Ver tabla de fuentes en sección 5.3        |

### 2.3 Mascotas del Cliente
Cada cliente puede tener una o más mascotas registradas:
| Campo              | Tipo   |
|--------------------|--------|
| Nombre de la mascota | Texto |
| Especie / Raza     | Texto  |
| Peso (kg)          | Número |
| Edad               | Número |
| Necesidad / Dolor del cliente | Texto (razón de compra) |

### 2.4 Historial de Compras y Conteo de Ventas
- El número de venta de un cliente (`venta #1`, `#2`, `#3`...) se cuenta por **cliente**, sin importar qué vendedor lo atendió.
- Este conteo **nunca se reinicia**, incluso si el cliente lleva años inactivo.

---

## 3. Reglas de Descuento

### 3.1 Principio General
- Todos los precios parten del **precio full (sin descuento)**.
- Los descuentos son adicionales y se aplican automáticamente según el monto del pedido.
- Los vendedores **no pueden** ofrecer descuentos no configurados por un admin.

### 3.2 Descuentos por Monto del Pedido (Tabla 2026)
| Monto del Pedido (subtotal alimento) | Descuento en Compra | Descuento en Envío |
|--------------------------------------|---------------------|--------------------|
| Cualquier monto                      | 0%                  | $0                 |
| > $280.000                           | 0%                  | -$7.000 en envío   |
| ≥ $495.000                           | 5%                  | -$7.000 en envío   |
| ≥ $825.000                           | 7%                  | -$7.000 en envío   |
| ≥ $1.518.000                         | 9%                  | -$7.000 en envío   |
| ≥ $1.837.000                         | 10%                 | -$7.000 en envío   |

**Reglas de aplicación:**
- Los descuentos de compra (5%, 7%, 9%, 10%) aplican solo a **alimentos** (dietas), no a snacks, accesorios ni envío.
- Los descuentos son **mutuamente excluyentes por tramo** — se aplica el mayor que aplique.
- El descuento de envío de `-$7.000` es acumulable con el descuento de compra.
- Los descuentos de 5%+ son "válidos para pago de mes adelantado" pero en el sistema funcionan como **umbral automático por monto**.

### 3.3 Descuento de Distribuidor
- Los clientes tipo "distribuidor" tienen una lista de precios especial.
- En el ERP, el admin configura el `% de descuento distribuidor` aplicable sobre el precio público.
- Las ventas de distribuidores **no comisionan** (ver sección 5.7).

---

## 4. Costo del Envío

### 4.1 Principio de la Liquidación de Envío
- El sistema registra dos valores de envío:
  1. **Cobrado al cliente** (ver tabla por zonas).
  2. **Pagado al mensajero** (igual a cobrado al cliente como base, con posibles ajustes manuales).
- La diferencia entre ambos se registra para reportes internos de logística.
- La liquidación de cada mensajero se hace **diariamente**.

### 4.2 Tarifas de Envío Cobradas al Cliente (por Zona)
| Zona                                          | Tarifa Cliente |
|-----------------------------------------------|---------------|
| Bogotá                                        | $12.000       |
| Soacha, Arborizadora, Ciudadela Colsubsidio   | $13.500       |
| Cajicá, Chía, Madrid, Mosquera, Cota, La Calera | $31.300    |
| Tocancipá, Zipaquirá                          | $37.100       |

- El descuento de `-$7.000 en envío` se aplica al valor cobrado al cliente cuando el pedido supera $280.000.

### 4.3 Ajustes Manuales al Pago del Mensajero
- En casos excepcionales pueden generarse cobros adicionales para el mensajero:
  - Tiempo de espera.
  - Cambio de dirección.
- Estos ajustes se registran manualmente en la liquidación diaria del mensajero.

### 4.4 Quién Asume el Envío
- El costo de envío lo paga el **cliente**.
- Los mensajeros son **contratistas** de Amatu (prestación de servicios, no empleados de planta).
- Todas las zonas listadas son entregadas por mensajeros propios de Amatu.
- **Excepción rara** (~2 veces por semestre): Productos sin refrigeración (snacks deshidratados, bolsas, moldes) enviados a otras ciudades se despachan por transportadora externa. Esto no requiere flujo logístico especial en Fase 1.

---

## 5. Motor de Comisiones

### 5.1 Regla General: Venta #1 = 0% Comisión
- La primera compra de cualquier cliente **no genera comisión** para el vendedor.
- Excepción: Si la **fuente** de esa venta #1 es `"Referido"` (cualquier tipo), comisiona como si fuera venta #2 (5% mínimo según tabla).
- El cliente nunca se reinicia como "nuevo".

### 5.2 Tabla de Comisiones por % de Cierre Meta Ads (Ventas #2 a #6)
El porcentaje de comisión depende de:
1. El **número de venta del cliente** (conteo global del cliente).
2. El **% de cierre de Meta Ads del vendedor en el mes** = `cierres Meta Ads del mes / Leads venta #1 Meta Ads del mes`.

| % Cierre Meta Ads | Venta #2 | Venta #3 | Venta #4 | Venta #5 | Venta #6 |
|-------------------|----------|----------|----------|----------|----------|
| 0% – 2.9%         | 5%       | 8%       | 0%       | 0%       | 0%       |
| 3% – 3.9%         | 10%      | 18%      | 10%      | 0%       | 0%       |
| 4% – 5.5%         | 15%      | 25%      | 15%      | 15%      | 0%       |
| 5.6% – 8%         | 18%      | 30%      | 18%      | 18%      | 18%      |

### 5.3 Fuentes de Cliente y su Impacto en Comisiones
| Fuente              | Sub-tipo (para análisis interno) | Comisión venta #1 | Sigue tabla #2-#6 |
|---------------------|----------------------------------|-------------------|-------------------|
| Meta Ads            | —                                | 0%                | ✅ Sí             |
| Referido - Cliente  | `referido_cliente`               | 5% (como #2)      | ✅ Sí             |
| Referido - Veterinario | `referido_veterinario`        | 5% (como #2)      | ✅ Sí             |
| Referido - Entrenador Canino | `referido_entrenador`   | 5% (como #2)      | ✅ Sí             |
| Distribuidor        | —                                | 0%                | ❌ No comisiona   |
| Otro                | —                                | Según tabla       | ✅ Sí (si la tabla lo permite), no cuenta para cierre Meta |

> **Nota:** Para las comisiones del equipo de ventas, cualquier fuente con prefijo `"referido"` aplica como #2. Internamente el subtipo se conserva para análisis de adquisición y seguimiento de veterinarios.

### 5.4 Venta #7 en Adelante ("Cliente Fidelizado")
- Desde la venta #7, el cliente es considerado fidelizado y **no genera comisión** para el vendedor.

### 5.5 Base de Cálculo de la Comisión
`Base = (Total de la orden − costo de envío) × 0.95`
Es decir: **total del pedido sin envío, menos el 5% de IVA**.

### 5.6 Bloqueo y Liquidación de Comisiones
- La comisión de un pedido se **bloquea** (queda pendiente) hasta que se **confirme el pago del cliente**.
- La liquidación es **mensual**, pero el sistema debe mostrar desglose por pedido de cuánto aportó cada venta.
- El % de cierre de Meta Ads se calcula **en tiempo real** con los datos acumulados del mes en curso.

### 5.7 Registro de Leads de Meta Ads para Cálculo de Cierre
- Los leads de Meta Ads se registran **manualmente en el ERP** a través de un módulo específico.
- Cada registro incluye: Fecha, Fuente (`Meta Ads`), Stage, y si se convirtió en venta #1.
- El sistema calcula automáticamente el `% de cierre = cierres / leads Meta Ads del mes`.

### 5.8 Comisiones para Veterinarios y Aliados Comerciales
- El veterinario/aliado que refiere un cliente **no es usuario del sistema**; su liquidación es externa.
- El sistema debe registrar y trackear automáticamente:
  - Fecha de primera entrega del cliente referido (inicio del período).
  - Fecha de expiración del período (inicio + 6 meses).
  - Estado del período (activo / expirado).
- Estructura de comisión del veterinario/aliado:
  - **Venta #1 del referido:** 10% del total del alimento (sin IVA, sin envío, sin snacks).
  - **Recompras durante 6 meses desde primera entrega:** 5% del total del alimento (sin IVA, sin envío, sin snacks).
- El cliente referido por veterinario recibe:
  - 5% de descuento redimible en la 1ª o 2ª compra.
  - Snacks de obsequio: 100g de galletas muestra gratis.
- La liquidación al veterinario/aliado la gestiona el área contable (fuera del ERP en Fase 1); el sistema solo provee el reporte.

---

## 6. Flujo del Pedido y Estados

### 6.1 Estados del Pedido
```
Fecha Tentativa → Confirmado → En Preparación → Listo para Despacho → Despachado
```

| Estado               | Descripción                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| Fecha Tentativa      | Pre-reserva para clientes frecuentes. Equivale a Borrador. Sin pago confirmado. |
| Confirmado           | Pago recibido y verificado.                                                 |
| En Preparación       | El equipo de producción/logística está preparando el pedido.                |
| En Espera Producción | Sub-estado: el alimento aún no está fabricado. Visible en Kanban con badge. |
| Listo para Despacho  | Pedido empacado, bolsas contadas, asignado a ruta.                          |
| Despachado           | Ruta notificada al mensajero por WhatsApp vía n8n.                          |

**Estados adicionales:**
- `Devolución`: Pedido devuelto. No cuenta en tabla de comisiones.
- `Parcial`: Pedido entregado parcialmente por falta de stock en producción.

### 6.2 Lógica de Pago
- **Pendiente** = cliente aún no ha pagado.
- **Confirmado** = pago recibido.
- Métodos de pago disponibles:
  - Efectivo (Nequi, Daviplata, efectivo físico).
  - Transferencia (Bancolombia, PSE/OpenPay, Bold).
- Los pedidos en `Fecha Tentativa` pueden tener pago `Pendiente`.
- Solo los pedidos con pago `Confirmado` son visibles en el panel de logística.

### 6.3 Edición de Pedidos
- Un pedido puede ser editado por:
  - El **vendedor que lo creó**, únicamente antes del estado `Listo para Despacho`.
  - Un **Admin**, en cualquier momento antes de `Despachado`.
  - El **Contable** puede modificar el **estado de pago** únicamente.
- Cualquier edición debe quedar registrada con una marca visible en el pedido (`[EDITADO]`).

### 6.4 Pedidos Parciales y Devoluciones
- Se conciben como **estados/flags** del pedido para tracking y exclusión de comisiones.
- En Fase 1, el admin o logística puede marcar un pedido como `Parcial` o `Devolución`.

---

## 7. Logística y Rutas

### 7.1 Definición de Ruta
- Una ruta es una **agrupación geográfica de pedidos del mismo día**, asignada a un mensajero específico, con una franja horaria (AM / PM / intermedia).
- Franjas típicas: **2 AM + 3 PM** (puede variar a **3 AM + 3 PM** según volumen).

### 7.2 Asignación de Franja Horaria
- La asigna el equipo de **logística al armar la ruta**.
- Puede ser solicitada por el **cliente al momento del pedido** (registrada en notas del pedido).
- Ambas fuentes son válidas y se registran en el pedido.

### 7.3 Mensajeros
- **No tienen usuario en el sistema.**
- Son contratistas externos notificados por WhatsApp al momento de despachar la ruta.
- El sistema genera el **payload para n8n** que envía el mensaje por WhatsApp.

### 7.4 Proceso de Logística en el Kanban
1. Logística ve todos los pedidos `Confirmados`.
2. Ingresa el **número de bolsas físicas** manualmente al preparar cada pedido.
3. Marca los pedidos como `En Preparación` o `En Espera Producción`.
4. Cuando el pedido está listo: `Listo para Despacho`.
5. Agrupa pedidos por ruta y mensajero.
6. Presiona **"Despachar Ruta"** → se genera el payload → n8n envía WhatsApp al mensajero.

### 7.5 Estado "En Espera de Producción"
- El pedido sigue visible en el Kanban de logística.
- Se muestra con un **badge/indicador visual** diferenciador.
- El equipo de producción notifica cuando está listo (flujo manual en Fase 1).

### 7.6 Liquidación Diaria de Mensajeros
- Al final del día, el sistema debe poder mostrar un resumen por mensajero:
  - Total de pedidos entregados.
  - Total cobrado al cliente por envío.
  - Total a pagar al mensajero (base + ajustes manuales).

---

## 8. Automatización n8n + Kommo (Hito 5)

### 8.1 Flujo General al Despachar Ruta
Cuando logística presiona **"Despachar Ruta"**, se disparan **4 mensajes/acciones** en paralelo:
1. **WhatsApp directo al mensajero** — n8n envía el mensaje con el detalle de todos sus pedidos.
2. **Notificación al cliente** — El ERP mueve al cliente a la etapa correspondiente en **Kommo CRM** vía API. Kommo tiene automatizaciones configuradas que disparan el mensaje de WhatsApp al cliente desde ese stage.
3–4. *(Flujos adicionales ya configurados en Kommo para esa etapa — por definir en implementación)*

> **Principio clave:** El ERP no gestiona los mensajes al cliente directamente. Solo **actualiza el stage del contacto en Kommo** vía API REST, y Kommo se encarga del envío y los templates de WhatsApp al cliente.

### 8.2 Integración con Kommo CRM
- **Kommo sigue siendo el CRM conversacional principal** de Amatu en Fase 1 y en adelante.
- El ERP se integra con Kommo vía **Kommo API** para:
  - Mover contactos/leads entre etapas cuando se confirma un pedido o se despacha una ruta.
  - Disparar automáticamente los mensajes y flujos de WhatsApp ya configurados en Kommo.
- **NO se reemplaza Kommo** — ambos sistemas coexisten y se complementan.

### 8.3 Formato del Mensaje Directo al Mensajero (por Pedido)
```
🐶 Perro: [NOMBRE_MASCOTA]
👤 Cliente: [NOMBRE_CLIENTE]
🕰️ HORARIO: [FRANJA_HORARIA o "N/A"]
📝 Notas Ventas: [NOTAS_VENDEDOR]
📍 Dirección: [DIRECCIÓN_COMPLETA]
🛻 Notas Despachos: [NOTAS_LOGISTICA]
📞 Celular: [CELULAR_CLIENTE]
📦 Cantidad bolsas: [NUM_BOLSAS]
💰 Pago: CONTRAENTREGA  ← Solo si el vendedor marcó pago contraentrega
💵 TOTAL: [TOTAL_PEDIDO]  ← Siempre visible
```
Este mensaje se genera en Next.js y se envía vía webhook a n8n → WhatsApp Cloud API / Evolution API.

### 8.4 Etiqueta de Despacho (PDF)
- Generada en el **frontend (Next.js)** con `react-pdf` o `jsPDF`.
- La imprime el personal de **picking y packing**.
- Se imprime en físico y se pega en las bolsas del pedido.

---

## 9. Usuarios y Roles

### 9.1 Roles del Sistema
| Rol        | Permisos Clave                                                                                                                                   |
|------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Admin      | Acceso total. Puede editar cualquier pedido, configurar catálogo, precios, descuentos, comisiones y roles.                                        |
| Vendedor   | Crea y edita sus pedidos (antes de `Listo para Despacho`). Ve **todas** las ventas del sistema. Registra leads de Meta Ads.                       |
| Logística  | Ve pedidos `Confirmados`. Gestiona Kanban, asigna rutas, ingresa bolsas, despacha rutas. No puede editar montos.                                  |
| Contable   | Acceso de lectura a reportes financieros y comisiones. Puede modificar **estado de pago** de pedidos.                                            |

### 9.2 Usuarios al Lanzamiento
- 1 Admin
- 2 Vendedores
- 2 Logísticos
- 1 Contable

---

## 10. Migraciones y Datos Existentes

- **Sin migración de datos históricos.** El sistema arranca limpio desde el día de lanzamiento.
- Los clientes y pedidos pasados permanecen en Google Sheets como archivo histórico de referencia.
- Solo se registran en el ERP los clientes a partir del primer pedido que realicen desde el lanzamiento.

---

## 11. Registro de Leads de Meta Ads

- Solo se registran en el ERP los clientes que **efectivamente compran** (convirtiéndose en registro de cliente con pedido #1).
- El **número total de leads de Meta Ads** (para calcular el % de cierre del vendedor) es un dato que se ingresa **manualmente** en el ERP.
- Forma de ingreso: El vendedor o admin registra diariamente (o con la frecuencia que quieran) el número de leads recibidos de Meta Ads para cada vendedor.
- El sistema calcula automáticamente: `% cierre = cantidad de venta #1 de fuente Meta Ads / leads Meta Ads ingresados` (en el período mensual activo).

---

## 12. Integraciones Externas

| Sistema                          | Tipo de Integración                         | Fase |
|----------------------------------|---------------------------------------------|------|
| **Kommo CRM**                    | API REST — mover contactos entre stages     | 1    |
| **n8n**                          | Webhook — orquestar mensajes y automatizaciones | 1 |
| **WhatsApp Cloud API / Evolution API** | Vía n8n — mensajes directos al mensajero | 1  |
| **Meta Ads**                     | Sin integración directa — datos manuales    | 1    |
| **Pasarelas de Pago**            | Sin integración — confirmación manual       | 1    |
| **Transportadora Externa**       | Sin integración — uso esporádico            | —    |