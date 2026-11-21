"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmationType = "mark_resolved" | "publish_private";

interface AdminMutationConfirmationProps {
  open: boolean;
  type: ConfirmationType;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AdminMutationConfirmation({
  open,
  type,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: AdminMutationConfirmationProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !isSubmitting) {
        onCancel();
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onCancel, isSubmitting]);

  if (!open) return null;

  const isResolvedType = type === "mark_resolved";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mutation-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onCancel();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-3">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              isResolvedType
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            }`}
          >
            {isResolvedType ? (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            ) : (
              <Globe className="size-5" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1">
            <h2 id="mutation-dialog-title" className="text-base font-bold text-foreground">
              {isResolvedType
                ? "Confirm Complaint Resolution"
                : "Publish Previously Private Complaint?"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isResolvedType
                ? "Are you sure you want to transition this complaint to Resolved status? The resolution timestamp and attached evidence photo will be recorded into the municipal ledger."
                : "Publishing this complaint will make its description, category, and confirmed geographic location visible to all citizens on the Live Civic Map and public discovery interfaces."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5 text-muted-foreground">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" aria-hidden="true" />
            <span>Administrative Safeguard</span>
          </div>
          <p>
            {isResolvedType
              ? "This action confirms municipal work completion. The reporter will be notified of case resolution."
              : "Ensure no private addresses, faces, or personal citizen details are disclosed."}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant={isResolvedType ? "default" : "destructive"}
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="text-xs"
          >
            {isSubmitting
              ? "Saving..."
              : isResolvedType
              ? "Confirm Resolution"
              : "Confirm Public Visibility"}
          </Button>
        </div>
      </div>
    </div>
  );
}
