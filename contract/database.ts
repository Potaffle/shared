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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      legacy_daily_stats: {
        Row: {
          day: string
          drinks: number | null
          fries: number | null
          imported_at: string
          notes: string | null
          orders: number | null
          revenue: number | null
          sauces: number | null
          source: string
          student_offers: number | null
          waffles: number | null
        }
        Insert: {
          day: string
          drinks?: number | null
          fries?: number | null
          imported_at?: string
          notes?: string | null
          orders?: number | null
          revenue?: number | null
          sauces?: number | null
          source: string
          student_offers?: number | null
          waffles?: number | null
        }
        Update: {
          day?: string
          drinks?: number | null
          fries?: number | null
          imported_at?: string
          notes?: string | null
          orders?: number | null
          revenue?: number | null
          sauces?: number | null
          source?: string
          student_offers?: number | null
          waffles?: number | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      menu_item_components: {
        Row: {
          component_id: string
          item_id: string
          qty: number
        }
        Insert: {
          component_id: string
          item_id: string
          qty?: number
        }
        Update: {
          component_id?: string
          item_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "menu_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "menu_item_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_components_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "menu_item_components_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          active: boolean
          category_id: string
          config: Database["public"]["Enums"]["menu_config"]
          description: string | null
          id: string
          image_path: string | null
          kind: string
          line_name: string | null
          name: string
          price: number
          slug: string
          sort: number
          stock_key: string
        }
        Insert: {
          active?: boolean
          category_id: string
          config?: Database["public"]["Enums"]["menu_config"]
          description?: string | null
          id?: string
          image_path?: string | null
          kind: string
          line_name?: string | null
          name: string
          price: number
          slug: string
          sort?: number
          stock_key: string
        }
        Update: {
          active?: boolean
          category_id?: string
          config?: Database["public"]["Enums"]["menu_config"]
          description?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          line_name?: string | null
          name?: string
          price?: number
          slug?: string
          sort?: number
          stock_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_modifiers: {
        Row: {
          active: boolean
          group: Database["public"]["Enums"]["modifier_group"]
          id: string
          name: string
          price: number
          sort: number
          stock_key: string
        }
        Insert: {
          active?: boolean
          group: Database["public"]["Enums"]["modifier_group"]
          id?: string
          name: string
          price?: number
          sort?: number
          stock_key?: string
        }
        Update: {
          active?: boolean
          group?: Database["public"]["Enums"]["modifier_group"]
          id?: string
          name?: string
          price?: number
          sort?: number
          stock_key?: string
        }
        Relationships: []
      }
      order_day_counters: {
        Row: {
          day_key: string
          last_num: number
        }
        Insert: {
          day_key: string
          last_num: number
        }
        Update: {
          day_key?: string
          last_num?: number
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          components: Json
          id: string
          kind: string
          menu_item_id: string | null
          mods: string[]
          name: string
          order_id: string
          qty: number
          sort: number
          unit: number
        }
        Insert: {
          components?: Json
          id?: string
          kind: string
          menu_item_id?: string | null
          mods?: string[]
          name: string
          order_id: string
          qty: number
          sort?: number
          unit: number
        }
        Update: {
          components?: Json
          id?: string
          kind?: string
          menu_item_id?: string | null
          mods?: string[]
          name?: string
          order_id?: string
          qty?: number
          sort?: number
          unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "order_lines_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          day_key: string
          id: string
          num: number
          paid_at: string | null
          pay: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          seq: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          day_key: string
          id?: string
          num: number
          paid_at?: string | null
          pay: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          seq: number
          source: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          day_key?: string
          id?: string
          num?: number
          paid_at?: string | null
          pay?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          seq?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stock: {
        Row: {
          key: string
          out: boolean
          updated_at: string
        }
        Insert: {
          key: string
          out?: boolean
          updated_at?: string
        }
        Update: {
          key?: string
          out?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_stats: {
        Row: {
          day: string | null
          drinks: number | null
          fries: number | null
          notes: string | null
          orders: number | null
          revenue: number | null
          sauces: number | null
          source: string | null
          student_offers: number | null
          waffles: number | null
        }
        Relationships: []
      }
      menu_availability: {
        Row: {
          active: boolean | null
          component_out: boolean | null
          item_id: string | null
          kind: string | null
          out: boolean | null
          out_components: string[] | null
          own_out: boolean | null
          slug: string | null
          stock_key: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      business_day: { Args: { ts?: string }; Returns: string }
      components_count: {
        Args: { p_components: Json; p_kinds: string[] }
        Returns: number
      }
      get_order: { Args: { p_id: string }; Returns: Json }
      insert_order: {
        Args: { p_lines: Json; p_order: Json }
        Returns: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          day_key: string
          id: string
          num: number
          paid_at: string | null
          pay: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          seq: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_owner: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      line_components: {
        Args: { p_kind: string; p_menu_item_id: string }
        Returns: Json
      }
      set_user_role: {
        Args: { p_email: string; p_role: string }
        Returns: undefined
      }
    }
    Enums: {
      menu_config: "none" | "sauces" | "tops"
      modifier_group: "sauce" | "topping"
      order_source: "counter" | "qr"
      order_status: "pending" | "approved" | "completed" | "cancelled"
      payment_method: "Cash" | "Card" | "CliQ" | "Apple Pay"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      menu_config: ["none", "sauces", "tops"],
      modifier_group: ["sauce", "topping"],
      order_source: ["counter", "qr"],
      order_status: ["pending", "approved", "completed", "cancelled"],
      payment_method: ["Cash", "Card", "CliQ", "Apple Pay"],
    },
  },
} as const
