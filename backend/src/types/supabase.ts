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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      games_rugs_fun: {
        Row: {
          crash_multiplier: number | null
          created_at: string
          game_id: string | null
          id: string
          total_volume: number | null
        }
        Insert: {
          crash_multiplier?: number | null
          created_at?: string
          game_id?: string | null
          id?: string
          total_volume?: number | null
        }
        Update: {
          crash_multiplier?: number | null
          created_at?: string
          game_id?: string | null
          id?: string
          total_volume?: number | null
        }
        Relationships: []
      }
      liquidETH: {
        Row: {
          created_at: string
          id: number
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
      NFTs: {
        Row: {
          attributes: string | null
          created_at: string
          description: string | null
          id: number
          image: string | null
          name: string | null
          royalty: string | null
          transactionId: string | null
          wallet_address: string | null
        }
        Insert: {
          attributes?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string | null
          royalty?: string | null
          transactionId?: string | null
          wallet_address?: string | null
        }
        Update: {
          attributes?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image?: string | null
          name?: string | null
          royalty?: string | null
          transactionId?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      trades_rugs_fun: {
        Row: {
          amount: number | null
          created_at: string
          game_id: string | null
          id: number
          payout_multiplier: number | null
          profit_loss: number | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          game_id?: string | null
          id?: number
          payout_multiplier?: number | null
          profit_loss?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          game_id?: string | null
          id?: number
          payout_multiplier?: number | null
          profit_loss?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_rugs_fun_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games_rugs_fun"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "trades_rugs_fun_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_rugsfun"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      txns: {
        Row: {
          blockHash: string | null
          created_at: string
          id: number
          status: string | null
          txn: string | null
          wallet_address: string | null
        }
        Insert: {
          blockHash?: string | null
          created_at?: string
          id?: number
          status?: string | null
          txn?: string | null
          wallet_address?: string | null
        }
        Update: {
          blockHash?: string | null
          created_at?: string
          id?: number
          status?: string | null
          txn?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "txns_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "liquidETH"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      users_rugsfun: {
        Row: {
          balance: number | null
          created_at: string
          depositedBalance: number | null
          id: string
          wallet_address: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          depositedBalance?: number | null
          id?: string
          wallet_address?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          depositedBalance?: number | null
          id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
