"use client";

import { useEffect, useRef } from "react";
import { GitCompare, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminVersionConflictDialogProps {
  open: boolean;
  message?: string;
  onReload: () => void;
  onKeepEditing: () => void;
}

export function AdminVersionConflictDialog({
  open,
  message,
  onReload,
  onKeepEditing,
}: AdminVersionConflictDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onKeepEditing();
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
  }, [open, onKeepEditing]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onKeepEditing}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-card border border-rose-300 dark:border-rose-900 rounded-xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <GitCompare className="size-5" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 id="conflict-dialog-title" className="text-base font-bold text-foreground">
              Concurrent Update Conflict
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {message ||
                "This complaint was updated by another administrator. Review the latest information before saving your changes."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" aria-hidden="true" />
            <span>Unsaved Edits Preserved</span>
          </div>
          <p>
            Your current draft values have not been discarded. Reload the latest authoritative record to inspect concurrent updates and reapply your parameters safely.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onKeepEditing}
            className="text-xs"
          >
            Review Current Draft
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onReload}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Reload Latest Complaint</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
