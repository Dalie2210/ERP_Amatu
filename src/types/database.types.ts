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
      config_produccion: {
        Row: {
          created_at: string
          duracion_mezcla_min: number
          id: string
          is_active: boolean
          is_default: boolean
          mezcla_max_g: number
          mezcla_min_g: number
          nombre: string
          porcion_estandar_g: number
          tolerancia_ajuste_g: number
        }
        Insert: {
          created_at?: string
          duracion_mezcla_min?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          mezcla_max_g?: number
          mezcla_min_g?: number
          nombre: string
          porcion_estandar_g?: number
          tolerancia_ajuste_g?: number
        }
        Update: {
          created_at?: string
          duracion_mezcla_min?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          mezcla_max_g?: number
          mezcla_min_g?: number
          nombre?: string
          porcion_estandar_g?: number
          tolerancia_ajuste_g?: number
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
          estado: Database["public"]["Enums"]["estado_conteo"]
          fecha: string
          id: string
          motivo_rechazo: string | null
          notas: string | null
          revisado_at: string | null
          revisado_por: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_conteo"]
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_conteo"]
          fecha?: string
          id?: string
          motivo_rechazo?: string | null
          notas?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_conteo"]
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_conteo"]
          fecha?: string
          id?: string
          motivo_rechazo?: string | null
          notas?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteos_inventario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteos_inventario_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          destinatario_id: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          id: string
          leida_por: string[]
          mensaje: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
        }
        Insert: {
          created_at?: string
          destinatario_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida_por?: string[]
          mensaje?: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
        }
        Update: {
          created_at?: string
          destinatario_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          leida_por?: string[]
          mensaje?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permisos: {
        Row: {
          id: string
          puede_editar: boolean
          puede_ver: boolean
          seccion: Database["public"]["Enums"]["app_seccion"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          puede_editar?: boolean
          puede_ver?: boolean
          seccion: Database["public"]["Enums"]["app_seccion"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          puede_editar?: boolean
          puede_ver?: boolean
          seccion?: Database["public"]["Enums"]["app_seccion"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permisos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permisos_user_id_fkey"
            columns: ["user_id"]
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
      donaciones: {
        Row: {
          cantidad: number | null
          created_at: string
          created_by: string | null
          destinatario: string
          estado: Database["public"]["Enums"]["estado_donacion"]
          id: string
          motivo: string
          motivo_rechazo: string | null
          origen: Database["public"]["Enums"]["origen_donacion"]
          pedido_id: string | null
          producto_lote_id: string | null
          revisado_at: string | null
          revisado_por: string | null
          valor_comercial: number
        }
        Insert: {
          cantidad?: number | null
          created_at?: string
          created_by?: string | null
          destinatario: string
          estado?: Database["public"]["Enums"]["estado_donacion"]
          id?: string
          motivo: string
          motivo_rechazo?: string | null
          origen: Database["public"]["Enums"]["origen_donacion"]
          pedido_id?: string | null
          producto_lote_id?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          valor_comercial?: number
        }
        Update: {
          cantidad?: number | null
          created_at?: string
          created_by?: string | null
          destinatario?: string
          estado?: Database["public"]["Enums"]["estado_donacion"]
          id?: string
          motivo?: string
          motivo_rechazo?: string | null
          origen?: Database["public"]["Enums"]["origen_donacion"]
          pedido_id?: string | null
          producto_lote_id?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          valor_comercial?: number
        }
        Relationships: [
          {
            foreignKeyName: "donaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donaciones_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "producto_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donaciones_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      desperdicios: {
        Row: {
          accion_correctiva: string | null
          cantidad_kg: number
          codigo_lote: string | null
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          insumo_id: string | null
          insumo_lote_id: string | null
          motivo: Database["public"]["Enums"]["motivo_desperdicio"]
          producto_id: string | null
          producto_lote_id: string | null
          proveedor: string | null
          razon_dano: string
          temperatura_c: number | null
          variante_id: string | null
        }
        Insert: {
          accion_correctiva?: string | null
          cantidad_kg: number
          codigo_lote?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          insumo_id?: string | null
          insumo_lote_id?: string | null
          motivo?: Database["public"]["Enums"]["motivo_desperdicio"]
          producto_id?: string | null
          producto_lote_id?: string | null
          proveedor?: string | null
          razon_dano: string
          temperatura_c?: number | null
          variante_id?: string | null
        }
        Update: {
          accion_correctiva?: string | null
          cantidad_kg?: number
          codigo_lote?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          insumo_id?: string | null
          insumo_lote_id?: string | null
          motivo?: Database["public"]["Enums"]["motivo_desperdicio"]
          producto_id?: string | null
          producto_lote_id?: string | null
          proveedor?: string | null
          razon_dano?: string
          temperatura_c?: number | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desperdicios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desperdicios_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desperdicios_insumo_lote_id_fkey"
            columns: ["insumo_lote_id"]
            isOneToOne: false
            referencedRelation: "insumo_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desperdicios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desperdicios_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "producto_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desperdicios_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
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
          anulado: boolean
          anulado_at: string | null
          anulado_motivo: string | null
          anulado_por: string | null
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
          anulado?: boolean
          anulado_at?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
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
          anulado?: boolean
          anulado_at?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
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
            foreignKeyName: "ingresos_anulado_por_fkey"
            columns: ["anulado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          ingreso_item_id: string | null
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
          ingreso_item_id?: string | null
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
          ingreso_item_id?: string | null
          insumo_id?: string
          proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumo_lotes_ingreso_item_id_fkey"
            columns: ["ingreso_item_id"]
            isOneToOne: false
            referencedRelation: "ingreso_items"
            referencedColumns: ["id"]
          },
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
          rendimiento_pct: number
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
          rendimiento_pct?: number
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
          rendimiento_pct?: number
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
      orden_produccion_items: {
        Row: {
          cantidad_planificada: number
          cantidad_producida: number | null
          costo_total: number | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_produccion"]
          id: string
          motivo_diferencia: string | null
          orden_id: string
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
          estado?: Database["public"]["Enums"]["estado_produccion"]
          id?: string
          motivo_diferencia?: string | null
          orden_id: string
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
          estado?: Database["public"]["Enums"]["estado_produccion"]
          id?: string
          motivo_diferencia?: string | null
          orden_id?: string
          producto_id?: string
          producto_lote_id?: string | null
          receta_id?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_items_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_items_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_items_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_items_producto_lote_id_fkey"
            columns: ["producto_lote_id"]
            isOneToOne: false
            referencedRelation: "producto_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_produccion: {
        Row: {
          cantidad_planificada: number | null
          cantidad_producida: number | null
          costo_total: number | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_produccion"]
          fecha: string
          id: string
          notas: string | null
          numero: string | null
          orden_origen_id: string | null
          producto_id: string | null
          producto_lote_id: string | null
          receta_id: string | null
          updated_at: string | null
          updated_by: string | null
          variante_id: string | null
        }
        Insert: {
          cantidad_planificada?: number | null
          cantidad_producida?: number | null
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_produccion"]
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          orden_origen_id?: string | null
          producto_id?: string | null
          producto_lote_id?: string | null
          receta_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variante_id?: string | null
        }
        Update: {
          cantidad_planificada?: number | null
          cantidad_producida?: number | null
          costo_total?: number | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_produccion"]
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string | null
          orden_origen_id?: string | null
          producto_id?: string | null
          producto_lote_id?: string | null
          receta_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_produccion_orden_origen_id_fkey"
            columns: ["orden_origen_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_updated_by_fkey"
            columns: ["updated_by"]
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
      orden_mezcla: {
        Row: {
          config_produccion_id: string | null
          created_at: string
          desglose_presentaciones: Json | null
          grupo_firma: string | null
          grupo_id: string | null
          firma_empaco: string | null
          firma_fecho: string | null
          firma_mezclo: string | null
          firma_sello: string | null
          firma_verifico: string | null
          id: string
          mezcla_max_g: number | null
          mezcla_min_g: number | null
          num_mezclas: number | null
          num_mezclas_sugerido: number | null
          observaciones: string | null
          orden_id: string
          orden_index: number
          plan_mezclas: Json | null
          porcion_estandar: number
          producto_id: string
          total_gramos: number | null
        }
        Insert: {
          config_produccion_id?: string | null
          created_at?: string
          desglose_presentaciones?: Json | null
          grupo_firma?: string | null
          grupo_id?: string | null
          firma_empaco?: string | null
          firma_fecho?: string | null
          firma_mezclo?: string | null
          firma_sello?: string | null
          firma_verifico?: string | null
          id?: string
          mezcla_max_g?: number | null
          mezcla_min_g?: number | null
          num_mezclas?: number | null
          num_mezclas_sugerido?: number | null
          observaciones?: string | null
          orden_id: string
          orden_index?: number
          plan_mezclas?: Json | null
          porcion_estandar?: number
          producto_id: string
          total_gramos?: number | null
        }
        Update: {
          config_produccion_id?: string | null
          created_at?: string
          desglose_presentaciones?: Json | null
          grupo_firma?: string | null
          grupo_id?: string | null
          firma_empaco?: string | null
          firma_fecho?: string | null
          firma_mezclo?: string | null
          firma_sello?: string | null
          firma_verifico?: string | null
          id?: string
          mezcla_max_g?: number | null
          mezcla_min_g?: number | null
          num_mezclas?: number | null
          num_mezclas_sugerido?: number | null
          observaciones?: string | null
          orden_id?: string
          orden_index?: number
          plan_mezclas?: Json | null
          porcion_estandar?: number
          producto_id?: string
          total_gramos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_mezcla_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_mezcla_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_produccion_actividad: {
        Row: {
          created_at: string
          id: string
          orden_id: string
          payload: Json | null
          tipo: string
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          orden_id: string
          payload?: Json | null
          tipo: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          orden_id?: string
          payload?: Json | null
          tipo?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_actividad_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_sobrante: {
        Row: {
          cantidad_cocido: number
          cantidad_crudo_equiv: number
          cocido_consumido: number
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          id: string
          insumo_id: string
          merma_pct_snap: number
          nota: string | null
          orden_mezcla_id: string | null
          orden_origen_id: string
          rendimiento_pct_snap: number
        }
        Insert: {
          cantidad_cocido: number
          cantidad_crudo_equiv: number
          cocido_consumido?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          insumo_id: string
          merma_pct_snap: number
          nota?: string | null
          orden_mezcla_id?: string | null
          orden_origen_id: string
          rendimiento_pct_snap: number
        }
        Update: {
          cantidad_cocido?: number
          cantidad_crudo_equiv?: number
          cocido_consumido?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          insumo_id?: string
          merma_pct_snap?: number
          nota?: string | null
          orden_mezcla_id?: string | null
          orden_origen_id?: string
          rendimiento_pct_snap?: number
        }
        Relationships: []
      }
      insumo_sobrante_aplicacion: {
        Row: {
          cantidad_cocido: number
          cantidad_crudo: number
          created_at: string
          id: string
          orden_destino_id: string
          sobrante_id: string
        }
        Insert: {
          cantidad_cocido: number
          cantidad_crudo: number
          created_at?: string
          id?: string
          orden_destino_id: string
          sobrante_id: string
        }
        Update: {
          cantidad_cocido?: number
          cantidad_crudo?: number
          created_at?: string
          id?: string
          orden_destino_id?: string
          sobrante_id?: string
        }
        Relationships: []
      }
      orden_produccion_procesos: {
        Row: {
          cant_a_cocinar_crudo: number | null
          cant_cocido_requerido: number | null
          cant_obtenida_cocido: number | null
          cant_real_crudo: number | null
          cant_requerida_crudo: number | null
          cant_saldo_crudo: number
          created_at: string
          factor_conversion: number | null
          empaque_conforme: boolean | null
          id: string
          insumo_id: string
          kilos_antes_molido: number | null
          kilos_final_molido: number | null
          liberacion_lote: boolean | null
          lotes: string | null
          orden_id: string
          orden_index: number
          responsable: string | null
          responsable_coccion: string | null
          rotulado: boolean | null
          temp_descongelacion: number | null
          temp_final_coccion: number | null
          tiempo_coccion_horas: number | null
          tiempo_molienda: number | null
        }
        Insert: {
          cant_a_cocinar_crudo?: number | null
          cant_cocido_requerido?: number | null
          cant_obtenida_cocido?: number | null
          cant_real_crudo?: number | null
          cant_requerida_crudo?: number | null
          cant_saldo_crudo?: number
          created_at?: string
          factor_conversion?: number | null
          empaque_conforme?: boolean | null
          id?: string
          insumo_id: string
          kilos_antes_molido?: number | null
          kilos_final_molido?: number | null
          liberacion_lote?: boolean | null
          lotes?: string | null
          orden_id: string
          orden_index?: number
          responsable?: string | null
          responsable_coccion?: string | null
          rotulado?: boolean | null
          temp_descongelacion?: number | null
          temp_final_coccion?: number | null
          tiempo_coccion_horas?: number | null
          tiempo_molienda?: number | null
        }
        Update: {
          cant_a_cocinar_crudo?: number | null
          cant_cocido_requerido?: number | null
          cant_obtenida_cocido?: number | null
          cant_real_crudo?: number | null
          cant_requerida_crudo?: number | null
          cant_saldo_crudo?: number
          created_at?: string
          factor_conversion?: number | null
          empaque_conforme?: boolean | null
          id?: string
          insumo_id?: string
          kilos_antes_molido?: number | null
          kilos_final_molido?: number | null
          liberacion_lote?: boolean | null
          lotes?: string | null
          orden_id?: string
          orden_index?: number
          responsable?: string | null
          responsable_coccion?: string | null
          rotulado?: boolean | null
          temp_descongelacion?: number | null
          temp_final_coccion?: number | null
          tiempo_coccion_horas?: number | null
          tiempo_molienda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_procesos_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_procesos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
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
      pedido_mascotas: {
        Row: {
          mascota_id: string
          pedido_id: string
        }
        Insert: {
          mascota_id: string
          pedido_id: string
        }
        Update: {
          mascota_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_mascotas_mascota_id_fkey"
            columns: ["mascota_id"]
            isOneToOne: false
            referencedRelation: "mascotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_mascotas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
          es_donacion: boolean
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
          es_donacion?: boolean
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
          es_donacion?: boolean
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
          gramaje_g: number | null
          id: string
          is_active: boolean
          precio_por_gramo: number | null
          precio_publico: number
          presentacion: string
          producto_id: string
          sku: string
          stock_minimo: number
        }
        Insert: {
          created_at?: string
          gramaje_g?: number | null
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico: number
          presentacion: string
          producto_id: string
          sku: string
          stock_minimo?: number
        }
        Update: {
          created_at?: string
          gramaje_g?: number | null
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico?: number
          presentacion?: string
          producto_id?: string
          sku?: string
          stock_minimo?: number
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
          base_gramos: number | null
          base_modo: string
          created_at: string
          firma: string | null
          id: string
          is_active: boolean
          nombre: string
          producto_id: string
          reemplazada_por: string | null
          rendimiento: number
          variante_id: string | null
        }
        Insert: {
          base_gramos?: number | null
          base_modo?: string
          created_at?: string
          firma?: string | null
          id?: string
          is_active?: boolean
          nombre: string
          producto_id: string
          reemplazada_por?: string | null
          rendimiento: number
          variante_id?: string | null
        }
        Update: {
          base_gramos?: number | null
          base_modo?: string
          created_at?: string
          firma?: string | null
          id?: string
          is_active?: boolean
          nombre?: string
          producto_id?: string
          reemplazada_por?: string | null
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
      v_desperdicio_resumen: {
        Row: {
          eventos: number | null
          fecha: string | null
          insumo_id: string | null
          item_nombre: string | null
          kg: number | null
          motivo: Database["public"]["Enums"]["motivo_desperdicio"] | null
          producto_id: string | null
          proveedor: string | null
          variante_id: string | null
        }
        Relationships: []
      }
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
          rendimiento_pct: number | null
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
          stock_minimo: number | null
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
      fn_ajuste_inventario: {
        Args: {
          p_cantidad: number
          p_es_merma?: boolean
          p_insumo_id: string | null
          p_motivo: string
          p_producto_id: string | null
          p_variante_id: string | null
        }
        Returns: undefined
      }
      fn_ajustar_lote_pt: {
        Args: {
          p_cantidad: number
          p_lote_id: string
          p_motivo: string
          p_referencia_tipo?: string
        }
        Returns: undefined
      }
      fn_anular_ingreso: {
        Args: { p_ingreso_id: string; p_motivo: string }
        Returns: undefined
      }
      fn_calcular_firma_receta: {
        Args: { p_receta_id: string }
        Returns: string
      }
      fn_calcular_pct_cierre_meta: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: number
      }
      fn_aplicar_saldos_orden: {
        Args: { p_orden_id: string }
        Returns: {
          a_cocinar_crudo: number
          insumo_id: string
          saldo_crudo: number
        }[]
      }
      fn_crudo_desde_cocido: {
        Args: {
          p_cocido: number
          p_merma_pct: number
          p_rendimiento_pct: number
        }
        Returns: number
      }
      fn_insumos_mezcla: {
        Args: { p_orden_mezcla_id: string }
        Returns: {
          cocido_requerido: number
          factor_conversion: number
          insumo_id: string
          insumo_nombre: string
          merma_pct: number
          rendimiento_pct: number
          sobrante_actual: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
        }[]
      }
      fn_liberar_saldos_orden: {
        Args: { p_orden_id: string }
        Returns: undefined
      }
      fn_porciones_base: {
        Args: {
          p_cantidad: number
          p_receta_id: string
          p_variante_id: string
        }
        Returns: number
      }
      fn_registrar_sobrante_mezcla: {
        Args: { p_items: Json; p_orden_mezcla_id: string }
        Returns: number
      }
      fn_agrupar_mezclas: {
        Args: { p_grupos: Json; p_orden_id: string }
        Returns: number
      }
      fn_sugerir_grupos_mezcla: {
        Args: { p_orden_id: string }
        Returns: {
          firma: string
          orden_mezcla_id: string
          producto_id: string
          producto_nombre: string
          total_gramos: number
        }[]
      }
      fn_resumen_receta: {
        Args: {
          p_cantidad: number
          p_producto_id: string
          p_variante_id?: string | null
        }
        Returns: {
          cocido_por_porcion: number
          cocido_total: number
          crudo_total: number
          factor_conversion: number
          faltante: number
          insumo_codigo: string
          insumo_id: string
          insumo_nombre: string
          merma_pct: number
          rendimiento_pct: number
          stock_disponible: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
        }[]
      }
      fn_completar_item_produccion: {
        Args: {
          p_cantidad_producida: number
          p_item_id: string
          p_motivo?: string | null
        }
        Returns: {
          costo_total: number
          costo_unitario: number
          producto_lote_id: string
        }[]
      }
      fn_crear_orden_produccion: {
        Args: { p_fecha: string; p_items: Json; p_notas: string }
        Returns: string
      }
      fn_generar_orden_faltante: {
        Args: { p_orden_id: string }
        Returns: string
      }
      fn_get_or_create_procesos_orden: {
        Args: { p_orden_id: string }
        Returns: undefined
      }
      fn_get_or_create_mezclas_orden: {
        Args: { p_orden_id: string }
        Returns: undefined
      }
      fn_cancelar_orden_produccion: {
        Args: { p_orden_id: string }
        Returns: undefined
      }
      fn_confirmar_venta: {
        Args: { p_confirmar_pago?: boolean; p_pedido_id: string }
        Returns: {
          cantidad_comprometida: number
          producto_id: string
          variante_id: string
        }[]
      }
      fn_despachar_ruta: {
        Args: { p_ruta_id: string }
        Returns: {
          advertencia: boolean
          mensaje: string
          numero_pedido: string
          producto_nombre: string
        }[]
      }
      fn_empacar_lote: {
        Args: {
          p_cantidad: number
          p_lote_id: string
          p_motivo_sobrante?: string | null
        }
        Returns: { nuevo_lote_id: string }[]
      }
      fn_estimar_comisiones_periodo: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: {
          aplica_comision: boolean
          base_calculo: number
          comision_id: string
          estado_pago: string
          is_provisional: boolean
          monto_comision: number
          numero_venta_cliente: number
          pct_comision: number
          pedido_id: string
          razon_no_comision: string | null
        }[]
      }
      fn_expirar_periodos_aliado: { Args: never; Returns: number }
      fn_explosion_materiales: {
        Args: { p_ordenes_ids?: string[] | null; p_pedidos_ids?: string[] | null }
        Returns: {
          demanda_total: number
          faltante: number
          insumo_codigo: string
          insumo_id: string
          insumo_nombre: string
          stock_disponible: number
          sugerido_comprar: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
        }[]
      }
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
      fn_pedidos_estado_counts: {
        Args: { p_desde?: string | null; p_hasta?: string | null }
        Returns: {
          estado: Database["public"]["Enums"]["estado_pedido"]
          total: number
        }[]
      }
      fn_pedidos_fuente_counts: {
        Args: { p_desde?: string | null; p_hasta?: string | null }
        Returns: {
          fuente: Database["public"]["Enums"]["fuente_cliente"]
          total: number
        }[]
      }
      fn_ventas_resumen_periodo: {
        Args: {
          p_desde?: string | null
          p_hasta?: string | null
          p_estados?: string[] | null
          p_excluir_estados?: string[] | null
        }
        Returns: { revenue: number; pedidos_count: number }[]
      }
      fn_comisiones_resumen: {
        Args: {
          p_desde?: string | null
          p_hasta?: string | null
          p_solo_sin_liquidar?: boolean
          p_solo_aplica?: boolean
        }
        Returns: { monto_total: number; comisiones_count: number }[]
      }
      fn_meta_ads_resumen: {
        Args: { p_periodo_mes: string }
        Returns: { total_leads: number; total_cierres: number }[]
      }
      fn_ventas_aliado_breakdown: {
        Args: { p_desde?: string | null; p_hasta?: string | null }
        Returns: {
          fuente: Database["public"]["Enums"]["fuente_cliente"]
          aliado_id: string
          aliado_nombre: string
          pedidos_count: number
          total: number
        }[]
      }
      fn_inventario_resumen: {
        Args: never
        Returns: {
          valor_total: number
          insumos_bajo_minimo: number
          lotes_por_vencer: number
          pt_producido: number
          pt_empacado: number
          pt_despachado: number
        }[]
      }
      fn_crear_pedido: {
        Args: { p_cabecera: Json; p_items: Json; p_mascotas?: string[] }
        Returns: Json
      }
      fn_editar_lineas_pedido: {
        Args: {
          p_pedido_id: string
          p_lineas: Json
          p_updated_at_esperado?: string | null
        }
        Returns: Json
      }
      fn_confirmar_pago_pedido: {
        Args: { p_pedido_id: string; p_metodo_pago?: string | null }
        Returns: undefined
      }
      fn_revocar_sesiones_usuario: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      fn_liquidar_periodo_mensual: {
        Args: { p_periodo_mes: string; p_vendedor_id: string }
        Returns: {
          comisiones_trasladadas: number
          liquidacion_id: string
          monto_confirmado: number
        }[]
      }
      fn_preview_consumo_item: {
        Args: { p_cantidad_producida: number; p_item_id: string }
        Returns: {
          cantidad_a_consumir: number
          cocido_requerido: number
          codigo_lote: string | null
          costo_unitario: number
          crudo_requerido: number
          disponible_total: number
          fecha_vencimiento: string | null
          insumo_id: string
          insumo_lote_id: string | null
          insumo_nombre: string
          suficiente: boolean
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
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
      fn_editar_ingreso: {
        Args: { p_cabecera: Json; p_ingreso_id: string; p_items: Json }
        Returns: { ingreso_id: string; numero: string }[]
      }
      fn_registrar_desperdicio: {
        Args: { p_items: Json }
        Returns: number
      }
      fn_donar_lote_pt: {
        Args: {
          p_cantidad: number
          p_destinatario: string
          p_lote_id: string
          p_motivo: string
        }
        Returns: string
      }
      fn_aprobar_donacion: {
        Args: { p_donacion_id: string }
        Returns: undefined
      }
      fn_rechazar_donacion: {
        Args: { p_donacion_id: string; p_motivo: string }
        Returns: undefined
      }
      fn_registrar_conteo: {
        Args: {
          p_categoria: Database["public"]["Enums"]["categoria_conteo"]
          p_items: Json
          p_motivo: string
        }
        Returns: string
      }
      fn_aprobar_conteo: {
        Args: { p_conteo_id: string }
        Returns: undefined
      }
      fn_rechazar_conteo: {
        Args: { p_conteo_id: string; p_motivo: string }
        Returns: undefined
      }
      fn_registrar_ingreso: {
        Args: { p_cabecera: Json; p_items: Json }
        Returns: { ingreso_id: string; numero: string }[]
      }
      fn_resumen_inventario: {
        Args: { p_categoria?: string | null; p_desde: string; p_hasta: string }
        Returns: {
          ajustes: number
          entradas: number
          inventario_inicial: number
          item_id: string
          nombre: string
          num_ajustes: number
          presentacion: string
          salidas: number
          tipo_item: string
          total_teorico: number
        }[]
      }
      fn_top_productos_vendidos: {
        Args: { p_limit?: number; p_desde?: string | null; p_hasta?: string | null }
        Returns: {
          nombre: string
          revenue: number
          unidades: number
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
      app_seccion:
        | "ventas"
        | "catalogo"
        | "clientes"
        | "comisiones"
        | "aliados"
        | "logistica_tablero"
        | "logistica_rutas"
        | "logistica_mensajeros"
        | "logistica_liquidacion"
        | "inventario_dashboard"
        | "inventario_explosion"
        | "inventario_ingresos"
        | "inventario_insumos"
        | "inventario_recetas"
        | "inventario_produccion"
        | "inventario_productos"
        | "inventario_remisiones"
        | "inventario_conteo"
        | "inventario_desperdicio"
        | "admin"
      motivo_desperdicio:
        | "vencimiento"
        | "quemado"
        | "cambio_temperatura"
        | "nevera_danada"
        | "bolsa_rota"
        | "contaminacion"
        | "otro"
      categoria_conteo:
        | "materia_prima"
        | "producto_seco"
        | "aseo"
        | "producto_terminado"
      estado_comision_aliado: "pendiente" | "liquidada"
      estado_conteo: "pendiente" | "aplicado" | "rechazado"
      estado_donacion: "pendiente" | "aprobada" | "rechazada"
      origen_donacion: "pedido" | "lote_pt"
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
        | "parcial"
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
        | "donacion"
      tipo_notificacion: "conteo_pendiente" | "donacion_pendiente"
      tipo_precio: "fijo" | "por_variante" | "por_gramo" | "escala"
      tipo_promocion: "paga_x_lleva_mas" | "producto_gratis"
      unidad_medida: "g" | "kg" | "ml" | "l" | "unidad"
      user_role:
        | "admin"
        | "vendedor"
        | "logistica"
        | "contable"
        | "jefe_produccion"
        | "personalizado"
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
      app_seccion: [
        "ventas",
        "catalogo",
        "clientes",
        "comisiones",
        "aliados",
        "logistica_tablero",
        "logistica_rutas",
        "logistica_mensajeros",
        "logistica_liquidacion",
        "inventario_dashboard",
        "inventario_explosion",
        "inventario_ingresos",
        "inventario_insumos",
        "inventario_recetas",
        "inventario_produccion",
        "inventario_productos",
        "inventario_remisiones",
        "inventario_conteo",
        "inventario_desperdicio",
        "admin",
      ],
      motivo_desperdicio: [
        "vencimiento",
        "quemado",
        "cambio_temperatura",
        "nevera_danada",
        "bolsa_rota",
        "contaminacion",
        "otro",
      ],
      categoria_conteo: [
        "materia_prima",
        "producto_seco",
        "aseo",
        "producto_terminado",
      ],
      estado_comision_aliado: ["pendiente", "liquidada"],
      estado_conteo: ["pendiente", "aplicado", "rechazado"],
      estado_donacion: ["pendiente", "aprobada", "rechazada"],
      origen_donacion: ["pedido", "lote_pt"],
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
        "parcial",
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
        "donacion",
      ],
      tipo_notificacion: ["conteo_pendiente", "donacion_pendiente"],
      tipo_precio: ["fijo", "por_variante", "por_gramo", "escala"],
      tipo_promocion: ["paga_x_lleva_mas", "producto_gratis"],
      unidad_medida: ["g", "kg", "ml", "l", "unidad"],
      user_role: [
        "admin",
        "vendedor",
        "logistica",
        "contable",
        "jefe_produccion",
        "personalizado",
      ],
    },
  },
} as const
