"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, ArrowRight, AlertCircle, RotateCcw } from "lucide-react";
import type { AIClassifyResult, AIAnalysisStatus, IssueCategory } from "@/types/domain";
import { classifyIssueImage } from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AIAnalysisConsent } from "./AIAnalysisConsent";
import { AIAnalysisLoading } from "./AIAnalysisLoading";
import { AIAnalysisResult } from "./AIAnalysisResult";

interface AIAnalysisPanelProps {
  uploadedImageId: string | null;
  photoFile: File | null;
  currentDescription: string;
  onApplyCategory: (category: IssueCategory) => void;
  onApplyDescription: (description: string) => void;
  onAnalysisIdChange: (analysisId: string | null) => void;
  disabled?: boolean;
}

export function AIAnalysisPanel({
  uploadedImageId,
  photoFile,
  currentDescription,
  onApplyCategory,
  onApplyDescription,
  onAnalysisIdChange,
  disabled = false,
}: AIAnalysisPanelProps) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<AIAnalysisStatus>("idle");
  const [result, setResult] = useState<AIClassifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevPhotoFileRef = useRef<File | null>(photoFile);
  const prevImageIdRef = useRef<string | null>(uploadedImageId);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Invalidate analysis when image changes or is removed
  useEffect(() => {
    if (prevPhotoFileRef.current !== photoFile || prevImageIdRef.current !== uploadedImageId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setResult(null);
      setConsent(false);
      setStatus("idle");
      setErrorMessage(null);
      onAnalysisIdChange(null);
      prevPhotoFileRef.current = photoFile;
      prevImageIdRef.current = uploadedImageId;
    }
  }, [photoFile, uploadedImageId, onAnalysisIdChange]);

  // Clean up in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    toast.info("AI analysis cancelled.");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!uploadedImageId) {
      toast.error("Please upload your photo before requesting AI analysis.");
      return;
    }
    if (!consent) {
      toast.error("Please provide consent to proceed with AI photograph analysis.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("analyzing");
    setErrorMessage(null);

    try {
      const data = await classifyIssueImage(
        {
          imageId: uploadedImageId,
          consent: true,
          descriptionHint: currentDescription,
        },
        { signal: controller.signal }
      );
      setResult(data);
      setStatus("success");
      onAnalysisIdChange(data.analysisId);
      toast.success("AI analysis completed successfully.", {
        description: "Review suggested category and description below.",
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setStatus("error");
      const message =
        err instanceof Error && err.message
          ? err.message
          : "AI analysis is temporarily unavailable. You can still report the issue manually.";
      setErrorMessage(message);
      toast.error("Analysis Unsuccessful", {
        description: message,
      });
    } finally {
      abortControllerRef.current = null;
    }
  }, [uploadedImageId, consent, currentDescription, onAnalysisIdChange]);

  function handleApplySuggestions(applyDescription: boolean) {
    if (!result) return;
    onApplyCategory(result.category);
    if (applyDescription && result.description) {
      onApplyDescription(result.description);
    }
    toast.success("Suggestions applied to your report", {
      description: "You can review and edit these details anytime before final submission.",
    });
  }

  function handleContinueManually() {
    setStatus("idle");
    onAnalysisIdChange(null);
    toast.info("Continuing with manual reporting", {
      description: "AI suggestions were dismissed. Your entered details remain active.",
    });
  }

  // Only render AI panel if a photo has been selected
  if (!photoFile) {
    return null;
  }

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Let AI Help Identify the Issue
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                CivicPulse can analyze your photograph to suggest the issue category, severity, and description.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal shrink-0">
            Smart Vision
          </Badge>
        </div>

        {/* State 1: Analyzing (Loading) */}
        {status === "analyzing" && (
          <AIAnalysisLoading onCancel={handleCancel} />
        )}

        {/* State 2: Success (Results) */}
        {status === "success" && result && (
          <AIAnalysisResult
            result={result}
            hasExistingDescription={Boolean(currentDescription && currentDescription.trim().length > 0)}
            onApplySuggestions={handleApplySuggestions}
            onContinueManually={handleContinueManually}
            onRetry={handleAnalyze}
            disabled={disabled}
          />
        )}

        {/* State 3: Error */}
        {status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground">AI Analysis Unavailable</p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {errorMessage || "AI analysis is temporarily unavailable. You can still report the issue manually."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-destructive/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={disabled}
                className="text-xs gap-1.5 h-8 bg-background"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Retry Analysis</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleContinueManually}
                disabled={disabled}
                className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
              >
                <span>Continue Manually</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* State 4: Idle / Consent Prompt */}
        {(status === "idle" || status === "awaiting_consent" || status === "ready") && (
          <div className="space-y-4">
            <AIAnalysisConsent
              checked={consent}
              onCheckedChange={setConsent}
              disabled={disabled}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-muted-foreground">
                {!uploadedImageId ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Upload your photo before using AI analysis.
                  </span>
                ) : !consent ? (
                  <span>
                    Grant consent above to enable AI analysis, or skip to manual entry.
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Ready to analyze photograph with Gemini AI.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleContinueManually}
                  disabled={disabled}
                  className="text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  <span>Skip AI</span>
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={disabled || !uploadedImageId || !consent}
                  className="text-xs gap-1.5 font-medium h-9 shadow-xs"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>Analyze Image</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
