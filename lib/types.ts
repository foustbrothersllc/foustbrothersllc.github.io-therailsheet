export type TrailerStatus = "at_rail" | "departed";

export interface Trailer {
  id: string;
  equipment_number: string;
  pickup_number: string;
  origin: string | null;
  origin_sort_type: string | null;
  destination: string | null;
  destination_sort_type: string | null;
  load_percentage: number | null;
  flag_note: string | null;
  is_hot: boolean;
  assigned_to_id: string | null;
  assigned_driver_name: string | null;
  assigned_driver_emp_id: string | null;
  status: TrailerStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface PresenceState {
  user_id: string;
  first_name: string;
  last_name: string;
  online_at: string;
}

export interface SignupProblem {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  message: string;
  resolved: boolean;
  created_at: string;
}

// Row shape coming out of an uploaded CSV/XLSX before Gemini normalizes it.
export type RawImportRow = Record<string, string | number | null>;

export interface ParsedTrailerRow {
  row_index: number;
  equipment_number: string | null;
  pickup_number: string | null;
  origin: string | null;
  origin_sort_type: string | null;
  destination: string | null;
  destination_sort_type: string | null;
  load_percentage: number | null;
  issues: string[];
}
