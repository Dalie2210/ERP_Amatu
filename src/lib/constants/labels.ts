export const FUENTE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  referido_cliente: "Referido — Cliente",
  referido_veterinario: "Referido — Veterinario",
  referido_entrenador: "Referido — Entrenador",
  distribuidor: "Distribuidor",
  otro: "Otro",
}

export const REFERIDO_SUBTIPO_LABELS: Record<string, string> = {
  referido_cliente: "Cliente",
  referido_veterinario: "Veterinario",
  referido_entrenador: "Entrenador Canino",
}

export const METODO_PAGO_LABELS: Record<string, string> = {
  nequi: "Nequi",
  daviplata: "Daviplata",
  efectivo: "Efectivo",
  bancolombia: "Bancolombia",
  pse_openpay: "PSE / OpenPay",
  bold: "Bold",
  contraentrega: "Contraentrega",
}

export const FRANJA_LABELS: Record<string, string> = {
  AM: "AM (Mañana)",
  PM: "PM (Tarde)",
  intermedia: "Intermedia",
  sin_franja: "Sin Franja",
}

export const ESTADO_PAGO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
}

export const TIPO_DOC_LABELS: Record<string, string> = {
  CC: "C.C.",
  CE: "C.E.",
  NIT: "NIT",
  Pasaporte: "Pasaporte",
}

export const TIPO_CLIENTE_LABELS: Record<string, string> = {
  publico: "Público (consumidor final)",
  distribuidor: "Distribuidor",
}

export const TIPO_PRECIO_LABELS: Record<string, string> = {
  fijo: "Precio Fijo",
  por_variante: "Por Variante (peso)",
  por_gramo: "Por Gramo",
  escala: "Por Escala (volumen)",
}

export const TIPO_INSUMO_LABELS: Record<string, string> = {
  materia_prima: "Materia Prima",
  producto_seco: "Producto Seco",
  aseo: "Aseo",
  empaque: "Empaque",
}

export const UNIDAD_MEDIDA_LABELS: Record<string, string> = {
  g: "Gramos (g)",
  kg: "Kilogramos (kg)",
  ml: "Mililitros (ml)",
  l: "Litros (l)",
  unidad: "Unidad",
}

export const ESTADO_PRODUCCION_LABELS: Record<string, string> = {
  planificada: "Planificada",
  en_proceso: "En Proceso",
  completada: "Completada",
  cancelada: "Cancelada",
}

export const ESTADO_PT_LABELS: Record<string, string> = {
  producido: "Producido",
  empacado: "Empacado",
  despachado: "Despachado",
}

export const CATEGORIA_CONTEO_LABELS: Record<string, string> = {
  materia_prima: "Materia Prima",
  producto_seco: "Producto Seco",
  aseo: "Aseo",
  producto_terminado: "Producto Terminado",
}

export const TIPO_MOVIMIENTO_LABELS: Record<string, string> = {
  ingreso_compra: "Ingreso / Compra",
  consumo_produccion: "Consumo Producción",
  entrada_produccion: "Entrada Producción",
  empaque: "Empaque",
  salida_despacho: "Salida Despacho",
  ajuste_positivo: "Ajuste Positivo",
  ajuste_negativo: "Ajuste Negativo",
  merma: "Merma",
  devolucion: "Devolución",
}
