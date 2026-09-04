// Definisi jenis ringkas untuk klien Supabase.
// Jana semula dengan `supabase gen types typescript` selepas projek Supabase disediakan, jika perlu ketepatan penuh.

export interface Database {
  public: {
    Tables: {
      ppe_items: {
        Row: {
          id: string;
          category: string;
          variant: string;
          name: string;
          unit: string;
          stock: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ppe_items"]["Row"]> & {
          id: string;
          category: string;
          variant: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["ppe_items"]["Row"]>;
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          staff_id: string;
          comp_code: string | null;
          branch: string | null;
          name: string;
          ic_number: string | null;
          position: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employees"]["Row"]> & {
          staff_id: string;
          name: string;
          position: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Row"]>;
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          ref_no: string | null;
          employee_id: string | null;
          employee_name: string;
          staff_id: string;
          comp_code: string | null;
          branch: string | null;
          ic_number: string | null;
          position: string | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: any;
          note: string;
          status: "pending" | "issued" | "rejected";
          remark: string;
          created_at: string;
          processed_at: string | null;
          processed_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["requests"]["Row"]> & {
          employee_name: string;
          staff_id: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: any;
        };
        Update: Partial<Database["public"]["Tables"]["requests"]["Row"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          company_name: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      employees_public: {
        Row: {
          id: string;
          staff_id: string;
          comp_code: string | null;
          branch: string | null;
          name: string;
          position: string;
        };
        Relationships: [];
      };
      ppe_items_public: {
        Row: {
          id: string;
          category: string;
          variant: string;
          name: string;
          unit: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      approve_request: {
        Args: {
          p_request_id: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p_items: any;
          p_remark: string;
          p_processed_by: string;
        };
        Returns: Database["public"]["Tables"]["requests"]["Row"];
      };
      reject_request: {
        Args: {
          p_request_id: string;
          p_remark: string;
          p_processed_by: string;
        };
        Returns: Database["public"]["Tables"]["requests"]["Row"];
      };
    };
  };
}
