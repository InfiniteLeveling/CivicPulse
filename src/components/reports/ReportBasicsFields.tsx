"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReportBasicsFormValues } from "@/lib/validation/report";
import { cn } from "@/lib/utils";

interface ReportBasicsFieldsProps {
  register: UseFormRegister<ReportBasicsFormValues>;
  errors: FieldErrors<ReportBasicsFormValues>;
  titleValue: string;
  descriptionValue: string;
  disabled?: boolean;
}

export function ReportBasicsFields({
  register,
  errors,
  titleValue,
  descriptionValue,
  disabled = false,
}: ReportBasicsFieldsProps) {
  const titleLength = titleValue?.length || 0;
  const descriptionLength = descriptionValue?.length || 0;

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="report-title-input" className="text-sm font-semibold text-foreground">
            Issue Title <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <span
            className={cn(
              "text-xs tabular-nums",
              titleLength > 120 ? "text-destructive font-semibold" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {titleLength} / 120
          </span>
        </div>

        <Input
          id="report-title-input"
          type="text"
          placeholder="Example: Large pothole near the college entrance"
          disabled={disabled}
          aria-invalid={errors.title ? "true" : undefined}
          aria-describedby={
            [
              "report-title-helper",
              errors.title ? "report-title-error" : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "h-10 text-sm",
            errors.title && "border-destructive focus-visible:ring-destructive/30"
          )}
          {...register("title")}
        />

        <div className="flex items-start justify-between gap-2">
          <p id="report-title-helper" className="text-xs text-muted-foreground">
            Write a short title describing the problem.
          </p>
          {errors.title && (
            <p id="report-title-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.title.message}
            </p>
          )}
        </div>
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="report-description-input" className="text-sm font-semibold text-foreground">
            Describe the Problem <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <span
            className={cn(
              "text-xs tabular-nums",
              descriptionLength > 1000 ? "text-destructive font-semibold" : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {descriptionLength} / 1000
          </span>
        </div>

        <Textarea
          id="report-description-input"
          rows={5}
          placeholder="Describe what happened, where the issue is located and how it affects people..."
          disabled={disabled}
          aria-invalid={errors.description ? "true" : undefined}
          aria-describedby={
            [
              "report-description-helper",
              errors.description ? "report-description-error" : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "min-h-28 text-sm resize-y leading-relaxed",
            errors.description && "border-destructive focus-visible:ring-destructive/30"
          )}
          {...register("description")}
        />

        <div className="flex items-start justify-between gap-2">
          <p id="report-description-helper" className="text-xs text-muted-foreground">
            Include useful details about the problem. Avoid sharing unnecessary personal information.
          </p>
          {errors.description && (
            <p id="report-description-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
