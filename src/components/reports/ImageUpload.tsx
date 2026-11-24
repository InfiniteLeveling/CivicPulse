"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { ImageUploadStatus as StatusType } from "@/types/domain";
import { validateImageFile } from "@/lib/validation/image";
import { uploadIssueImage } from "@/lib/api/uploads";
import { ImageDropzone } from "./ImageDropzone";
import { ImagePreview } from "./ImagePreview";
import { ImageUploadStatus } from "./ImageUploadStatus";

interface ImageUploadProps {
  file: File | null;
  uploadedImageId: string | null;
  status: StatusType;
  onFileChange: (file: File | null) => void;
  onUploadSuccess: (res: { imageId: string; previewUrl: string }) => void;
  onStatusChange: (status: StatusType, errorMessage?: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({
  file,
  uploadedImageId,
  status,
  onFileChange,
  onUploadSuccess,
  onStatusChange,
  disabled = false,
}: ImageUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Clean up in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function uploadFile(targetFile: File) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    onStatusChange("uploading");
    setUploadError(null);

    try {
      const response = await uploadIssueImage(targetFile, { signal: controller.signal });
      onUploadSuccess(response);
      onStatusChange("uploaded");
      toast.success("Photograph uploaded successfully");
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setUploadError(msg);
      onStatusChange("error", msg);
      toast.error("Upload failed", { description: msg });
    }
  }

  function handleFileSelected(newFile: File) {
    // 1. Abort any previous pending upload request
    abortControllerRef.current?.abort();

    // 2. Client-side validation
    const validation = validateImageFile(newFile);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid file");
      toast.error("Invalid photograph", { description: validation.error });
      return;
    }

    // 3. Clear errors, register file, and immediately upload to private storage
    setValidationError(null);
    setUploadError(null);
    onFileChange(newFile);
    void uploadFile(newFile);
  }

  function handleRemove() {
    abortControllerRef.current?.abort();
    setValidationError(null);
    setUploadError(null);
    onFileChange(null);
    onStatusChange("idle");
    toast.info("Photo removed");
  }

  function handleReplace() {
    replaceInputRef.current?.click();
  }

  async function handleUpload() {
    if (!file) return;
    await uploadFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input for Replace action */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
          e.target.value = "";
        }}
        tabIndex={-1}
        className="sr-only"
        aria-label="Replace civic issue photograph"
        disabled={disabled}
      />

      {/* Main Display: Dropzone when empty, Preview when selected */}
      {!file ? (
        <div className="space-y-2">
          <ImageDropzone
            onFileSelected={handleFileSelected}
            onError={(msg) => {
              setValidationError(msg);
              toast.error(msg);
            }}
            disabled={disabled}
          />
          {validationError && (
            <p role="alert" className="text-xs font-medium text-destructive mt-1">
              {validationError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ImagePreview
            file={file}
            onReplace={handleReplace}
            onRemove={handleRemove}
            disabled={disabled || status === "uploading"}
          />

          <ImageUploadStatus
            status={status}
            imageId={uploadedImageId}
            errorMessage={uploadError}
            onUpload={handleUpload}
            onRetry={handleUpload}
            disabled={disabled}
          />
        </div>
      )}

      {/* Privacy Notice Callout */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>Privacy Guidance:</strong> Please photograph the civic issue clearly. Avoid capturing recognizable faces, vehicle license plates, or private property documents when possible.
        </p>
      </div>
    </div>
  );
}
