"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { UploadCloud, Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onFileSelected: (file: File) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export function ImageDropzone({
  onFileSelected,
  onError,
  disabled = false,
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      onError("Please drop only a single photograph.");
      return;
    }

    onFileSelected(files[0]);
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
    // Clear input so selecting the same file again triggers change
    e.target.value = "";
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all",
        isDragging
          ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[0.99]"
          : "border-border bg-card/50 hover:border-primary/50 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Hidden standard file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileInputChange}
        tabIndex={-1}
        className="sr-only"
        aria-label="Upload civic issue photograph"
        disabled={disabled}
      />

      {/* Hidden camera capture input for supported mobile devices */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        capture="environment"
        onChange={handleFileInputChange}
        tabIndex={-1}
        className="sr-only"
        aria-label="Take civic issue photograph"
        disabled={disabled}
      />

      <div className="mx-auto max-w-md space-y-4">
        {/* Visual Icon Badge */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <UploadCloud className="size-7" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Add a Photo of the Problem
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Drag and drop your image here, or choose an option below to browse files or take a photo.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 text-xs font-medium shadow-sm"
          >
            <ImageIcon className="size-3.5" aria-hidden="true" />
            <span>Browse Files</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-2 text-xs font-medium"
          >
            <Camera className="size-3.5" aria-hidden="true" />
            <span>Take Photo</span>
          </Button>
        </div>

        {/* Format Guidance */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground border-border">
            Supported: JPG, PNG, WebP · Max 2 MB
          </Badge>
        </div>
      </div>
    </div>
  );
}
