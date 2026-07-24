export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      businesses: {
        Row: {
          address: string | null;
          category: string | null;
          contact_name: string | null;
          created_at: string;
          currency: string;
          email: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          phone: string | null;
          quotation_counter: number;
          quotation_prefix: string;
          tax_info: string | null;
          updated_at: string;
          user_id: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          category?: string | null;
          contact_name?: string | null;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          quotation_counter?: number;
          quotation_prefix?: string;
          tax_info?: string | null;
          updated_at?: string;
          user_id: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          category?: string | null;
          contact_name?: string | null;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          quotation_counter?: number;
          quotation_prefix?: string;
          tax_info?: string | null;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          address: string | null;
          company: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          tax_number: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          tax_number?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tax_number?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotations: {
        Row: {
          answers: Json;
          business_id: string | null;
          client_id: string | null;
          created_at: string;
          currency: string;
          discount: number;
          expiry_date: string | null;
          id: string;
          issue_date: string;
          items: Json;
          notes: string | null;
          quotation_number: string;
          status: string;
          subtotal: number;
          tax: number;
          template_id: string | null;
          title: string | null;
          total: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          business_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          currency?: string;
          discount?: number;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string;
          items?: Json;
          notes?: string | null;
          quotation_number: string;
          status?: string;
          subtotal?: number;
          tax?: number;
          template_id?: string | null;
          title?: string | null;
          total?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          business_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          currency?: string;
          discount?: number;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string;
          items?: Json;
          notes?: string | null;
          quotation_number?: string;
          status?: string;
          subtotal?: number;
          tax?: number;
          template_id?: string | null;
          title?: string | null;
          total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_card_items: {
        Row: {
          active: boolean;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          rate: number;
          tax_rate: number | null;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          rate?: number;
          tax_rate?: number | null;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          rate?: number;
          tax_rate?: number | null;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      template_fields: {
        Row: {
          calc_formula: string | null;
          category: string;
          confidence: number | null;
          created_at: string;
          default_value: Json | null;
          example_value: string | null;
          field_type: string;
          help_text: string | null;
          id: string;
          key: string;
          label: string;
          options: Json | null;
          required: boolean;
          sort_order: number;
          template_id: string;
          user_id: string;
        };
        Insert: {
          calc_formula?: string | null;
          category?: string;
          confidence?: number | null;
          created_at?: string;
          default_value?: Json | null;
          example_value?: string | null;
          field_type: string;
          help_text?: string | null;
          id?: string;
          key: string;
          label: string;
          options?: Json | null;
          required?: boolean;
          sort_order?: number;
          template_id: string;
          user_id: string;
        };
        Update: {
          calc_formula?: string | null;
          category?: string;
          confidence?: number | null;
          created_at?: string;
          default_value?: Json | null;
          example_value?: string | null;
          field_type?: string;
          help_text?: string | null;
          id?: string;
          key?: string;
          label?: string;
          options?: Json | null;
          required?: boolean;
          sort_order?: number;
          template_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "template_fields_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          analysis: Json | null;
          business_id: string | null;
          created_at: string;
          description: string | null;
          fixed_content: Json | null;
          id: string;
          name: string;
          sections: Json | null;
          source_file_name: string | null;
          source_file_path: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysis?: Json | null;
          business_id?: string | null;
          created_at?: string;
          description?: string | null;
          fixed_content?: Json | null;
          id?: string;
          name: string;
          sections?: Json | null;
          source_file_name?: string | null;
          source_file_path?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis?: Json | null;
          business_id?: string | null;
          created_at?: string;
          description?: string | null;
          fixed_content?: Json | null;
          id?: string;
          name?: string;
          sections?: Json | null;
          source_file_name?: string | null;
          source_file_path?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
