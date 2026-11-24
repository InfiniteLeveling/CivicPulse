"use client";

import type React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import type { DepartmentWorkloadItem } from "@/lib/validation/admin-analytics";
import { useMounted } from "@/hooks/useMounted";

interface DepartmentWorkloadChartProps {
  data: DepartmentWorkloadItem[];
}

export function DepartmentWorkloadChart({ data }: DepartmentWorkloadChartProps) {
  const mounted = useMounted();
  const hasData = data && data.length > 0 && data.some((d) => d.total > 0);

  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="size-4 text-primary" aria-hidden="true" />
            <span>Department Assignment Workload</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {data.length} divisions
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No departmental workload recorded</p>
            <p className="text-[11px]">Workload appears as complaints are assigned to municipal teams.</p>
          </div>
        ) : !mounted ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Loading chart visualization...
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="departmentName"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  stroke="var(--muted-foreground)"
                />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value: React.ReactNode, name: string | number | undefined) => [
                    `${String(value ?? 0)} complaints`,
                    String(name ?? ""),
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{
                    color: "var(--foreground)",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-foreground font-medium">{value}</span>
                  )}
                />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#D97706" />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#2563EB" />
                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#16A34A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
