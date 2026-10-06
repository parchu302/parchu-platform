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
  public: {
    Tables: {
      Business: {
        Row: {
          category: string
          contactInfo: string
          createdAt: string
          deletedAt: string | null
          deleteReason: string | null
          description: string
          id: string
          name: string
          ownerId: string
          status: Database["public"]["Enums"]["BusinessStatus"]
        }
        Insert: {
          category: string
          contactInfo: string
          createdAt?: string
          deletedAt?: string | null
          deleteReason?: string | null
          description: string
          id?: string
          name: string
          ownerId: string
          status?: Database["public"]["Enums"]["BusinessStatus"]
        }
        Update: {
          category?: string
          contactInfo?: string
          createdAt?: string
          deletedAt?: string | null
          deleteReason?: string | null
          description?: string
          id?: string
          name?: string
          ownerId?: string
          status?: Database["public"]["Enums"]["BusinessStatus"]
        }
        Relationships: [
          {
            foreignKeyName: "Business_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Notification: {
        Row: {
          createdAt: string
          id: string
          message: string
          read: boolean
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          message: string
          read?: boolean
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          message?: string
          read?: boolean
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Order: {
        Row: {
          businessId: string
          cancelReason: string | null
          codeLocked: boolean
          confirmationCodeEncrypted: string
          confirmationCodeHash: string
          createdAt: string
          failedAttempts: number
          guestContact: string
          guestName: string
          id: string
          paymentMethodId: string
          status: Database["public"]["Enums"]["OrderStatus"]
          total: number
          trackingToken: string
          updatedAt: string
        }
        Insert: {
          businessId: string
          cancelReason?: string | null
          codeLocked?: boolean
          confirmationCodeEncrypted: string
          confirmationCodeHash: string
          createdAt?: string
          failedAttempts?: number
          guestContact: string
          guestName: string
          id?: string
          paymentMethodId: string
          status?: Database["public"]["Enums"]["OrderStatus"]
          total: number
          trackingToken: string
          updatedAt?: string
        }
        Update: {
          businessId?: string
          cancelReason?: string | null
          codeLocked?: boolean
          confirmationCodeEncrypted?: string
          confirmationCodeHash?: string
          createdAt?: string
          failedAttempts?: number
          guestContact?: string
          guestName?: string
          id?: string
          paymentMethodId?: string
          status?: Database["public"]["Enums"]["OrderStatus"]
          total?: number
          trackingToken?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Order_businessId_fkey"
            columns: ["businessId"]
            isOneToOne: false
            referencedRelation: "Business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_paymentMethodId_fkey"
            columns: ["paymentMethodId"]
            isOneToOne: false
            referencedRelation: "PaymentMethod"
            referencedColumns: ["id"]
          },
        ]
      }
      OrderItem: {
        Row: {
          id: string
          orderId: string
          productId: string
          quantity: number
          subtotal: number
          unitPrice: number
        }
        Insert: {
          id?: string
          orderId: string
          productId: string
          quantity: number
          subtotal: number
          unitPrice: number
        }
        Update: {
          id?: string
          orderId?: string
          productId?: string
          quantity?: number
          subtotal?: number
          unitPrice?: number
        }
        Relationships: [
          {
            foreignKeyName: "OrderItem_orderId_fkey"
            columns: ["orderId"]
            isOneToOne: false
            referencedRelation: "Order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItem_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
        ]
      }
      PaymentMethod: {
        Row: {
          businessId: string
          createdAt: string
          details: Json
          id: string
          type: Database["public"]["Enums"]["PaymentType"]
        }
        Insert: {
          businessId: string
          createdAt?: string
          details: Json
          id?: string
          type: Database["public"]["Enums"]["PaymentType"]
        }
        Update: {
          businessId?: string
          createdAt?: string
          details?: Json
          id?: string
          type?: Database["public"]["Enums"]["PaymentType"]
        }
        Relationships: [
          {
            foreignKeyName: "PaymentMethod_businessId_fkey"
            columns: ["businessId"]
            isOneToOne: false
            referencedRelation: "Business"
            referencedColumns: ["id"]
          },
        ]
      }
      Product: {
        Row: {
          businessId: string
          category: string
          createdAt: string
          description: string | null
          id: string
          imageBase64: string | null
          name: string
          price: number
          salesCount: number
          status: Database["public"]["Enums"]["ProductStatus"]
          stock: number
        }
        Insert: {
          businessId: string
          category: string
          createdAt?: string
          description?: string | null
          id?: string
          imageBase64?: string | null
          name: string
          price: number
          salesCount?: number
          status?: Database["public"]["Enums"]["ProductStatus"]
          stock: number
        }
        Update: {
          businessId?: string
          category?: string
          createdAt?: string
          description?: string | null
          id?: string
          imageBase64?: string | null
          name?: string
          price?: number
          salesCount?: number
          status?: Database["public"]["Enums"]["ProductStatus"]
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "Product_businessId_fkey"
            columns: ["businessId"]
            isOneToOne: false
            referencedRelation: "Business"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          createdAt: string
          email: string
          firstName: string
          id: string
          lastName: string | null
          role: Database["public"]["Enums"]["Role"]
        }
        Insert: {
          createdAt?: string
          email: string
          firstName: string
          id: string
          lastName?: string | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Update: {
          createdAt?: string
          email?: string
          firstName?: string
          id?: string
          lastName?: string | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Relationships: []
      }
      RateLimitAttempt: {
        Row: {
          count: number
          createdAt: string
          id: string
          key: string
          windowStart: string
        }
        Insert: {
          count?: number
          createdAt?: string
          id?: string
          key: string
          windowStart: string
        }
        Update: {
          count?: number
          createdAt?: string
          id?: string
          key?: string
          windowStart?: string
        }
        Relationships: []
      }
      SellerLead: {
        Row: {
          createdAt: string
          id: string
          name: string
          sells: string
          whatsapp: string
        }
        Insert: {
          createdAt?: string
          id?: string
          name: string
          sells: string
          whatsapp: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          sells?: string
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_order_releasing_stock: {
        Args: { p_items: Json; p_order_id: string; p_reason: string }
        Returns: {
          businessId: string
          cancelReason: string | null
          codeLocked: boolean
          confirmationCodeEncrypted: string
          confirmationCodeHash: string
          createdAt: string
          failedAttempts: number
          guestContact: string
          guestName: string
          id: string
          paymentMethodId: string
          status: Database["public"]["Enums"]["OrderStatus"]
          total: number
          trackingToken: string
          updatedAt: string
        }
        SetofOptions: {
          from: "*"
          to: "Order"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_order_counting_sales: {
        Args: { p_items: Json; p_order_id: string }
        Returns: {
          businessId: string
          cancelReason: string | null
          codeLocked: boolean
          confirmationCodeEncrypted: string
          confirmationCodeHash: string
          createdAt: string
          failedAttempts: number
          guestContact: string
          guestName: string
          id: string
          paymentMethodId: string
          status: Database["public"]["Enums"]["OrderStatus"]
          total: number
          trackingToken: string
          updatedAt: string
        }
        SetofOptions: {
          from: "*"
          to: "Order"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order_with_stock_reservation: {
        Args: {
          p_business_id: string
          p_confirmation_code_encrypted: string
          p_confirmation_code_hash: string
          p_guest_contact: string
          p_guest_name: string
          p_items: Json
          p_payment_method_id: string
          p_total: number
          p_tracking_token: string
        }
        Returns: {
          businessId: string
          cancelReason: string | null
          codeLocked: boolean
          confirmationCodeEncrypted: string
          confirmationCodeHash: string
          createdAt: string
          failedAttempts: number
          guestContact: string
          guestName: string
          id: string
          paymentMethodId: string
          status: Database["public"]["Enums"]["OrderStatus"]
          total: number
          trackingToken: string
          updatedAt: string
        }
        SetofOptions: {
          from: "*"
          to: "Order"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      increment_rate_limit: {
        Args: { p_cutoff: string; p_key: string; p_window_start: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      owns_business: { Args: { business_id: string }; Returns: boolean }
    }
    Enums: {
      BusinessStatus: "PENDIENTE" | "APROBADO" | "PAUSADO"
      OrderStatus:
        | "PENDIENTE"
        | "RECIBIDO"
        | "ENTREGADO"
        | "COMPLETADO"
        | "CANCELADO"
      PaymentType:
        | "TRANSFERENCIA"
        | "NEQUI"
        | "DAVIPLATA"
        | "YAPE_PLIN"
        | "EFECTIVO"
        | "OTRO"
      ProductStatus: "PUBLICADO" | "OCULTO"
      Role: "EMPRENDEDOR" | "ADMIN"
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
  public: {
    Enums: {
      BusinessStatus: ["PENDIENTE", "APROBADO", "PAUSADO"],
      OrderStatus: [
        "PENDIENTE",
        "RECIBIDO",
        "ENTREGADO",
        "COMPLETADO",
        "CANCELADO",
      ],
      PaymentType: [
        "TRANSFERENCIA",
        "NEQUI",
        "DAVIPLATA",
        "YAPE_PLIN",
        "EFECTIVO",
        "OTRO",
      ],
      ProductStatus: ["PUBLICADO", "OCULTO"],
      Role: ["EMPRENDEDOR", "ADMIN"],
    },
  },
} as const
