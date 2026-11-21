"use client";

import type React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import type { TrendChartItem } from "@/lib/validation/admin-analytics";
import { useMounted } from "@/hooks/useMounted";

interface ComplaintTrendChartProps {
  data: TrendChartItem[];
}

export function ComplaintTrendChart({ data }: ComplaintTrendChartProps) {
  const mounted = useMounted();
  const hasHistoricalData = data && data.length >= 2;

  return (
    <Card className="border-border bg-card shadow-2xs">
      <CardHeader className="pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" aria-hidden="true" />
            <span>Complaint Submission Trends Over Time</span>
          </CardTitle>
          {hasHistoricalData && (
            <span className="text-xs text-muted-foreground font-mono">
              {data.length} recorded dates
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasHistoricalData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-xs space-y-2">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Info className="size-5" aria-hidden="true" />
            </div>
            <p className="font-semibold text-foreground">
              Historical Trends Pending Additional Time-Series Data
            </p>
            <p className="text-muted-foreground max-w-md leading-relaxed text-[11px]">
              Daily and weekly complaint submission trends will appear as reports accumulate across multiple operational dates. CivicPulse never synthesizes fictional historical curves.
            </p>
          </div>
        ) : !mounted ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Loading chart visualization...
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 15, right: 25, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(value: React.ReactNode) => [
                    `${String(value ?? 0)} complaints submitted`,
                    "Daily Volume",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563EB", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
