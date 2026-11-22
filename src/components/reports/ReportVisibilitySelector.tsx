"use client";

import { Eye, Lock, Check } from "lucide-react";
import type { ReportVisibility } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReportVisibilitySelectorProps {
  value: ReportVisibility;
  onChange: (visibility: ReportVisibility) => void;
  disabled?: boolean;
}

const visibilityOptions = [
  {
    id: "public" as const,
    title: "Public Report (Recommended)",
    badge: "Community Visible",
    badgeVariant: "default" as const,
    icon: Eye,
    description:
      "Published on community feeds and civic maps. Neighbors can upvote and comment to elevate priority for faster municipal response.",
  },
  {
    id: "private" as const,
    title: "Private Report",
    badge: "Restricted",
    badgeVariant: "outline" as const,
    icon: Lock,
    description:
      "Visible solely to you and assigned municipal staff. Will not appear on public map feeds, search, or community upvote listings.",
  },
];

export function ReportVisibilitySelector({
  value,
  onChange,
  disabled = false,
}: ReportVisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label id="visibility-selector-label" className="text-sm font-semibold text-foreground">
          Report Visibility <span aria-hidden="true" className="text-destructive">*</span>
        </label>
        <span className="text-xs text-muted-foreground">Control public exposure</span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="visibility-selector-label"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {visibilityOptions.map((opt) => {
          const isSelected = value === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all outline-none cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                  : "border-border bg-card/60 hover:border-primary/40 hover:bg-muted/40",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {opt.title}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border group-hover:border-primary/50"
                  )}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="size-3" strokeWidth={3} />}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {opt.description}
              </p>

              <div className="mt-3 pt-2 border-t border-border/40">
                <Badge
                  variant={isSelected ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-normal"
                >
                  {opt.badge}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
