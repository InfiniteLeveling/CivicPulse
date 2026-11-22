export interface DepartmentItem {
  id: string;
  name: string;
  description: string | null;
}

export interface DepartmentListResponseData {
  departments: DepartmentItem[];
}

export interface AssignDepartmentInput {
  report_id: string;
  department_id: string;
  expected_department_id?: string | null;
  reason?: string;
}

export interface AssignDepartmentResponseData {
  report_id: string;
  previous_department_id: string | null;
  department: {
    id: string;
    name: string;
  };
  assigned_by: string;
  assigned_at: string;
  assignment_history_id?: string;
}

export interface DepartmentAssignmentHistoryItem {
  id: string;
  report_id: string;
  previous_department_id: string | null;
  new_department_id: string;
  assigned_by: string;
  reason: string | null;
  created_at: string;
}
