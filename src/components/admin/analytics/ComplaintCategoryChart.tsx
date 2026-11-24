"use client";

import type React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";
import type { CategoryChartItem } from "@/lib/validation/admin-analytics";
import { useMounted } from "@/hooks/useMounted";

interface ComplaintCategoryChartProps {
  data: CategoryChartItem[];
}

export function ComplaintCategoryChart({ data }: ComplaintCategoryChartProps) {
  const mounted = useMounted();
  const total = data.reduce((acc, item) => acc + item.count, 0);
  const hasData = total > 0;

  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" aria-hidden="true" />
            <span>Complaints by Issue Category</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {total} categorized
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No category data recorded</p>
            <p className="text-[11px]">Category counts will appear as reports are filed.</p>
          </div>
        ) : !mounted ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Loading chart visualization...
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={95}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  formatter={(
                    value: React.ReactNode,
                    _name: string | number | undefined,
                    item: { payload?: { percentage?: number } }
                  ) => [
                    `${String(value ?? 0)} reports (${item?.payload?.percentage ?? 0}%)`,
                    "Count",
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
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
