export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aliados: {
        Row: {
          celular: string | null
          correo: string | null
          created_at: string
          id: string
          is_active: boolean
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_aliado"]
        }
        Insert: {
          celular?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_aliado"]
        }
        Update: {
          celular?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_aliado"]
        }
        Relationships: []
      }
      aliados_referidos: {
        Row: {
          aliado_id: string
          cliente_id: string
          created_at: string
          fecha_fin_comision: string | null
          fecha_inicio_comision: string | null
          id: string
          pedido_primera_entrega_id: string | null
          periodo_activo: boolean
        }
        Insert: {
          aliado_id: string
          cliente_id: string
          created_at?: string
          fecha_fin_comision?: string | null
          fecha_inicio_comision?: string | null
          id?: string
          pedido_primera_entrega_id?: string | null
          periodo_activo?: boolean
        }
        Update: {
          aliado_id?: string
          cliente_id?: string
          created_at?: string
          fecha_fin_comision?: string | null
          fecha_inicio_comision?: string | null
          id?: string
          pedido_primera_entrega_id?: string | null
          periodo_activo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aliados_referidos_aliado_id_fkey"
            columns: ["aliado_id"]
            isOneToOne: false
            referencedRelation: "aliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aliados_referidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aliados_referidos_pedido_primera_entrega_id_fkey"
            columns: ["pedido_primera_entrega_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_producto: {
        Row: {
          created_at: string
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          barrio: string | null
          celular: string
          codigo_cliente: string
          complemento_direccion: string | null
          correo: string | null
          created_at: string
          direccion: string
          fuente: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo: string | null
          id: string
          is_active: boolean
          kommo_contact_id: string | null
          nombre_completo: string
          notas_defecto: string | null
          numero_documento: string
          pct_descuento_distribuidor: number
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          updated_at: string
          zona_id: string | null
        }
        Insert: {
          barrio?: string | null
          celular: string
          codigo_cliente: string
          complemento_direccion?: string | null
          correo?: string | null
          created_at?: string
          direccion: string
          fuente?: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo?: string | null
          id?: string
          is_active?: boolean
          kommo_contact_id?: string | null
          nombre_completo: string
          notas_defecto?: string | null
          numero_documento: string
          pct_descuento_distribuidor?: number
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
          barrio?: string | null
          celular?: string
          codigo_cliente?: string
          complemento_direccion?: string | null
          correo?: string | null
          created_at?: string
          direccion?: string
          fuente?: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo?: string | null
          id?: string
          is_active?: boolean
          kommo_contact_id?: string | null
          nombre_completo?: string
          notas_defecto?: string | null
          numero_documento?: string
          pct_descuento_distribuidor?: number
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas_envio"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones_aliado: {
        Row: {
          aliado_referido_id: string
          base_calculo: number
          created_at: string
          estado: Database["public"]["Enums"]["estado_comision_aliado"]
          id: string
          monto: number
          pedido_id: string
          porcentaje: number
          tipo: Database["public"]["Enums"]["tipo_comision_aliado"]
        }
        Insert: {
          aliado_referido_id: string
          base_calculo: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_comision_aliado"]
          id?: string
          monto: number
          pedido_id: string
          porcentaje: number
          tipo: Database["public"]["Enums"]["tipo_comision_aliado"]
        }
        Update: {
          aliado_referido_id?: string
          base_calculo?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_comision_aliado"]
          id?: string
          monto?: number
          pedido_id?: string
          porcentaje?: number
          tipo?: Database["public"]["Enums"]["tipo_comision_aliado"]
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_aliado_aliado_referido_id_fkey"
            columns: ["aliado_referido_id"]
            isOneToOne: false
            referencedRelation: "aliados_referidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_aliado_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones_detalle: {
        Row: {
          aplica_comision: boolean
          base_calculo: number
          created_at: string
          id: string
          is_provisional: boolean
          liquidacion_id: string | null
          monto_comision: number
          numero_venta_cliente: number
          pct_comision: number
          pedido_id: string
          periodo_mes: string | null
          razon_no_comision: string | null
          vendedor_id: string | null
        }
        Insert: {
          aplica_comision?: boolean
          base_calculo: number
          created_at?: string
          id?: string
          is_provisional?: boolean
          liquidacion_id?: string | null
          monto_comision?: number
          numero_venta_cliente: number
          pct_comision?: number
          pedido_id: string
          periodo_mes?: string | null
          razon_no_comision?: string | null
          vendedor_id?: string | null
        }
        Update: {
          aplica_comision?: boolean
          base_calculo?: number
          created_at?: string
          id?: string
          is_provisional?: boolean
          liquidacion_id?: string | null
          monto_comision?: number
          numero_venta_cliente?: number
          pct_comision?: number
          pedido_id?: string
          periodo_mes?: string | null
          razon_no_comision?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_detalle_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones_comision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_detalle_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_detalle_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      config_comisiones: {
        Row: {
          cierre_max: number
          cierre_min: number
          created_at: string
          id: string
          is_active: boolean
          venta_2_pct: number
          venta_3_pct: number
          venta_4_pct: number
          venta_5_pct: number
          venta_6_pct: number
        }
        Insert: {
          cierre_max: number
          cierre_min: number
          created_at?: string
          id?: string
          is_active?: boolean
          venta_2_pct?: number
          venta_3_pct?: number
          venta_4_pct?: number
          venta_5_pct?: number
          venta_6_pct?: number
        }
        Update: {
          cierre_max?: number
          cierre_min?: number
          created_at?: string
          id?: string
          is_active?: boolean
          venta_2_pct?: number
          venta_3_pct?: number
          venta_4_pct?: number
          venta_5_pct?: number
          venta_6_pct?: number
        }
        Relationships: []
      }
      conteo_items: {
        Row: {
          cantidad_contada: number
          cantidad_sistema: number
          conteo_id: string
          diferencia: number | null
          id: string
          insumo_id: string | null
          producto_id: string | null
          variante_id: string | null
        }
        Insert: {
          cantidad_contada?: number
          cantidad_sistema?: number
          conteo_id: string
          diferencia?: number | null
          id?: string
          insumo_id?: string | null
          producto_id?: string | null
          variante_id?: string | null
        }
        Update: {
          cantidad_contada?: number
          cantidad_sistema?: number
          conteo_id?: string
          diferencia?: number | null
          id?: string
          insumo_id?: string | null
          producto_id?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteo_items_conteo_id_fkey"
            columns: ["conteo_id"]
            isOneToOne: false
            referencedRelation: "conteos_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteo_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteo_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "conteo_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteo_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "conteo_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteo_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      conteos_inventario: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_conteo"]
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          notas: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_conteo"]
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_conteo"]
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteos_inventario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_pedido: {
        Row: {
          aplica_descuento: boolean
          cantidad: number
          cantidad_entregada: number | null
          created_at: string
          es_magistral: boolean
          es_promo: boolean
          gramaje_magistral: number | null
          id: string
          justificacion_precio: string | null
          nombre_snapshot: string
          notas_magistral: string | null
          pedido_id: string
          precio_unitario_snapshot: number
          producto_id: string
          promo_id: string | null
          subtotal: number
          variante_id: string | null
        }
        Insert: {
          aplica_descuento?: boolean
          cantidad?: number
          cantidad_entregada?: number | null
          created_at?: string
          es_magistral?: boolean
          es_promo?: boolean
          gramaje_magistral?: number | null
          id?: string
          justificacion_precio?: string | null
          nombre_snapshot: string
          notas_magistral?: string | null
          pedido_id: string
          precio_unitario_snapshot: number
          producto_id: string
          promo_id?: string | null
          subtotal: number
          variante_id?: string | null
        }
        Update: {
          aplica_descuento?: boolean
          cantidad?: number
          cantidad_entregada?: number | null
          created_at?: string
          es_magistral?: boolean
          es_promo?: boolean
          gramaje_magistral?: number | null
          id?: string
          justificacion_precio?: string | null
          nombre_snapshot?: string
          notas_magistral?: string | null
          pedido_id?: string
          precio_unitario_snapshot?: number
          producto_id?: string
          promo_id?: string | null
          subtotal?: number
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "detalle_pedido_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      ingreso_items: {
        Row: {
          cantidad: number
          codigo_lote: string
          fecha_vencimiento: string | null
          id: string
          ingreso_id: string
          insumo_id: string
          precio_compra: number
          precio_unitario: number | null
        }
        Insert: {
          cantidad: number
          codigo_lote: string
          fecha_vencimiento?: string | null
          id?: string
          ingreso_id: string
          insumo_id: string
          precio_compra: number
          precio_unitario?: number | null
        }
        Update: {
          cantidad?: number
          codigo_lote?: string
          fecha_vencimiento?: string | null
          id?: string
          ingreso_id?: string
          insumo_id?: string
          precio_compra?: number
          precio_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingreso_items_ingreso_id_fkey"
            columns: ["ingreso_id"]
            isOneToOne: false
            referencedRelation: "ingresos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      ingreso_numero_seq: {
        Row: {
          ultimo_numero: number
          year: number
        }
        Insert: {
          ultimo_numero?: number
          year: number
        }
        Update: {
          ultimo_numero?: number
          year?: number
        }
        Relationships: []
      }
      ingresos: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          notas: string | null
          numero: string | null
          placa_vehiculo: string | null
          proveedor: string | null
          temperatura_llegada: number | null
          tipo_ingreso: Database["public"]["Enums"]["tipo_insumo"]
          total_costo: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          placa_vehiculo?: string | null
          proveedor?: string | null
          temperatura_llegada?: number | null
          tipo_ingreso: Database["public"]["Enums"]["tipo_insumo"]
          total_costo?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          placa_vehiculo?: string | null
          proveedor?: string | null
          temperatura_llegada?: number | null
          tipo_ingreso?: Database["public"]["Enums"]["tipo_insumo"]
          total_costo?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_lotes: {
        Row: {
          cantidad_disponible: number
          cantidad_inicial: number
          codigo_lote: string
          costo_unitario: number
          created_at: string
          fecha_ingreso: string
          fecha_vencimiento: string | null
          id: string
          insumo_id: string
          proveedor: string | null
        }
        Insert: {
          cantidad_disponible: number
          cantidad_inicial: number
          codigo_lote: string
          costo_unitario?: number
          created_at?: string
          fecha_ingreso?: string
          fecha_vencimiento?: string | null
          id?: string
          insumo_id: string
          proveedor?: string | null
        }
        Update: {
          cantidad_disponible?: number
          cantidad_inicial?: number
          codigo_lote?: string
          costo_unitario?: number
          created_at?: string
          fecha_ingreso?: string
          fecha_vencimiento?: string | null
          id?: string
          insumo_id?: string
          proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      insumos: {
        Row: {
          codigo: string
          costo_promedio: number
          created_at: string
          id: string
          is_active: boolean
          merma_pct: number
          nombre: string
          notas: string | null
          stock_minimo: number
          tipo: Database["public"]["Enums"]["tipo_insumo"]
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
          updated_at: string
        }
        Insert: {
          codigo: string
          costo_promedio?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merma_pct?: number
          nombre: string
          notas?: string | null
          stock_minimo?: number
          tipo: Database["public"]["Enums"]["tipo_insumo"]
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          costo_promedio?: number
          created_at?: string
          id?: string
          is_active?: boolean
          merma_pct?: number
          nombre?: string
          notas?: string | null
          stock_minimo?: number
          tipo?: Database["public"]["Enums"]["tipo_insumo"]
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Relationships: []
      }
      kit_items: {
        Row: {
          cantidad: number
          id: string
          kit_id: string
          producto_id: string
          variante_id: string | null
        }
        Insert: {
          cantidad?: number
          id?: string
          kit_id: string
          producto_id: string
          variante_id?: string | null
        }
        Update: {
          cantidad?: number
          id?: string
          kit_id?: string
          producto_id?: string
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "kit_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      kits: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          is_active: boolean
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          is_active?: boolean
          nombre?: string
        }
        Relationships: []
      }
      leads_meta_ads: {
        Row: {
          cantidad_leads: number
          created_at: string
          fecha_registro: string
          id: string
          notas: string | null
          periodo_mes: string
          vendedor_id: string
        }
        Insert: {
          cantidad_leads?: number
          created_at?: string
          fecha_registro?: string
          id?: string
          notas?: string | null
          periodo_mes: string
          vendedor_id: string
        }
        Update: {
          cantidad_leads?: number
          created_at?: string
          fecha_registro?: string
          id?: string
          notas?: string | null
          periodo_mes?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_meta_ads_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones_comision: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_liquidacion: string | null
          id: string
          monto_total_comisiones: number
          pct_cierre_meta: number
          periodo_mes: string
          rango_cierre: string | null
          total_cierres_meta: number
          total_leads_meta: number
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_liquidacion?: string | null
          id?: string
          monto_total_comisiones?: number
          pct_cierre_meta?: number
          periodo_mes: string
          rango_cierre?: string | null
          total_cierres_meta?: number
          total_leads_meta?: number
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_liquidacion"]
          fecha_liquidacion?: string | null
          id?: string
          monto_total_comisiones?: number
          pct_cierre_meta?: number
          periodo_mes?: string
          rango_cierre?: string | null
          total_cierres_meta?: number
          total_leads_meta?: number
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_comision_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mascotas: {
        Row: {
          cliente_id: string
          created_at: string
          edad_meses: number | null
          id: string
          necesidad_dolor: string | null
          nombre: string
          peso_kg: number | null
          raza: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          edad_meses?: number | null
          id?: string
          necesidad_dolor?: string | null
          nombre: string
          peso_kg?: number | null
          raza?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          edad_meses?: number | null
          id?: string
          necesidad_dolor?: string | null
          nombre?: string
          peso_kg?: number | null
          raza?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mascotas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajeros: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          nombre: string
          placa_vehiculo: string | null
          telefono: string
          zona_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          nombre: string
          placa_vehiculo?: string | null
          telefono: string
          zona_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          nombre?: string
          placa_vehiculo?: string | null
          telefono?: string
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajeros_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas_envio"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          costo_unitario: number
          created_at: string
          id: string
          insumo_id: string | null
          lote_id: string | null
          lote_tipo: string | null
          notas: string | null
          producto_id: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string | null
          variante_id: string | null
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          created_at?: string
          id?: string
          insumo_id?: string | null
          lote_id?: string | null
          lote_tipo?: string | null
          notas?: string | null
          producto_id?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
          variante_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          insumo_id?: string | null
          lote_id?: string | null
          lote_tipo?: string | null
          notas?: string | null
          producto_id?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      notas_logistica: {
        Row: {
          completada: boolean
          completada_en: string | null
          completada_por: string | null
          creado_por: string
          created_at: string
          id: string
          pedido_id: string
          texto: string
        }
        Insert: {
          completada?: boolean
          completada_en?: string | null
          completada_por?: string | null
          creado_por: string
          created_at?: string
          id?: string
          pedido_id: string
          texto: string
        }
        Update: {
          completada?: boolean
          completada_en?: string | null
          completada_por?: string | null
          creado_por?: string
          created_at?: string
          id?: string
          pedido_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_logistica_completada_por_fkey"
            columns: ["completada_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_logistica_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_logistica_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      op_numero_seq: {
        Row: {
          ultimo_numero: number
          year: number
        }
        Insert: {
          ultimo_numero?: number
          year: number
        }
        Update: {
          ultimo_numero?: number
          year?: number
        }
        Relationships: []
      }
      ordenes_produccion: {
        Row: {
          cantidad_planificada: number
          cantidad_producida: number | null
          costo_total: number | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_produccion"]
          fecha: string
          id: string
          notas: string | null
          numero: string | null
          producto_id: string
          producto_lote_id: string | null
          receta_id: string | null
          variante_id: string | null
        }
        Insert: {
          cantidad_planificada: number
          cantidad_producida?: number | null
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_produccion"]
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          producto_id: string
          producto_lote_id?: string | null
          receta_id?: string | null
          variante_id?: string | null
        }
        Update: {
          cantidad_planificada?: number
          cantidad_producida?: number | null
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_produccion"]
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          producto_id?: string
          producto_lote_id?: string | null
          receta_id?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_produccion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ordenes_produccion_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "producto_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "v_trazabilidad_lote"
            referencedColumns: ["producto_lote_id"]
          },
          {
            foreignKeyName: "ordenes_produccion_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      pedido_actividad: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          pedido_id: string
          tipo: string
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          pedido_id: string
          tipo: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          pedido_id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_actividad_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_actividad_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_numero_seq: {
        Row: {
          ultimo_numero: number
          year: number
        }
        Insert: {
          ultimo_numero?: number
          year: number
        }
        Update: {
          ultimo_numero?: number
          year?: number
        }
        Relationships: []
      }
      pedido_ruta: {
        Row: {
          created_at: string
          id: string
          numero_bolsas: number
          orden_entrega: number | null
          pedido_id: string
          ruta_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_bolsas?: number
          orden_entrega?: number | null
          pedido_id: string
          ruta_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_bolsas?: number
          orden_entrega?: number | null
          pedido_id?: string
          ruta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_ruta_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_ruta_ruta_id_fkey"
            columns: ["ruta_id"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aliado_id: string | null
          barrio_entrega: string | null
          cliente_id: string
          complemento_entrega: string | null
          created_at: string
          descuento_envio: number
          direccion_entrega: string | null
          editado_en: string | null
          editado_por_id: string | null
          es_contraentrega: boolean
          estado: Database["public"]["Enums"]["estado_pedido"]
          estado_pago: Database["public"]["Enums"]["estado_pago"]
          fecha_confirmacion_pago: string | null
          fecha_entrega_real: string | null
          fecha_tentativa_entrega: string | null
          franja_horaria: Database["public"]["Enums"]["franja_horaria"]
          fue_editado: boolean
          fuente: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo: string | null
          id: string
          kommo_lead_id: string | null
          mascota_id: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          monto_descuento_compra: number
          notas_despacho: string | null
          notas_ventas: string | null
          numero_bolsas: number
          numero_pedido: string
          numero_venta_cliente: number
          pct_descuento_compra: number
          subtotal_alimento: number
          subtotal_otros: number
          subtotal_snacks: number
          tarifa_envio_cliente: number
          total: number
          total_envio_cobrado: number
          updated_at: string
          vendedor_id: string
          zona_entrega_id: string | null
          zona_id: string | null
        }
        Insert: {
          aliado_id?: string | null
          barrio_entrega?: string | null
          cliente_id: string
          complemento_entrega?: string | null
          created_at?: string
          descuento_envio?: number
          direccion_entrega?: string | null
          editado_en?: string | null
          editado_por_id?: string | null
          es_contraentrega?: boolean
          estado?: Database["public"]["Enums"]["estado_pedido"]
          estado_pago?: Database["public"]["Enums"]["estado_pago"]
          fecha_confirmacion_pago?: string | null
          fecha_entrega_real?: string | null
          fecha_tentativa_entrega?: string | null
          franja_horaria?: Database["public"]["Enums"]["franja_horaria"]
          fue_editado?: boolean
          fuente?: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo?: string | null
          id?: string
          kommo_lead_id?: string | null
          mascota_id?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_descuento_compra?: number
          notas_despacho?: string | null
          notas_ventas?: string | null
          numero_bolsas?: number
          numero_pedido: string
          numero_venta_cliente?: number
          pct_descuento_compra?: number
          subtotal_alimento?: number
          subtotal_otros?: number
          subtotal_snacks?: number
          tarifa_envio_cliente?: number
          total?: number
          total_envio_cobrado?: number
          updated_at?: string
          vendedor_id: string
          zona_entrega_id?: string | null
          zona_id?: string | null
        }
        Update: {
          aliado_id?: string | null
          barrio_entrega?: string | null
          cliente_id?: string
          complemento_entrega?: string | null
          created_at?: string
          descuento_envio?: number
          direccion_entrega?: string | null
          editado_en?: string | null
          editado_por_id?: string | null
          es_contraentrega?: boolean
          estado?: Database["public"]["Enums"]["estado_pedido"]
          estado_pago?: Database["public"]["Enums"]["estado_pago"]
          fecha_confirmacion_pago?: string | null
          fecha_entrega_real?: string | null
          fecha_tentativa_entrega?: string | null
          franja_horaria?: Database["public"]["Enums"]["franja_horaria"]
          fue_editado?: boolean
          fuente?: Database["public"]["Enums"]["fuente_cliente"]
          fuente_subtipo?: string | null
          id?: string
          kommo_lead_id?: string | null
          mascota_id?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_descuento_compra?: number
          notas_despacho?: string | null
          notas_ventas?: string | null
          numero_bolsas?: number
          numero_pedido?: string
          numero_venta_cliente?: number
          pct_descuento_compra?: number
          subtotal_alimento?: number
          subtotal_otros?: number
          subtotal_snacks?: number
          tarifa_envio_cliente?: number
          total?: number
          total_envio_cobrado?: number
          updated_at?: string
          vendedor_id?: string
          zona_entrega_id?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_aliado_id_fkey"
            columns: ["aliado_id"]
            isOneToOne: false
            referencedRelation: "aliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_editado_por_id_fkey"
            columns: ["editado_por_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_mascota_id_fkey"
            columns: ["mascota_id"]
            isOneToOne: false
            referencedRelation: "mascotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_zona_entrega_id_fkey"
            columns: ["zona_entrega_id"]
            isOneToOne: false
            referencedRelation: "zonas_envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas_envio"
            referencedColumns: ["id"]
          },
        ]
      }
      pesos_magistrales: {
        Row: {
          created_at: string
          id: string
          peso_g: number
        }
        Insert: {
          created_at?: string
          id?: string
          peso_g: number
        }
        Update: {
          created_at?: string
          id?: string
          peso_g?: number
        }
        Relationships: []
      }
      precios_escala: {
        Row: {
          cantidad_minima: number
          created_at: string
          id: string
          precio_total: number
          producto_id: string
        }
        Insert: {
          cantidad_minima: number
          created_at?: string
          id?: string
          precio_total: number
          producto_id: string
        }
        Update: {
          cantidad_minima?: number
          created_at?: string
          id?: string
          precio_total?: number
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precios_escala_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_escala_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      produccion_consumo: {
        Row: {
          cantidad_consumida: number
          costo: number
          id: string
          insumo_lote_id: string
          orden_produccion_id: string
        }
        Insert: {
          cantidad_consumida: number
          costo?: number
          id?: string
          insumo_lote_id: string
          orden_produccion_id: string
        }
        Update: {
          cantidad_consumida?: number
          costo?: number
          id?: string
          insumo_lote_id?: string
          orden_produccion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produccion_consumo_insumo_lote_id_fkey"
            columns: ["insumo_lote_id"]
            isOneToOne: false
            referencedRelation: "insumo_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_consumo_insumo_lote_id_fkey"
            columns: ["insumo_lote_id"]
            isOneToOne: false
            referencedRelation: "v_trazabilidad_lote"
            referencedColumns: ["insumo_lote_id"]
          },
          {
            foreignKeyName: "produccion_consumo_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_lotes: {
        Row: {
          cantidad_disponible: number
          cantidad_inicial: number
          codigo_lote: string
          costo_unitario: number
          created_at: string
          estado: Database["public"]["Enums"]["estado_pt"]
          fecha_produccion: string
          fecha_vencimiento: string | null
          id: string
          orden_produccion_id: string | null
          producto_id: string
          variante_id: string | null
        }
        Insert: {
          cantidad_disponible: number
          cantidad_inicial: number
          codigo_lote: string
          costo_unitario?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pt"]
          fecha_produccion?: string
          fecha_vencimiento?: string | null
          id?: string
          orden_produccion_id?: string | null
          producto_id: string
          variante_id?: string | null
        }
        Update: {
          cantidad_disponible?: number
          cantidad_inicial?: number
          codigo_lote?: string
          costo_unitario?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_pt"]
          fecha_produccion?: string
          fecha_vencimiento?: string | null
          id?: string
          orden_produccion_id?: string | null
          producto_id?: string
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_producto_lotes_op"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_lotes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      producto_variantes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          precio_por_gramo: number | null
          precio_publico: number
          presentacion: string
          producto_id: string
          sku: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico: number
          presentacion: string
          producto_id: string
          sku: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico?: number
          presentacion?: string
          producto_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_variantes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variantes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      productos: {
        Row: {
          aplica_descuento_compra: boolean
          categoria_id: string
          created_at: string
          es_magistral: boolean
          id: string
          is_active: boolean
          nombre: string
          notas: string | null
          sku: string | null
          tipo_precio: Database["public"]["Enums"]["tipo_precio"]
          updated_at: string
        }
        Insert: {
          aplica_descuento_compra?: boolean
          categoria_id: string
          created_at?: string
          es_magistral?: boolean
          id?: string
          is_active?: boolean
          nombre: string
          notas?: string | null
          sku?: string | null
          tipo_precio?: Database["public"]["Enums"]["tipo_precio"]
          updated_at?: string
        }
        Update: {
          aplica_descuento_compra?: boolean
          categoria_id?: string
          created_at?: string
          es_magistral?: boolean
          id?: string
          is_active?: boolean
          nombre?: string
          notas?: string | null
          sku?: string | null
          tipo_precio?: Database["public"]["Enums"]["tipo_precio"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      promociones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lleva_extra: number | null
          nombre: string
          paga_x: number | null
          producto_id: string | null
          regalo_cantidad: number
          regalo_producto_id: string | null
          regalo_variante_id: string | null
          tipo: Database["public"]["Enums"]["tipo_promocion"]
          trigger_producto_id: string | null
          trigger_variante_id: string | null
          variante_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lleva_extra?: number | null
          nombre: string
          paga_x?: number | null
          producto_id?: string | null
          regalo_cantidad?: number
          regalo_producto_id?: string | null
          regalo_variante_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_promocion"]
          trigger_producto_id?: string | null
          trigger_variante_id?: string | null
          variante_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lleva_extra?: number | null
          nombre?: string
          paga_x?: number | null
          producto_id?: string | null
          regalo_cantidad?: number
          regalo_producto_id?: string | null
          regalo_variante_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_promocion"]
          trigger_producto_id?: string | null
          trigger_variante_id?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promociones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promociones_regalo_producto_id_fkey"
            columns: ["regalo_producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_regalo_producto_id_fkey"
            columns: ["regalo_producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promociones_regalo_variante_id_fkey"
            columns: ["regalo_variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_regalo_variante_id_fkey"
            columns: ["regalo_variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "promociones_trigger_producto_id_fkey"
            columns: ["trigger_producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_trigger_producto_id_fkey"
            columns: ["trigger_producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promociones_trigger_variante_id_fkey"
            columns: ["trigger_variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_trigger_variante_id_fkey"
            columns: ["trigger_variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "promociones_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      receta_items: {
        Row: {
          cantidad: number
          id: string
          insumo_id: string
          receta_id: string
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
        }
        Insert: {
          cantidad: number
          id?: string
          insumo_id: string
          receta_id: string
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
        }
        Update: {
          cantidad?: number
          id?: string
          insumo_id?: string
          receta_id?: string
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"]
        }
        Relationships: [
          {
            foreignKeyName: "receta_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receta_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "receta_items_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          nombre: string
          producto_id: string
          rendimiento: number
          variante_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          nombre: string
          producto_id: string
          rendimiento: number
          variante_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          nombre?: string
          producto_id?: string
          rendimiento?: number
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recetas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "recetas_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recetas_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      reglas_descuento: {
        Row: {
          created_at: string
          descuento_envio_fijo: number
          id: string
          is_active: boolean
          monto_minimo: number
          pct_descuento_compra: number
        }
        Insert: {
          created_at?: string
          descuento_envio_fijo?: number
          id?: string
          is_active?: boolean
          monto_minimo: number
          pct_descuento_compra?: number
        }
        Update: {
          created_at?: string
          descuento_envio_fijo?: number
          id?: string
          is_active?: boolean
          monto_minimo?: number
          pct_descuento_compra?: number
        }
        Relationships: []
      }
      remision_items: {
        Row: {
          cantidad_entregada: number
          detalle_pedido_id: string
          id: string
          producto_id: string
          producto_lote_id: string | null
          remision_id: string
          variante_id: string | null
        }
        Insert: {
          cantidad_entregada: number
          detalle_pedido_id: string
          id?: string
          producto_id: string
          producto_lote_id?: string | null
          remision_id: string
          variante_id?: string | null
        }
        Update: {
          cantidad_entregada?: number
          detalle_pedido_id?: string
          id?: string
          producto_id?: string
          producto_lote_id?: string | null
          remision_id?: string
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remision_items_detalle_pedido_id_fkey"
            columns: ["detalle_pedido_id"]
            isOneToOne: false
            referencedRelation: "detalle_pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_detalle_pedido_id_fkey"
            columns: ["detalle_pedido_id"]
            isOneToOne: false
            referencedRelation: "v_componentes_venta"
            referencedColumns: ["detalle_pedido_id"]
          },
          {
            foreignKeyName: "remision_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "remision_items_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "producto_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "v_trazabilidad_lote"
            referencedColumns: ["producto_lote_id"]
          },
          {
            foreignKeyName: "remision_items_remision_id_fkey"
            columns: ["remision_id"]
            isOneToOne: false
            referencedRelation: "remisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remision_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      remision_numero_seq: {
        Row: {
          ultimo_numero: number
          year: number
        }
        Insert: {
          ultimo_numero?: number
          year: number
        }
        Update: {
          ultimo_numero?: number
          year?: number
        }
        Relationships: []
      }
      remisiones: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          numero: string | null
          pedido_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          numero?: string | null
          pedido_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          numero?: string | null
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remisiones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remisiones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      rutas: {
        Row: {
          ajuste_extra_mensajero: number
          created_at: string
          created_by: string
          despachada_en: string | null
          estado: Database["public"]["Enums"]["estado_ruta"]
          fecha: string
          franja: Database["public"]["Enums"]["franja_horaria"]
          id: string
          mensajero_celular: string | null
          mensajero_id: string | null
          mensajero_nombre: string | null
          motivo_ajuste: string | null
          nombre: string
          notas: string | null
        }
        Insert: {
          ajuste_extra_mensajero?: number
          created_at?: string
          created_by: string
          despachada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_ruta"]
          fecha: string
          franja?: Database["public"]["Enums"]["franja_horaria"]
          id?: string
          mensajero_celular?: string | null
          mensajero_id?: string | null
          mensajero_nombre?: string | null
          motivo_ajuste?: string | null
          nombre: string
          notas?: string | null
        }
        Update: {
          ajuste_extra_mensajero?: number
          created_at?: string
          created_by?: string
          despachada_en?: string | null
          estado?: Database["public"]["Enums"]["estado_ruta"]
          fecha?: string
          franja?: Database["public"]["Enums"]["franja_horaria"]
          id?: string
          mensajero_celular?: string | null
          mensajero_id?: string | null
          mensajero_nombre?: string | null
          motivo_ajuste?: string | null
          nombre?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_mensajero_id_fkey"
            columns: ["mensajero_id"]
            isOneToOne: false
            referencedRelation: "mensajeros"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      zonas_envio: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          localidades: string
          nombre: string
          tarifa_cliente: number
          tarifa_mensajero: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          localidades: string
          nombre: string
          tarifa_cliente: number
          tarifa_mensajero: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          localidades?: string
          nombre?: string
          tarifa_cliente?: number
          tarifa_mensajero?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_componentes_venta: {
        Row: {
          cantidad_componente: number | null
          componente_producto_id: string | null
          componente_variante_id: string | null
          detalle_pedido_id: string | null
          pedido_id: string | null
          tipo_componente: string | null
        }
        Insert: {
          cantidad_componente?: number | null
          componente_producto_id?: string | null
          componente_variante_id?: string | null
          detalle_pedido_id?: string | null
          pedido_id?: string | null
          tipo_componente?: never
        }
        Update: {
          cantidad_componente?: number | null
          componente_producto_id?: string | null
          componente_variante_id?: string | null
          detalle_pedido_id?: string | null
          pedido_id?: string | null
          tipo_componente?: never
        }
        Relationships: [
          {
            foreignKeyName: "detalle_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["componente_producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["componente_producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["componente_variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["componente_variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      v_compras_anual_producto: {
        Row: {
          anio: number | null
          insumo_codigo: string | null
          insumo_id: string | null
          insumo_nombre: string | null
          mes: number | null
          precio_maximo: number | null
          precio_minimo: number | null
          precio_promedio: number | null
          total_cantidad: number | null
          total_valor: number | null
          unidad_medida: Database["public"]["Enums"]["unidad_medida"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      v_compras_producto_periodo: {
        Row: {
          cantidad: number | null
          codigo_lote: string | null
          fecha: string | null
          fecha_vencimiento: string | null
          insumo_codigo: string | null
          insumo_id: string | null
          insumo_nombre: string | null
          precio_compra: number | null
          precio_unitario: number | null
          proveedor: string | null
          unidad_medida: Database["public"]["Enums"]["unidad_medida"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      v_demanda_comprometida: {
        Row: {
          cantidad_pendiente: number | null
          producto_id: string | null
          variante_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      v_stock_insumos: {
        Row: {
          bajo_minimo: boolean | null
          codigo: string | null
          costo_promedio: number | null
          insumo_id: string | null
          lotes_por_vencer: number | null
          merma_pct: number | null
          nombre: string | null
          stock_disponible: number | null
          stock_minimo: number | null
          tipo: Database["public"]["Enums"]["tipo_insumo"] | null
          unidad_medida: Database["public"]["Enums"]["unidad_medida"] | null
        }
        Relationships: []
      }
      v_stock_productos: {
        Row: {
          costo_promedio_lote: number | null
          estado: Database["public"]["Enums"]["estado_pt"] | null
          producto_id: string | null
          producto_nombre: string | null
          stock_disponible: number | null
          variante_id: string | null
          variante_presentacion: string | null
        }
        Relationships: []
      }
      v_trazabilidad_lote: {
        Row: {
          cantidad_disponible: number | null
          cantidad_inicial: number | null
          codigo_lote: string | null
          codigo_lote_pt: string | null
          fecha_ingreso: string | null
          fecha_vencimiento: string | null
          insumo_id: string | null
          insumo_lote_id: string | null
          insumo_nombre: string | null
          numero_op: string | null
          orden_produccion_id: string | null
          producto_id: string | null
          producto_lote_id: string | null
          variante_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "v_stock_insumos"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "produccion_consumo_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_lotes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_lotes_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "v_stock_productos"
            referencedColumns: ["variante_id"]
          },
        ]
      }
      v_valor_inventario: {
        Row: {
          codigo: string | null
          costo_unitario: number | null
          item_id: string | null
          nombre: string | null
          stock_total: number | null
          tipo: string | null
          valor_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_cliente_con_mascotas: {
        Args: { p_cliente: Json; p_mascotas?: Json }
        Returns: Json
      }
      fn_calcular_pct_cierre_meta: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: number
      }
      fn_expirar_periodos_aliado: { Args: never; Returns: number }
      fn_get_cierre_meta_actual: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: {
          config_id: string
          pct_cierre: number
          rango_label: string
          total_cierres: number
          total_leads: number
          venta_2_pct: number
          venta_3_pct: number
          venta_4_pct: number
          venta_5_pct: number
          venta_6_pct: number
        }[]
      }
      fn_get_user_role:
        | { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
        | { Args: { user_id: string }; Returns: string }
      fn_liquidar_periodo_mensual: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: {
          comisiones_trasladadas: number
          liquidacion_id: string
          monto_confirmado: number
        }[]
      }
      fn_recalcular_comisiones_periodo: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: {
          monto_bloqueado: number
          monto_confirmado: number
          monto_total: number
          ordenes_count: number
          pct_cierre: number
          rango_label: string
          total_cierres: number
          total_leads: number
        }[]
      }
      fn_top_selling_productos: {
        Args: { p_limit?: number }
        Returns: {
          producto_id: string
          total_vendido: number
        }[]
      }
    }
    Enums: {
      categoria_conteo:
        | "materia_prima"
        | "producto_seco"
        | "aseo"
        | "producto_terminado"
      estado_comision_aliado: "pendiente" | "liquidada"
      estado_liquidacion: "borrador" | "cerrado" | "pagado"
      estado_pago: "pendiente" | "confirmado"
      estado_pedido:
        | "fecha_tentativa"
        | "confirmado"
        | "en_preparacion"
        | "espera_produccion"
        | "listo_despacho"
        | "despachado"
        | "devolucion"
        | "parcial"
        | "cambio"
      estado_produccion:
        | "planificada"
        | "en_proceso"
        | "completada"
        | "cancelada"
      estado_pt: "producido" | "empacado" | "despachado"
      estado_ruta: "en_preparacion" | "despachada"
      franja_horaria: "AM" | "PM" | "intermedia" | "sin_franja"
      fuente_cliente:
        | "meta_ads"
        | "referido_cliente"
        | "referido_veterinario"
        | "referido_entrenador"
        | "distribuidor"
        | "otro"
      metodo_pago:
        | "nequi"
        | "daviplata"
        | "efectivo"
        | "bancolombia"
        | "pse_openpay"
        | "bold"
        | "contraentrega"
      tipo_aliado: "veterinario" | "entrenador_canino" | "otro"
      tipo_cliente: "publico" | "distribuidor"
      tipo_comision_aliado: "primera_compra" | "recompra"
      tipo_documento: "CC" | "CE" | "NIT" | "Pasaporte"
      tipo_insumo: "materia_prima" | "producto_seco" | "aseo" | "empaque"
      tipo_movimiento:
        | "ingreso_compra"
        | "consumo_produccion"
        | "entrada_produccion"
        | "empaque"
        | "salida_despacho"
        | "ajuste_positivo"
        | "ajuste_negativo"
        | "merma"
        | "devolucion"
      tipo_precio: "fijo" | "por_variante" | "por_gramo" | "escala"
      tipo_promocion: "paga_x_lleva_mas" | "producto_gratis"
      unidad_medida: "g" | "kg" | "ml" | "l" | "unidad"
      user_role: "admin" | "vendedor" | "logistica" | "contable"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_conteo: [
        "materia_prima",
        "producto_seco",
        "aseo",
        "producto_terminado",
      ],
      estado_comision_aliado: ["pendiente", "liquidada"],
      estado_liquidacion: ["borrador", "cerrado", "pagado"],
      estado_pago: ["pendiente", "confirmado"],
      estado_pedido: [
        "fecha_tentativa",
        "confirmado",
        "en_preparacion",
        "espera_produccion",
        "listo_despacho",
        "despachado",
        "devolucion",
        "parcial",
        "cambio",
      ],
      estado_produccion: [
        "planificada",
        "en_proceso",
        "completada",
        "cancelada",
      ],
      estado_pt: ["producido", "empacado", "despachado"],
      estado_ruta: ["en_preparacion", "despachada"],
      franja_horaria: ["AM", "PM", "intermedia", "sin_franja"],
      fuente_cliente: [
        "meta_ads",
        "referido_cliente",
        "referido_veterinario",
        "referido_entrenador",
        "distribuidor",
        "otro",
      ],
      metodo_pago: [
        "nequi",
        "daviplata",
        "efectivo",
        "bancolombia",
        "pse_openpay",
        "bold",
        "contraentrega",
      ],
      tipo_aliado: ["veterinario", "entrenador_canino", "otro"],
      tipo_cliente: ["publico", "distribuidor"],
      tipo_comision_aliado: ["primera_compra", "recompra"],
      tipo_documento: ["CC", "CE", "NIT", "Pasaporte"],
      tipo_insumo: ["materia_prima", "producto_seco", "aseo", "empaque"],
      tipo_movimiento: [
        "ingreso_compra",
        "consumo_produccion",
        "entrada_produccion",
        "empaque",
        "salida_despacho",
        "ajuste_positivo",
        "ajuste_negativo",
        "merma",
        "devolucion",
      ],
      tipo_precio: ["fijo", "por_variante", "por_gramo", "escala"],
      tipo_promocion: ["paga_x_lleva_mas", "producto_gratis"],
      unidad_medida: ["g", "kg", "ml", "l", "unidad"],
      user_role: ["admin", "vendedor", "logistica", "contable"],
    },
  },
} as const
