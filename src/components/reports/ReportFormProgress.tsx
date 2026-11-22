import { FileText, Camera, MapPin, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ImageUploadStatus, DuplicateCheckStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

export type ReportingStep = 1 | 2 | 3 | 4;

interface ReportFormProgressProps {
  currentStep?: ReportingStep;
  photoStatus?: ImageUploadStatus;
  hasAiAnalysis?: boolean;
  locationStatus?: "none" | "selected" | "confirmed";
  duplicateStatus?: DuplicateCheckStatus;
  hasConfirmedSeparate?: boolean;
  isSubmitted?: boolean;
  className?: string;
}

export function ReportFormProgress({
  currentStep = 1,
  photoStatus = "idle",
  hasAiAnalysis = false,
  locationStatus = "none",
  duplicateStatus = "idle",
  hasConfirmedSeparate = false,
  isSubmitted = false,
  className,
}: ReportFormProgressProps) {
  function getPhotoBadge(): { label: string; variant: "default" | "secondary" | "outline" } {
    if (hasAiAnalysis) {
      return { label: "AI Analyzed", variant: "default" };
    }
    if (photoStatus === "uploaded") {
      return { label: "Uploaded", variant: "default" };
    }
    if (photoStatus === "selected") {
      return { label: "Selected", variant: "secondary" };
    }
    if (photoStatus === "uploading") {
      return { label: "Uploading", variant: "secondary" };
    }
    return { label: "Phases 8 & 9", variant: "outline" };
  }

  function getLocationBadge(): { label: string; variant: "default" | "secondary" | "outline" } {
    if (locationStatus === "confirmed") {
      return { label: "Confirmed", variant: "default" };
    }
    if (locationStatus === "selected") {
      return { label: "Selected", variant: "secondary" };
    }
    return { label: "Phase 10", variant: "outline" };
  }

  const photoBadge = getPhotoBadge();
  const locationBadge = getLocationBadge();

  const steps = [
    {
      step: 1,
      title: "Issue Details",
      badge: "Completed",
      badgeVariant: "default" as const,
      icon: FileText,
      isActive: currentStep === 1,
    },
    {
      step: 2,
      title: "Add Photo",
      badge: photoBadge.label,
      badgeVariant: photoBadge.variant,
      icon: Camera,
      isActive: photoStatus !== "idle" || currentStep === 2,
    },
    {
      step: 3,
      title: "Confirm Location",
      badge: locationBadge.label,
      badgeVariant: locationBadge.variant,
      icon: MapPin,
      isActive: locationStatus !== "none" || currentStep === 3,
    },
    {
      step: 4,
      title: "Review & Submit",
      badge: isSubmitted
        ? "Submitted"
        : hasConfirmedSeparate || duplicateStatus === "no_matches"
        ? "Verified"
        : "Active",
      badgeVariant:
        isSubmitted || hasConfirmedSeparate || duplicateStatus === "no_matches"
          ? ("default" as const)
          : ("outline" as const),
      icon: CheckCircle2,
      isActive: currentStep === 4 || isSubmitted,
    },
  ];

  return (
    <nav aria-label="Reporting progress" className={cn("space-y-2", className)}>
      <ol className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {steps.map((item) => {
          const Icon = item.icon;

          return (
            <li
              key={item.step}
              className={cn(
                "relative rounded-xl border p-3 flex flex-col justify-between transition-colors",
                item.isActive
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                  : "border-border/70 bg-card/60 text-muted-foreground"
              )}
              aria-current={item.isActive ? "step" : undefined}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    item.isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {item.step}
                </span>

                <Badge
                  variant={item.badgeVariant}
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-normal",
                    item.badgeVariant === "default"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "text-muted-foreground border-border"
                  )}
                >
                  {item.badge}
                </Badge>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                  aria-hidden="true"
                />
                <span className={cn("text-xs font-medium truncate", item.isActive && "text-foreground font-semibold")}>
                  {item.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
