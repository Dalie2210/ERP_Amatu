-- =====================================================================
-- PASO 3 — Datos de configuración mínimos
-- Ejecutar DESPUÉS de 01_schema_dev.sql (el dump de dev, que es schema-only).
--
-- Sin estas filas la app arranca pero no funciona:
--   · pedido_transiciones vacía  -> fn_validar_transicion_pedido rechaza
--     TODOS los cambios de estado de pedido (el Kanban queda muerto).
--   · reglas_descuento vacía     -> fn_calcular_totales_pedido no aplica
--     ningún tramo de descuento ni descuento de envío.
--   · zonas_envio vacía          -> no se puede calcular tarifa de envío.
--   · categorias_producto vacía  -> no se pueden crear productos.
--   · config_produccion vacía    -> el planificador de mezclas no tiene
--     capacidad de mezcladora contra la cual calcular.
--
-- Los UUID se conservan idénticos a dev a propósito: así el catálogo que
-- exportes después desde dev (productos, recetas) referencia las mismas
-- categorías y zonas sin necesidad de remapear.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Zonas de envío
-- ---------------------------------------------------------------------
INSERT INTO public.zonas_envio (id,nombre,localidades,tarifa_cliente,tarifa_mensajero,is_active) VALUES ('4f08cb6d-db85-43fb-aab5-2d3245ed49b6'::uuid,'Bogotá','Bogotá D.C.',12000.00,12000.00,true);
INSERT INTO public.zonas_envio (id,nombre,localidades,tarifa_cliente,tarifa_mensajero,is_active) VALUES ('dbe1a169-1d56-4402-a585-c88a5b6b424e'::uuid,'Soacha y alrededores','Soacha, Arborizadora, Ciudadela Colsubsidio',13500.00,13500.00,true);
INSERT INTO public.zonas_envio (id,nombre,localidades,tarifa_cliente,tarifa_mensajero,is_active) VALUES ('5f1c50d9-6bd2-4680-8290-c92646ac1387'::uuid,'Municipios cercanos','Cajicá, Chía, Madrid, Mosquera, Cota, La Calera',31300.00,31300.00,true);
INSERT INTO public.zonas_envio (id,nombre,localidades,tarifa_cliente,tarifa_mensajero,is_active) VALUES ('40c81256-d74f-4684-9e4b-82f9e7da77f7'::uuid,'Municipios lejanos','Tocancipá, Zipaquirá',37100.00,37100.00,true);

-- ---------------------------------------------------------------------
-- Categorías de producto
-- El slug 'snacks' NO es cosmético: fn_crear_pedido y fn_editar_lineas_pedido
-- lo usan para separar subtotal_snacks de subtotal_otros.
-- ---------------------------------------------------------------------
INSERT INTO public.categorias_producto (id,nombre,slug) VALUES ('d33eebd6-cb0c-4de5-938d-b30cbd4d7236'::uuid,'Dietas Individuales','dietas');
INSERT INTO public.categorias_producto (id,nombre,slug) VALUES ('8657c89a-b9d2-4165-8dc3-7eaa6ddd915a'::uuid,'Kits','kits');
INSERT INTO public.categorias_producto (id,nombre,slug) VALUES ('f043b2c3-b7f5-4825-b448-3c404808a925'::uuid,'Snacks','snacks');
INSERT INTO public.categorias_producto (id,nombre,slug) VALUES ('4e145e04-bef3-4e64-a557-80879a0fc623'::uuid,'Accesorios','accesorios');
INSERT INTO public.categorias_producto (id,nombre,slug) VALUES ('618db73b-ba7e-4e64-a896-f3fc6871379d'::uuid,'Magistral','magistral');

-- ---------------------------------------------------------------------
-- Tramos de descuento por compra (sobre subtotal de alimento)
-- ---------------------------------------------------------------------
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('7bd44474-47bf-485a-9448-f5afed868432'::uuid,0.00,0.00,0.00,true);
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('bac53b7b-e441-44d1-ac8a-e37acfb3c313'::uuid,280000.00,0.00,7000.00,true);
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('8ec0e37c-5673-4a7e-b4c6-4f683a4ff4f3'::uuid,495000.00,5.00,7000.00,true);
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('7ce0206e-6aad-48f2-97cd-d6706ef86343'::uuid,825000.00,7.00,7000.00,true);
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('990c045d-ab14-430b-b6d9-ce64f153fff0'::uuid,1518000.00,9.00,7000.00,true);
INSERT INTO public.reglas_descuento (id,monto_minimo,pct_descuento_compra,descuento_envio_fijo,is_active) VALUES ('e3364980-74e4-4250-8485-3aafa3424bcd'::uuid,1837000.00,10.00,7000.00,true);

-- ---------------------------------------------------------------------
-- Pesos disponibles para dietas magistrales
-- ---------------------------------------------------------------------
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('7e09e7da-9b38-461c-bd42-1a3259e51a6a'::uuid,250);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('c6fd6a70-9e42-49ff-84f3-fc6847cb842a'::uuid,300);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('7c9bf5db-19c9-4184-a13b-763cdfada632'::uuid,375);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('14f3ace4-9d77-4b6e-9e79-764e5afd3126'::uuid,400);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('deba4d56-502d-4846-aad1-4837f6e70bd9'::uuid,500);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('5f3471dc-c875-49c1-ba3e-bd76340af85d'::uuid,600);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('ba8c2b3e-b853-4801-b4aa-ecb8c697cbe4'::uuid,800);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('7ac79e8b-dff1-4446-a3f2-c07fbe8327e6'::uuid,1000);
INSERT INTO public.pesos_magistrales (id,peso_g) VALUES ('35a0f73d-ed5f-4cd8-8eea-af7894292463'::uuid,1200);

-- ---------------------------------------------------------------------
-- Capacidad de la mezcladora
-- ---------------------------------------------------------------------
INSERT INTO public.config_produccion (id,nombre,porcion_estandar_g,mezcla_min_g,mezcla_max_g,duracion_mezcla_min,tolerancia_ajuste_g,is_default,is_active) VALUES ('c3aa4b16-3958-4e49-b625-7a17230794ab'::uuid,'Mezcladora principal',1200,7200,58000,45,0,true,true);

-- ---------------------------------------------------------------------
-- Transiciones legales de estado de pedido
-- Espejo de STAGE_TRANSITIONS en src/lib/logistica/transitions.ts.
-- listo_despacho -> despachado NO está aquí a propósito: esa transición
-- solo la produce fn_despachar_ruta, saltándose el guard.
-- ---------------------------------------------------------------------
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('fecha_tentativa'::public.estado_pedido, 'confirmado'::public.estado_pedido, '{admin,vendedor,logistica,contable}'::public.user_role[], 'Confirmar pedido');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('confirmado'::public.estado_pedido, 'en_preparacion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Iniciar preparación');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('confirmado'::public.estado_pedido, 'espera_produccion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Espera de producción');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('confirmado'::public.estado_pedido, 'devolucion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Devolución');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('confirmado'::public.estado_pedido, 'cambio'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Cambio de producto');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('en_preparacion'::public.estado_pedido, 'confirmado'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Volver a confirmado');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('en_preparacion'::public.estado_pedido, 'espera_produccion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Espera de producción');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('en_preparacion'::public.estado_pedido, 'listo_despacho'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Listo para despacho');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('en_preparacion'::public.estado_pedido, 'devolucion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Devolución');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('en_preparacion'::public.estado_pedido, 'cambio'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Cambio de producto');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('espera_produccion'::public.estado_pedido, 'en_preparacion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Producción lista');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('espera_produccion'::public.estado_pedido, 'listo_despacho'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Listo para despacho');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('espera_produccion'::public.estado_pedido, 'devolucion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Devolución');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('listo_despacho'::public.estado_pedido, 'en_preparacion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Volver a preparación');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('listo_despacho'::public.estado_pedido, 'espera_produccion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Volver a espera producción');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('listo_despacho'::public.estado_pedido, 'devolucion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Devolución antes del despacho');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('listo_despacho'::public.estado_pedido, 'cambio'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Cambio antes del despacho');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('devolucion'::public.estado_pedido, 'confirmado'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Reactivar como confirmado');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('devolucion'::public.estado_pedido, 'en_preparacion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Reactivar a preparación');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('cambio'::public.estado_pedido, 'confirmado'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Reactivar como confirmado');
INSERT INTO public.pedido_transiciones (estado_origen, estado_destino, roles, descripcion) VALUES ('cambio'::public.estado_pedido, 'en_preparacion'::public.estado_pedido, '{admin,vendedor,logistica}'::public.user_role[], 'Reactivar a preparación');

COMMIT;

-- ---------------------------------------------------------------------
-- PENDIENTE — config_comisiones
-- En dev esta tabla está VACÍA (0 filas). Consecuencia en prod: la matriz
-- de % por rango de cierre de Meta Ads no existe, así que
-- fn_estimar_comisiones_periodo devuelve 0% para todas las ventas con la
-- razón "Porcentaje 0% en rango de cierre actual".
--
-- Si el negocio ya tiene definida la matriz, cárgala aquí. Ejemplo de la
-- forma esperada (rangos de % de cierre y el % de comisión por nº de venta):
--
-- INSERT INTO public.config_comisiones
--   (cierre_min, cierre_max, venta_2_pct, venta_3_pct, venta_4_pct, venta_5_pct, venta_6_pct)
-- VALUES
--   ( 0.00, 20.00, 1.00, 1.00, 1.00, 1.00, 1.00),
--   (20.00, 30.00, 2.00, 2.00, 2.00, 2.00, 2.00),
--   (30.00, 100.00, 3.00, 3.00, 3.00, 3.00, 3.00);
-- ---------------------------------------------------------------------
