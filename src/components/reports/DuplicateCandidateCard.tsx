"use client";

import { Construction, Trash2, Droplets, Lightbulb, Waves, CircleHelp, MapPin, ThumbsUp, ImageIcon, CheckCircle2 } from "lucide-react";
import type { DuplicateCandidate, IssueCategory } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDistance, formatSupportCount } from "@/lib/validation/duplicates";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<IssueCategory, React.ElementType> = {
  pothole: Construction,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  drainage: Waves,
  other: CircleHelp,
};

interface DuplicateCandidateCardProps {
  candidate: DuplicateCandidate;
  onSelectSameIssue: (candidate: DuplicateCandidate) => void;
  isSupported?: boolean;
  disabled?: boolean;
}

export function DuplicateCandidateCard({
  candidate,
  onSelectSameIssue,
  isSupported = false,
  disabled = false,
}: DuplicateCandidateCardProps) {
  const CategoryIcon = CATEGORY_ICONS[candidate.category] || CircleHelp;
  const categoryLabel = CATEGORY_LABELS[candidate.category] || candidate.category;

  return (
    <Card
      className={cn(
        "border transition-all shadow-xs hover:border-primary/40",
        isSupported
          ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
          : "border-border bg-card"
      )}
      data-testid={`duplicate-candidate-${candidate.id}`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Photo or placeholder */}
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/30 flex items-center justify-center">
            {candidate.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidate.imageUrl}
                alt={`Photo for report ${candidate.reference}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-1 text-center">
                <ImageIcon className="size-5" aria-hidden="true" />
                <span className="text-[9px] mt-0.5">No photo</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Badges: Reference + Category + Status + Distance */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                {candidate.reference}
              </span>

              <Badge variant="outline" className="text-[11px] gap-1 px-1.5 py-0 font-normal">
                <CategoryIcon className="size-3" aria-hidden="true" />
                <span>{categoryLabel}</span>
              </Badge>

              <StatusBadge status={candidate.status} />

              <Badge variant="secondary" className="text-[11px] gap-1 px-1.5 py-0 font-normal text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                <span>{formatDistance(candidate.distanceMeters)}</span>
              </Badge>
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold text-foreground tracking-tight line-clamp-2">
              {candidate.title}
            </h4>

            {/* Support Count */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <ThumbsUp className="size-3 text-primary" aria-hidden="true" />
                <span>{formatSupportCount(candidate.supportCount)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 justify-end">
          {isSupported ? (
            <Badge
              variant="default"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2.5 py-1"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              <span>Supported</span>
            </Badge>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onSelectSameIssue(candidate)}
              className="w-full sm:w-auto gap-1.5 text-xs font-medium border-primary/40 hover:border-primary text-primary hover:bg-primary/5"
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              <span>This Is My Issue</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
