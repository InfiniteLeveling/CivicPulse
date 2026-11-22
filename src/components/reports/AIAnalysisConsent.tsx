"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

interface AIAnalysisConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function AIAnalysisConsent({
  checked,
  onCheckedChange,
  disabled = false,
}: AIAnalysisConsentProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          id="ai-consent-checkbox"
          checked={checked}
          onCheckedChange={(val) => onCheckedChange(Boolean(val))}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="space-y-1 text-xs">
          <Label
            htmlFor="ai-consent-checkbox"
            className="font-medium text-foreground text-xs leading-snug cursor-pointer select-none"
          >
            Allow AI analysis of this photograph to suggest category and details
          </Label>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            With your permission, your uploaded photograph will be processed by our AI service
            to suggest complaint details. Please avoid including faces, vehicle number plates, or
            sensitive personal information.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary shrink-0" aria-hidden="true" />
        <span>
          AI assistance is optional. You can review, modify, or reject any suggestions, or continue manually at any time.
        </span>
      </div>
    </div>
  );
}
