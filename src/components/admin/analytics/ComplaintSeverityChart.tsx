"use client";

import type React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import type { SeverityChartItem } from "@/lib/validation/admin-analytics";
import { useMounted } from "@/hooks/useMounted";

interface ComplaintSeverityChartProps {
  data: SeverityChartItem[];
}

export function ComplaintSeverityChart({ data }: ComplaintSeverityChartProps) {
  const mounted = useMounted();
  const total = data.reduce((acc, item) => acc + item.count, 0);
  const hasData = total > 0;

  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <span>Severity Distribution</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            {total} assessed
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No severity assessments recorded</p>
            <p className="text-[11px]">Severity data will appear as complaints are triaged.</p>
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
                margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
                <Tooltip
                  formatter={(
                    value: React.ReactNode,
                    _name: string | number | undefined,
                    item: { payload?: { percentage?: number } }
                  ) => [
                    `${String(value ?? 0)} complaints (${item?.payload?.percentage ?? 0}%)`,
                    "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {data.map((entry) => (
                    <Cell key={`sev-cell-${entry.severity}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
