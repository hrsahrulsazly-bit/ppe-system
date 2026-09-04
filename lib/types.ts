export interface PpeItem {
  id: string;
  category: string;
  variant: string;
  name: string;
  unit: string;
  stock: number;
  updated_at: string;
}

export interface Employee {
  id: string;
  staff_id: string;
  comp_code: string | null;
  branch: string | null;
  name: string;
  ic_number: string | null;
  position: string;
  created_at: string;
}

export interface RequestItem {
  itemId: string;
  name: string;
  category?: string;
  size: string | null;
  qtyRequested: number;
  qtyIssued: number;
}

export type RequestStatus = "pending" | "issued" | "rejected";

export interface PpeRequest {
  id: string;
  employee_id: string | null;
  employee_name: string;
  staff_id: string;
  comp_code: string | null;
  branch: string | null;
  ic_number: string | null;
  position: string | null;
  items: RequestItem[];
  note: string;
  status: RequestStatus;
  remark: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  ref_no: string | null;
}

export interface Settings {
  id: number;
  company_name: string;
  updated_at: string;
}
