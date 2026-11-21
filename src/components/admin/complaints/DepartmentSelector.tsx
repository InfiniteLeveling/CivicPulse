"use client";

import { useEffect, useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import type { Department, IssueCategory } from "@/types/domain";
import { getAdminDepartments } from "@/lib/api/departments";
import { CATEGORY_RECOMMENDED_DEPT } from "@/lib/validation/admin-triage";

interface DepartmentSelectorProps {
  value: string | null;
  category?: IssueCategory;
  onChange: (departmentId: string | null) => void;
  disabled?: boolean;
}

export function DepartmentSelector({
  value,
  category,
  onChange,
  disabled = false,
}: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminDepartments()
      .then((res) => {
        if (active) {
          setDepartments(res.items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const recommendedDeptId = category ? CATEGORY_RECOMMENDED_DEPT[category] : null;
  const recommendedDept = departments.find((d) => d.id === recommendedDeptId);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="department-select"
          className="text-xs font-semibold text-foreground flex items-center gap-1.5"
        >
          <Building2 className="size-3.5 text-primary" aria-hidden="true" />
          <span>Assigned Department</span>
        </label>

        {recommendedDept && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            <Sparkles className="size-3" aria-hidden="true" />
            <span>Recommended: {recommendedDept.name}</span>
          </span>
        )}
      </div>

      <select
        id="department-select"
        value={value ?? ""}
        disabled={disabled || isLoading}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? val : null);
        }}
        className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-colors"
      >
        <option value="">-- Unassigned (Field Services) --</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
            {dept.id === recommendedDeptId ? " ★ (Recommended)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
