"use client";

import { useState, useRef } from "react";
import { Camera, Check, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/validation/image";
import { uploadResolutionImage } from "@/lib/api/uploads";
import { Button } from "@/components/ui/button";

interface ResolutionEvidenceUploadProps {
  onUploaded: (imageId: string) => void;
  onCleared: () => void;
  disabled?: boolean;
}

export function ResolutionEvidenceUpload({
  onUploaded,
  onCleared,
  disabled = false,
}: ResolutionEvidenceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validation = validateImageFile(selected);
    if (!validation.valid) {
      toast.error("Invalid photograph", { description: validation.error });
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setUploadedId(null);
  }

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadResolutionImage(file);
      setUploadedId(res.imageId);
      onUploaded(res.imageId);
      toast.success("Resolution evidence uploaded", {
        description: `Server reference: ${res.imageId}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error("Upload error", { description: msg });
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setUploadedId(null);
    onCleared();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="size-3.5 text-primary" aria-hidden="true" />
          <span>Resolution Evidence Photograph</span>
        </label>
        <span className="text-[11px] text-muted-foreground">JPEG, PNG, WebP ≤ 2MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        id="resolution-image-input"
        aria-label="Upload resolution evidence photograph"
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-all flex flex-col items-center justify-center space-y-1.5 group"
        >
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <UploadCloud className="size-4" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-foreground">
            Select or drag resolution evidence photo
          </p>
          <p className="text-[11px] text-muted-foreground">
            Photograph showing completed municipal repair work
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            {previewUrl && (
              <div className="size-14 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-muted/40 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Resolution proof preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 text-xs">
              <p className="font-medium text-foreground truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              {uploadedId && (
                <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Check className="size-3" aria-hidden="true" />
                  <span>Uploaded: {uploadedId}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                aria-label="Remove resolution image"
                className="size-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {!uploadedId && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleUpload}
              disabled={disabled || isUploading}
              className="w-full text-xs h-7 gap-1.5"
            >
              <UploadCloud className="size-3.5" aria-hidden="true" />
              <span>{isUploading ? "Uploading..." : "Upload Evidence Photo"}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
