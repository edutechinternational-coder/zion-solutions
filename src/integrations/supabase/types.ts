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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      capital_pool: {
        Row: {
          currency: string
          id: string
          origin_amount_gbp: number
          total_capital_cents: number
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: string
          origin_amount_gbp?: number
          total_capital_cents?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          origin_amount_gbp?: number
          total_capital_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          first_due_date: string | null
          id: string
          installment_cents: number
          monthly_rate: number
          paid_cents: number
          principal_cents: number
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
          term_months: number
          total_due_cents: number
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          first_due_date?: string | null
          id?: string
          installment_cents: number
          monthly_rate?: number
          paid_cents?: number
          principal_cents: number
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          term_months: number
          total_due_cents: number
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          first_due_date?: string | null
          id?: string
          installment_cents?: number
          monthly_rate?: number
          paid_cents?: number
          principal_cents?: number
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          term_months?: number
          total_due_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          id: string
          loan_id: string
          method: string
          paid_at: string
          registered_by: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          id?: string
          loan_id: string
          method?: string
          paid_at?: string
          registered_by?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          id?: string
          loan_id?: string
          method?: string
          paid_at?: string
          registered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_status: Database["public"]["Enums"]["address_status"]
          cep: string | null
          city: string
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          neighborhood: string
          phone: string | null
          state: string
          street: string | null
          updated_at: string
        }
        Insert: {
          address_status?: Database["public"]["Enums"]["address_status"]
          cep?: string | null
          city?: string
          cpf?: string | null
          created_at?: string
          full_name?: string
          id: string
          neighborhood?: string
          phone?: string | null
          state?: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          address_status?: Database["public"]["Enums"]["address_status"]
          cep?: string | null
          city?: string
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          neighborhood?: string
          phone?: string | null
          state?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      capital_summary: {
        Args: never
        Returns: {
          disponivel_cents: number
          emprestado_cents: number
          recebido_cents: number
          total_cents: number
        }[]
      }
      create_loan_request: {
        Args: {
          _actor: string
          _principal_cents: number
          _purpose?: string
          _term_months: number
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          first_due_date: string | null
          id: string
          installment_cents: number
          monthly_rate: number
          paid_cents: number
          principal_cents: number
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
          term_months: number
          total_due_cents: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_loan: {
        Args: {
          _actor: string
          _approve: boolean
          _loan_id: string
          _note?: string
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          first_due_date: string | null
          id: string
          installment_cents: number
          monthly_rate: number
          paid_cents: number
          principal_cents: number
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
          term_months: number
          total_due_cents: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_late_loans: { Args: never; Returns: undefined }
      register_payment: {
        Args: {
          _actor: string
          _amount_cents: number
          _loan_id: string
          _method?: string
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          first_due_date: string | null
          id: string
          installment_cents: number
          monthly_rate: number
          paid_cents: number
          principal_cents: number
          purpose: string | null
          status: Database["public"]["Enums"]["loan_status"]
          term_months: number
          total_due_cents: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      address_status: "pendente" | "verificado" | "recusado"
      app_role: "admin" | "cliente"
      loan_status:
        | "pendente"
        | "aprovado"
        | "reprovado"
        | "quitado"
        | "atrasado"
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
      address_status: ["pendente", "verificado", "recusado"],
      app_role: ["admin", "cliente"],
      loan_status: ["pendente", "aprovado", "reprovado", "quitado", "atrasado"],
    },
  },
} as const
