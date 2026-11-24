"use client";

import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { ImageUploadStatus as StatusType } from "@/types/domain";

interface ImageUploadStatusProps {
  status: StatusType;
  imageId?: string | null;
  errorMessage?: string | null;
  onUpload: () => void;
  onRetry: () => void;
  disabled?: boolean;
}

export function ImageUploadStatus({
  status,
  imageId,
  errorMessage,
  onUpload,
  onRetry,
  disabled = false,
}: ImageUploadStatusProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "selected") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <p className="font-semibold text-foreground text-sm">
            Ready to Upload
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Your photograph is verified locally. Upload it now to secure it on the server before submitting your report.
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={disabled}
          onClick={onUpload}
          className="gap-2 shrink-0 font-medium shadow-sm w-full sm:w-auto"
        >
          <UploadCloud className="size-4" aria-hidden="true" />
          <span>Upload Photo</span>
        </Button>
      </div>
    );
  }

  if (status === "uploading") {
    return (
      <div
        className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 text-xs"
        aria-live="polite"
      >
        <Spinner className="size-5 text-primary shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-sm">
            Uploading Photograph...
          </p>
          <p className="text-muted-foreground">
            Uploading your image securely for attachment and review.
          </p>
        </div>
      </div>
    );
  }

  if (status === "uploaded" && imageId) {
    return (
      <div
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300"
        aria-live="polite"
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">Photograph Uploaded Successfully</p>
            <p className="text-emerald-700 dark:text-emerald-300/90">
              Assigned Server Reference: <span className="font-mono font-semibold">{imageId}</span>
            </p>
          </div>
        </div>

        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 shrink-0">
          Server Verified
        </Badge>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3 text-xs text-destructive"
        role="alert"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Upload Unsuccessful</p>
            <p className="text-destructive/90 leading-relaxed">
              {errorMessage || "Could not complete image upload. Please check your network connection and try again."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-destructive/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={disabled}
            className="gap-1.5 text-xs border-destructive/40 hover:bg-destructive/15 text-destructive hover:text-destructive"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Retry Upload</span>
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Local preview remains intact while you retry.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
