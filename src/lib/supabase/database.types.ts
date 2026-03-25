export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          appointment_date: string;
          time_slot: string;
          status: "booked" | "cancelled";
          nail_area: "manos" | "pies" | null;
          week_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          appointment_date: string;
          time_slot: string;
          status?: "booked" | "cancelled";
          nail_area?: "manos" | "pies" | null;
          week_start: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          phone_number?: string;
          appointment_date?: string;
          time_slot?: string;
          status?: "booked" | "cancelled";
          nail_area?: "manos" | "pies" | null;
          week_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointment_services: {
        Row: {
          appointment_id: string;
          service_id: string;
        };
        Insert: {
          appointment_id: string;
          service_id: string;
        };
        Update: {
          appointment_id?: string;
          service_id?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          accent_color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          accent_color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          accent_color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
