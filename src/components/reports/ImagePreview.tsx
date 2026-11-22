"use client";

import { useEffect, useMemo } from "react";
import { Trash2, RefreshCw, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, formatMimeType } from "@/lib/validation/image";

interface ImagePreviewProps {
  file: File;
  onReplace: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ImagePreview({
  file,
  onReplace,
  onRemove,
  disabled = false,
}: ImagePreviewProps) {
  const objectUrl = useMemo(() => {
    if (typeof window !== "undefined" && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Preview Container */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs">
            {objectUrl ? (
              /* Using standard img for local blob URLs to avoid Next.js image optimizer on blob schemes */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={objectUrl}
                alt="Preview of the selected civic issue photograph."
                className="size-full object-cover object-center"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <FileText className="size-6" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-normal uppercase">
                {formatMimeType(file.type)}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatFileSize(file.size)}
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground truncate" title={file.name}>
              {file.name}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="size-3.5" aria-hidden="true" />
              <span>Valid photo format & size</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onReplace}
            className="flex-1 sm:flex-initial gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Replace</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
            className="flex-1 sm:flex-initial gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span>Remove</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
