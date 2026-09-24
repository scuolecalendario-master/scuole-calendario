// Tipi allineati a supabase/migrations/20260924000000_init_schema.sql.
// Per rigenerarli dal database: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type UserRole = "admin" | "teacher";

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: { id: string; name: string; access_code: string; created_at: string };
        Insert: { id?: string; name: string; access_code?: string; created_at?: string };
        Update: { id?: string; name?: string; access_code?: string; created_at?: string };
        Relationships: [];
      };
      classes: {
        Row: { id: string; school_id: string; name: string; school_year: string | null; created_at: string };
        Insert: { id?: string; school_id: string; name: string; school_year?: string | null; created_at?: string };
        Update: { id?: string; school_id?: string; name?: string; school_year?: string | null; created_at?: string };
        Relationships: [
          { foreignKeyName: "classes_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ];
      };
      lessons: {
        Row: {
          id: string; school_id: string; class_id: string; subject: string; teacher: string | null;
          room: string | null; starts_at: string; ends_at: string; notes: string | null; created_at: string;
        };
        Insert: {
          id?: string; school_id?: string; class_id: string; subject: string; teacher?: string | null;
          room?: string | null; starts_at: string; ends_at: string; notes?: string | null; created_at?: string;
        };
        Update: {
          id?: string; school_id?: string; class_id?: string; subject?: string; teacher?: string | null;
          room?: string | null; starts_at?: string; ends_at?: string; notes?: string | null; created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lessons_class_id_fkey"; columns: ["class_id"]; isOneToOne: false; referencedRelation: "classes"; referencedColumns: ["id"] },
          { foreignKeyName: "lessons_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: { id: string; school_id: string | null; full_name: string | null; role: UserRole; created_at: string };
        Insert: { id: string; school_id?: string | null; full_name?: string | null; role?: UserRole; created_at?: string };
        Update: { id?: string; school_id?: string | null; full_name?: string | null; role?: UserRole; created_at?: string };
        Relationships: [
          { foreignKeyName: "profiles_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      request_school_id: { Args: Record<never, never>; Returns: string | null };
      auth_school_id: { Args: Record<never, never>; Returns: string | null };
      auth_is_admin: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
