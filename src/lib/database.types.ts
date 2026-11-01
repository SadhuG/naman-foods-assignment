export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          city: string;
          created_at: string;
          current_round: number;
          drive_id: string;
          email: string;
          experience_years: number;
          full_name: string;
          id: string;
          phone: string;
          qualification: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          city: string;
          created_at?: string;
          current_round?: number;
          drive_id: string;
          email: string;
          experience_years?: number;
          full_name: string;
          id?: string;
          phone: string;
          qualification: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          city?: string;
          created_at?: string;
          current_round?: number;
          drive_id?: string;
          email?: string;
          experience_years?: number;
          full_name?: string;
          id?: string;
          phone?: string;
          qualification?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_drive_id_fkey";
            columns: ["drive_id"];
            isOneToOne: false;
            referencedRelation: "drive_summary";
            referencedColumns: ["drive_id"];
          },
          {
            foreignKeyName: "candidates_drive_id_fkey";
            columns: ["drive_id"];
            isOneToOne: false;
            referencedRelation: "drives";
            referencedColumns: ["id"];
          },
        ];
      };
      drive_rounds: {
        Row: {
          drive_id: string;
          id: string;
          name: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          drive_id: string;
          id?: string;
          name: string;
          position: number;
        };
        Update: {
          drive_id?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "drive_rounds_drive_id_fkey";
            columns: ["drive_id"];
            isOneToOne: false;
            referencedRelation: "drive_summary";
            referencedColumns: ["drive_id"];
          },
          {
            foreignKeyName: "drive_rounds_drive_id_fkey";
            columns: ["drive_id"];
            isOneToOne: false;
            referencedRelation: "drives";
            referencedColumns: ["id"];
          },
        ];
      };
      drives: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          location: string;
          openings: number;
          role: string;
          slug: string;
          status: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          location: string;
          openings?: number;
          role: string;
          slug: string;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          location?: string;
          openings?: number;
          role?: string;
          slug?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      hr_users: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      joining_details: {
        Row: {
          aadhaar_number: string;
          address: string;
          bank_account_holder: string;
          bank_account_number: string;
          bank_ifsc: string;
          candidate_id: string;
          changes_requested_reason: string | null;
          date_of_birth: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          pan_number: string;
          preferred_joining_date: string;
          submitted_at: string;
          uan_number: string | null;
        };
        ComputedFields: never;
        Insert: {
          aadhaar_number: string;
          address: string;
          bank_account_holder: string;
          bank_account_number: string;
          bank_ifsc: string;
          candidate_id: string;
          changes_requested_reason?: string | null;
          date_of_birth: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          pan_number: string;
          preferred_joining_date: string;
          submitted_at?: string;
          uan_number?: string | null;
        };
        Update: {
          aadhaar_number?: string;
          address?: string;
          bank_account_holder?: string;
          bank_account_number?: string;
          bank_ifsc?: string;
          candidate_id?: string;
          changes_requested_reason?: string | null;
          date_of_birth?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          pan_number?: string;
          preferred_joining_date?: string;
          submitted_at?: string;
          uan_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "joining_details_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: true;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          candidate_id: string;
          created_at: string;
          id: string;
          params: NonNullable<Json>;
          template: string;
        };
        ComputedFields: never;
        Insert: {
          candidate_id: string;
          created_at?: string;
          id?: string;
          params?: NonNullable<Json>;
          template: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          id?: string;
          params?: NonNullable<Json>;
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      round_decisions: {
        Row: {
          candidate_id: string;
          candidate_message: string | null;
          decided_at: string;
          decided_by: string | null;
          decision: string;
          id: string;
          note: string | null;
          round_name: string;
          round_position: number;
        };
        ComputedFields: never;
        Insert: {
          candidate_id: string;
          candidate_message?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision: string;
          id?: string;
          note?: string | null;
          round_name: string;
          round_position: number;
        };
        Update: {
          candidate_id?: string;
          candidate_message?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision?: string;
          id?: string;
          note?: string | null;
          round_name?: string;
          round_position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "round_decisions_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      drive_summary: {
        Row: {
          active: number | null;
          details_submitted: number | null;
          drive_id: string;
          on_hold: number | null;
          onboarded: number | null;
          rejected: number | null;
          selected: number | null;
          total: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      _normalize_phone: { Args: { p_phone: string }; Returns: string };
      _write_message: {
        Args: { p_candidate_id: string; p_extra?: Json; p_template: string };
        Returns: undefined;
      };
      apply_to_drive: {
        Args: {
          p_city: string;
          p_experience_years: number;
          p_full_name: string;
          p_phone: string;
          p_qualification: string;
          p_slug: string;
        };
        Returns: string;
      };
      get_my_application: { Args: { p_candidate_id: string }; Returns: Json };
      get_public_drive: { Args: { p_slug: string }; Returns: Json };
      hr_decide: {
        Args: {
          p_candidate_ids: string[];
          p_candidate_message?: string;
          p_decision: string;
          p_expected?: Json;
          p_note?: string;
        };
        Returns: Json;
      };
      hr_mark_onboarded: {
        Args: { p_candidate_id: string };
        Returns: undefined;
      };
      hr_request_changes: {
        Args: { p_candidate_id: string; p_reason: string };
        Returns: undefined;
      };
      hr_save_drive: {
        Args: {
          p_description: string;
          p_drive_id: string;
          p_location: string;
          p_openings: number;
          p_role: string;
          p_rounds: string[];
          p_slug: string;
          p_status: string;
          p_title: string;
        };
        Returns: string;
      };
      is_hr: { Args: Record<PropertyKey, never>; Returns: boolean };
      list_my_applications: { Args: Record<PropertyKey, never>; Returns: Json };
      submit_joining_details: {
        Args: { p_candidate_id: string; p_details: Json };
        Returns: undefined;
      };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
