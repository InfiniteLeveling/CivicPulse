"use client";

import { useRef, type KeyboardEvent } from "react";
import {
  Construction,
  Trash2,
  Droplets,
  Lightbulb,
  Waves,
  CircleHelp,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { IssueCategory } from "@/types/domain";
import { ISSUE_CATEGORIES } from "@/lib/validation/report";
import { cn } from "@/lib/utils";

interface CategoryMeta {
  icon: LucideIcon;
  displayTitle: string;
  description: string;
  toneStyle: string;
}

const CATEGORY_DETAILS: Record<IssueCategory, CategoryMeta> = {
  pothole: {
    icon: Construction,
    displayTitle: "Pothole",
    description: "Road surface damage, asphalt craters, or broken pavement.",
    toneStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  garbage: {
    icon: Trash2,
    displayTitle: "Garbage Accumulation",
    description: "Overflowing community bins, illegal dumping, or uncollected waste.",
    toneStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  water_leakage: {
    icon: Droplets,
    displayTitle: "Water Leakage",
    description: "Burst pipelines, continuous main leaks, or untreated standing water.",
    toneStyle: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  streetlight: {
    icon: Lightbulb,
    displayTitle: "Broken Streetlight",
    description: "Non-functional lampposts, dark walkways, or flickering fixtures.",
    toneStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  drainage: {
    icon: Waves,
    displayTitle: "Drainage Problem",
    description: "Blocked storm drains, sewage overflows, or stagnant runoff.",
    toneStyle: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  other: {
    icon: CircleHelp,
    displayTitle: "Other Civic Issue",
    description: "Public infrastructure hazards not covered by other categories.",
    toneStyle: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
};

interface CategorySelectorProps {
  value?: IssueCategory | null;
  onChange: (category: IssueCategory) => void;
  error?: string;
  disabled?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  error,
  disabled = false,
}: CategorySelectorProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled) return;

    let targetIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      targetIndex = (index + 1) % ISSUE_CATEGORIES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      targetIndex = (index - 1 + ISSUE_CATEGORIES.length) % ISSUE_CATEGORIES.length;
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = ISSUE_CATEGORIES.length - 1;
    }

    if (targetIndex >= 0) {
      e.preventDefault();
      const nextCategory = ISSUE_CATEGORIES[targetIndex];
      onChange(nextCategory);
      itemRefs.current[targetIndex]?.focus();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label id="category-selector-label" className="text-sm font-semibold text-foreground">
          Issue Category <span aria-hidden="true" className="text-destructive">*</span>
        </label>
        <span className="text-xs text-muted-foreground">Select the best match</span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="category-selector-label"
        aria-describedby={error ? "category-selector-error" : undefined}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {ISSUE_CATEGORIES.map((category, index) => {
          const isSelected = value === category;
          const meta = CATEGORY_DETAILS[category];
          const Icon = meta.icon;

          return (
            <button
              key={category}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(category)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              tabIndex={isSelected || (!value && index === 0) ? 0 : -1}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all outline-none cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                  : "border-border bg-card/60 hover:border-primary/40 hover:bg-muted/40",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    meta.toneStyle
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-4" />
                </span>

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

              <div>
                <p className="font-semibold text-sm text-foreground tracking-tight">
                  {meta.displayTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {meta.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p id="category-selector-error" role="alert" className="text-xs font-medium text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
