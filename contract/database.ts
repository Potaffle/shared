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
          translations: Json
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
          translations?: Json
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
          translations?: Json
        }
        Relationships: []
      }
      menu_item_components: {
        Row: {
          component_id: string
          item_id: string
          locked_groups: string[]
          preset: Json
          qty: number
        }
        Insert: {
          component_id: string
          item_id: string
          locked_groups?: string[]
          preset?: Json
          qty?: number
        }
        Update: {
          component_id?: string
          item_id?: string
          locked_groups?: string[]
          preset?: Json
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
          blurb: string | null
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
          translations: Json
        }
        Insert: {
          active?: boolean
          blurb?: string | null
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
          translations?: Json
        }
        Update: {
          active?: boolean
          blurb?: string | null
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
          translations?: Json
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
          translations: Json
        }
        Insert: {
          active?: boolean
          group: Database["public"]["Enums"]["modifier_group"]
          id?: string
          name: string
          price?: number
          sort?: number
          stock_key?: string
          translations?: Json
        }
        Update: {
          active?: boolean
          group?: Database["public"]["Enums"]["modifier_group"]
          id?: string
          name?: string
          price?: number
          sort?: number
          stock_key?: string
          translations?: Json
        }
        Relationships: []
      }
      menu_option_groups: {
        Row: {
          active: boolean
          extra_price: number
          free_count: number
          free_count_by_group: string | null
          id: string
          item_id: string
          max_picks: number
          name: string
          parent_group_id: string | null
          pick: Database["public"]["Enums"]["pick_mode"]
          price_mode: Database["public"]["Enums"]["price_mode"]
          required: boolean
          sort: number
          translations: Json
        }
        Insert: {
          active?: boolean
          extra_price?: number
          free_count?: number
          free_count_by_group?: string | null
          id?: string
          item_id: string
          max_picks?: number
          name: string
          parent_group_id?: string | null
          pick?: Database["public"]["Enums"]["pick_mode"]
          price_mode?: Database["public"]["Enums"]["price_mode"]
          required?: boolean
          sort?: number
          translations?: Json
        }
        Update: {
          active?: boolean
          extra_price?: number
          free_count?: number
          free_count_by_group?: string | null
          id?: string
          item_id?: string
          max_picks?: number
          name?: string
          parent_group_id?: string | null
          pick?: Database["public"]["Enums"]["pick_mode"]
          price_mode?: Database["public"]["Enums"]["price_mode"]
          required?: boolean
          sort?: number
          translations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "menu_option_groups_free_count_by_group_fkey"
            columns: ["free_count_by_group"]
            isOneToOne: false
            referencedRelation: "menu_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_option_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_availability"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "menu_option_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_option_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "menu_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_options: {
        Row: {
          active: boolean
          exclusive: boolean
          free_count: number | null
          group_id: string
          id: string
          is_default: boolean
          name: string
          price: number | null
          sort: number
          stock_key: string | null
          translations: Json
        }
        Insert: {
          active?: boolean
          exclusive?: boolean
          free_count?: number | null
          group_id: string
          id?: string
          is_default?: boolean
          name: string
          price?: number | null
          sort?: number
          stock_key?: string | null
          translations?: Json
        }
        Update: {
          active?: boolean
          exclusive?: boolean
          free_count?: number | null
          group_id?: string
          id?: string
          is_default?: boolean
          name?: string
          price?: number | null
          sort?: number
          stock_key?: string | null
          translations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "menu_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_option_groups"
            referencedColumns: ["id"]
          },
        ]
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
          selections: Json
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
          selections?: Json
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
          selections?: Json
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
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
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
      customer_stats: {
        Row: {
          created_at: string | null
          id: string | null
          last_order_at: string | null
          last_order_day: string | null
          name: string | null
          orders: number | null
          phone: string | null
          points: number | null
          spent: number | null
        }
        Relationships: []
      }
      daily_payments: {
        Row: {
          day: string | null
          orders: number | null
          pay: Database["public"]["Enums"]["payment_method"] | null
          revenue: number | null
        }
        Relationships: []
      }
      daily_sauces: {
        Row: {
          day: string | null
          free: number | null
          paid: number | null
          taken: number | null
          unknown: number | null
        }
        Relationships: []
      }
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
      item_sales: {
        Row: {
          category: string | null
          day: string | null
          kind: string | null
          menu_item_id: string | null
          name: string | null
          orders: number | null
          qty: number | null
          revenue: number | null
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
        ]
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
      option_sales: {
        Row: {
          component: string | null
          day: string | null
          group_name: string | null
          item_name: string | null
          kind: string | null
          menu_item_id: string | null
          option: string | null
          paid_qty: number | null
          placement: string | null
          qty: number | null
          revenue: number | null
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
        ]
      }
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      business_day: { Args: { ts?: string }; Returns: string }
      close_earlier_days: {
        Args: never
        Returns: {
          cancelled: number
          completed: number
        }[]
      }
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
      stock_key_in_use: { Args: { p_key: string }; Returns: boolean }
    }
    Enums: {
      menu_config: "none" | "sauces" | "tops"
      modifier_group: "sauce" | "topping"
      order_source: "counter" | "qr"
      order_status: "pending" | "approved" | "completed" | "cancelled"
      payment_method: "Cash" | "Card" | "CliQ" | "Apple Pay"
      pick_mode: "one" | "many"
      price_mode: "add" | "replace"
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
      pick_mode: ["one", "many"],
      price_mode: ["add", "replace"],
    },
  },
} as const
