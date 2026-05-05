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
          periodo_activo: boolean
        }
        Insert: {
          aliado_id: string
          cliente_id: string
          created_at?: string
          fecha_fin_comision?: string | null
          fecha_inicio_comision?: string | null
          id?: string
          periodo_activo?: boolean
        }
        Update: {
          aliado_id?: string
          cliente_id?: string
          created_at?: string
          fecha_fin_comision?: string | null
          fecha_inicio_comision?: string | null
          id?: string
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
          numero_documento: string
          pct_descuento_distribuidor: number
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          updated_at: string
          zona_id: string | null
        }
        Insert: {
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
          numero_documento: string
          pct_descuento_distribuidor?: number
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string
          zona_id?: string | null
        }
        Update: {
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
          liquidacion_id: string | null
          monto_comision: number
          numero_venta_cliente: number
          pct_comision: number
          pedido_id: string
          razon_no_comision: string | null
        }
        Insert: {
          aplica_comision?: boolean
          base_calculo: number
          created_at?: string
          id?: string
          liquidacion_id?: string | null
          monto_comision?: number
          numero_venta_cliente: number
          pct_comision?: number
          pedido_id: string
          razon_no_comision?: string | null
        }
        Update: {
          aplica_comision?: boolean
          base_calculo?: number
          created_at?: string
          id?: string
          liquidacion_id?: string | null
          monto_comision?: number
          numero_venta_cliente?: number
          pct_comision?: number
          pedido_id?: string
          razon_no_comision?: string | null
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
      detalle_pedido: {
        Row: {
          aplica_descuento: boolean
          cantidad: number
          created_at: string
          es_magistral: boolean
          gramaje_magistral: number | null
          id: string
          nombre_snapshot: string
          notas_magistral: string | null
          pedido_id: string
          precio_unitario_snapshot: number
          producto_id: string
          subtotal: number
          variante_id: string | null
        }
        Insert: {
          aplica_descuento?: boolean
          cantidad?: number
          created_at?: string
          es_magistral?: boolean
          gramaje_magistral?: number | null
          id?: string
          nombre_snapshot: string
          notas_magistral?: string | null
          pedido_id: string
          precio_unitario_snapshot: number
          producto_id: string
          subtotal: number
          variante_id?: string | null
        }
        Update: {
          aplica_descuento?: boolean
          cantidad?: number
          created_at?: string
          es_magistral?: boolean
          gramaje_magistral?: number | null
          id?: string
          nombre_snapshot?: string
          notas_magistral?: string | null
          pedido_id?: string
          precio_unitario_snapshot?: number
          producto_id?: string
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
            foreignKeyName: "detalle_pedido_variante_id_fkey"
            columns: ["variante_id"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
        ]
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
          cliente_id: string
          created_at: string
          descuento_envio: number
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
          zona_id: string | null
        }
        Insert: {
          aliado_id?: string | null
          cliente_id: string
          created_at?: string
          descuento_envio?: number
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
          zona_id?: string | null
        }
        Update: {
          aliado_id?: string | null
          cliente_id?: string
          created_at?: string
          descuento_envio?: number
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
            foreignKeyName: "pedidos_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas_envio"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico: number
          presentacion: string
          producto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          precio_por_gramo?: number | null
          precio_publico?: number
          presentacion?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_variantes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
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
          sku: string
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
          sku: string
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
          sku?: string
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
          mensajero_celular: string
          mensajero_nombre: string
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
          mensajero_celular: string
          mensajero_nombre: string
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
          mensajero_celular?: string
          mensajero_nombre?: string
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
      [_ in never]: never
    }
    Functions: {
      fn_get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
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
      tipo_precio: "fijo" | "por_variante" | "por_gramo" | "escala"
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
      ],
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
      tipo_precio: ["fijo", "por_variante", "por_gramo", "escala"],
      user_role: ["admin", "vendedor", "logistica", "contable"],
    },
  },
} as const
