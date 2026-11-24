"use client";

import type React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { StatusChartItem } from "@/lib/validation/admin-analytics";
import { useMounted } from "@/hooks/useMounted";

interface ComplaintStatusChartProps {
  data: StatusChartItem[];
  total: number;
}

export function ComplaintStatusChart({ data, total }: ComplaintStatusChartProps) {
  const mounted = useMounted();
  const hasData = total > 0 && data.some((item) => item.count > 0);

  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            <span>Complaint Status Distribution</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {total} total case{total === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No complaints to distribute</p>
            <p className="text-[11px]">Zero complaints recorded under current filters.</p>
          </div>
        ) : !mounted ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Loading chart visualization...
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="label"
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    value: React.ReactNode,
                    name: string | number | undefined,
                    item: { payload?: { percentage?: number } }
                  ) => [
                    `${String(value ?? 0)} complaints (${item?.payload?.percentage ?? 0}%)`,
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
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-foreground font-medium">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
