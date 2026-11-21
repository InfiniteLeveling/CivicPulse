"use client";

import { useState } from "react";
import { Camera, ImageOff, ZoomIn, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportImageGalleryProps {
  imageUrl: string | null;
  reference: string;
}

export function ReportImageGallery({
  imageUrl,
  reference,
}: ReportImageGalleryProps) {
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <Card className="border-border/80 bg-muted/20 shadow-xs">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-2.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {hasError ? (
              <ImageOff className="size-6" aria-hidden="true" />
            ) : (
              <Camera className="size-6" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {hasError ? "Unable to load photograph" : "No photograph attached"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {hasError
                ? "The evidence image could not be loaded or the secure session link expired."
                : "This complaint was submitted without an attached image."}
            </p>
          </div>
          {hasError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHasError(false)}
              className="text-xs h-7 mt-1"
            >
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border overflow-hidden shadow-xs">
        <div className="relative group bg-muted/40 overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Photograph attached to civic issue report ${reference}`}
            onError={() => setHasError(true)}
            className="w-full max-h-[380px] object-cover sm:object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          />

          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            aria-label="Enlarge photograph"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
          >
            <ZoomIn className="size-3.5" aria-hidden="true" />
            <span>Enlarge</span>
          </button>
        </div>
      </Card>

      {/* Lightbox Overlay */}
      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged issue photograph"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in-50"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            aria-label="Close enlarged image view"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          >
            <X className="size-6" aria-hidden="true" />
          </button>

          <div
            className="max-w-4xl max-h-[85vh] relative overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Enlarged photograph for report ${reference}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
