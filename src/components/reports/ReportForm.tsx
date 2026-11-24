"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, RotateCcw, AlertTriangle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  ImageUploadStatus,
  LocationSelection,
  DuplicateCheckStatus,
  DuplicateCandidate,
  ComplaintSummary,
  SubmissionState,
  DuplicateConflictDetails,
} from "@/types/domain";
import {
  reportBasicsSchema,
  ISSUE_CATEGORIES,
  type ReportBasicsFormValues,
} from "@/lib/validation/report";
import { createReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { ReportFormProgress } from "./ReportFormProgress";
import { ReportBasicsFields } from "./ReportBasicsFields";
import { CategorySelector } from "./CategorySelector";
import { ReportVisibilitySelector } from "./ReportVisibilitySelector";
import { ImageUpload } from "./ImageUpload";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { DuplicateCheckPanel } from "./DuplicateCheckPanel";
import { FinalReportReview } from "./FinalReportReview";
import { ReportSuccess } from "./ReportSuccess";

interface ReportFormProps {
  initialCategory?: string;
}

export function ReportForm({ initialCategory }: ReportFormProps = {}) {
  const [viewState, setViewState] = useState<"edit" | "review">("edit");
  const [validatedData, setValidatedData] = useState<ReportBasicsFormValues | null>(null);

  // Phase 8: Image upload & preview state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<ImageUploadStatus>("idle");

  // Phase 9: AI classification state
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // Phase 10: Location selection state
  const [location, setLocation] = useState<LocationSelection | null>(null);

  // Phase 11: Duplicate detection & community support state
  const [duplicateStatus, setDuplicateStatus] = useState<DuplicateCheckStatus>("idle");
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [confirmedSeparateFromIds, setConfirmedSeparateFromIds] = useState<string[]>([]);
  const [supportedCandidate, setSupportedCandidate] = useState<DuplicateCandidate | null>(null);

  // Phase 12: Final submission & success state
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [createdReport, setCreatedReport] = useState<ComplaintSummary | null>(null);
  const [submissionError, setSubmissionError] = useState<{
    state: "error" | "outcome_unknown";
    message: string;
    code?: string;
  } | null>(null);

  const validInitialCategory =
    initialCategory && ISSUE_CATEGORIES.includes(initialCategory as (typeof ISSUE_CATEGORIES)[number])
      ? (initialCategory as (typeof ISSUE_CATEGORIES)[number])
      : undefined;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ReportBasicsFormValues>({
    resolver: zodResolver(reportBasicsSchema),
    defaultValues: {
      title: "",
      description: "",
      category: validInitialCategory,
      visibility: "public",
    },
  });

  const titleValue = useWatch({ control, name: "title" }) || "";
  const descriptionValue = useWatch({ control, name: "description" }) || "";
  const categoryValue = useWatch({ control, name: "category" });
  const visibilityValue = useWatch({ control, name: "visibility" }) || "public";

  const photoUrl = useMemo(() => {
    if (typeof window !== "undefined" && typeof URL.createObjectURL === "function" && photoFile) {
      return URL.createObjectURL(photoFile);
    }
    return null;
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const resetDuplicateState = useCallback(() => {
    setDuplicateStatus("idle");
    setDuplicateCandidates([]);
    setConfirmedSeparateFromIds([]);
    setSupportedCandidate(null);
  }, []);

  const handleLocationChange = useCallback((newLoc: LocationSelection | null) => {
    setLocation(newLoc);
    resetDuplicateState();
  }, [resetDuplicateState]);

  const handleEditSection = useCallback((section: "details" | "photo" | "location" | "duplicates") => {
    setViewState("edit");
    setTimeout(() => {
      let targetId = "section-basics-heading";
      if (section === "photo") targetId = "section-photo-heading";
      if (section === "location") targetId = "section-location-heading";
      if (section === "duplicates") targetId = "section-duplicate-heading";
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const handleSubmitReport = useCallback(async () => {
    if (!validatedData) return;
    if (!uploadedImageId) {
      toast.error("Image upload required", {
        description: "Please attach and upload a photograph before final submission.",
      });
      return;
    }
    if (!location?.confirmed) {
      toast.error("Location confirmation required", {
        description: "Please confirm your issue coordinates on the map before final submission.",
      });
      return;
    }

    setSubmissionState("submitting");
    setSubmissionError(null);

    try {
      const report = await createReport({
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        latitude: location.latitude,
        longitude: location.longitude,
        visibility: validatedData.visibility,
        imageId: uploadedImageId,
        analysisId: analysisId,
        confirmedSeparateFromIds: confirmedSeparateFromIds,
      });

      setCreatedReport(report);
      setSubmissionState("success");
      toast.success("Complaint submitted successfully!", {
        description: `Reference code: ${report.reference || report.id}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      // 1. HTTP 409 DUPLICATE_CANDIDATES conflict
      if (err instanceof ApiError && err.status === 409 && err.code === "DUPLICATE_CANDIDATES") {
        setSubmissionState("duplicate_conflict");
        const details = err.details as DuplicateConflictDetails | undefined;
        const candidates = details?.candidates ?? [];
        if (candidates.length > 0) {
          setDuplicateCandidates(candidates);
          setDuplicateStatus("matches_found");
          setViewState("edit");
          toast.info("Nearby duplicate reports detected", {
            description: "Please review potential existing reports before submitting.",
          });
          setTimeout(() => {
            document.getElementById("section-duplicate-heading")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
          return;
        }
      }

      // 2. NETWORK_ERROR / outcome_unknown
      if (err instanceof ApiError && err.code === "NETWORK_ERROR") {
        setSubmissionState("outcome_unknown");
        setSubmissionError({
          state: "outcome_unknown",
          message: "Network interrupted. Could not verify whether your report reached the server.",
        });
        toast.warning("Submission outcome unknown", {
          description: "Please inspect your citizen dashboard before resubmitting.",
        });
        return;
      }

      // 3. Documented API error or other failure
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred during submission.";
      setSubmissionState("error");
      setSubmissionError({
        state: "error",
        message,
        code: err instanceof ApiError ? err.code : undefined,
      });
      toast.error("Submission unsuccessful", { description: message });
    }
  }, [validatedData, uploadedImageId, location, analysisId, confirmedSeparateFromIds]);

  const handleReportAnother = useCallback(() => {
    reset({
      title: "",
      description: "",
      category: undefined,
      visibility: "public",
    });
    setPhotoFile(null);
    setUploadedImageId(null);
    setUploadStatus("idle");
    setAnalysisId(null);
    setLocation(null);
    setValidatedData(null);
    resetDuplicateState();
    setCreatedReport(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setViewState("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [reset, resetDuplicateState]);

  const hasUnsavedChanges = isDirty || photoFile !== null || location !== null;

  function onValidSubmit(data: ReportBasicsFormValues) {
    setValidatedData(data);
    setViewState("review");
    toast.success("Details validated successfully", {
      description: "Review your complaint before future submission stages.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    if (confirm("Are you sure you want to discard your entered details?")) {
      reset({
        title: "",
        description: "",
        category: undefined,
        visibility: "public",
      });
      setPhotoFile(null);
      setUploadedImageId(null);
      setUploadStatus("idle");
      setAnalysisId(null);
      setLocation(null);
      setValidatedData(null);
      resetDuplicateState();
      setViewState("edit");
      toast.info("Form reset", { description: "All entered fields, attached photos, and locations have been cleared." });
    }
  }

  const handleResetSilently = useCallback(() => {
    reset({
      title: "",
      description: "",
      category: undefined,
      visibility: "public",
    });
    setPhotoFile(null);
    setUploadedImageId(null);
    setUploadStatus("idle");
    setAnalysisId(null);
    setLocation(null);
    setValidatedData(null);
    resetDuplicateState();
    setViewState("edit");
  }, [reset, resetDuplicateState]);

  return (
    <div className="space-y-6">
      {/* 4-Step Progress Indicator */}
      <ReportFormProgress
        currentStep={submissionState === "success" ? 4 : viewState === "edit" ? 1 : 4}
        photoStatus={uploadStatus}
        hasAiAnalysis={Boolean(analysisId)}
        locationStatus={location?.confirmed ? "confirmed" : location ? "selected" : "none"}
        duplicateStatus={duplicateStatus}
        hasConfirmedSeparate={confirmedSeparateFromIds.length > 0}
        isSubmitted={submissionState === "success"}
      />

      {/* 1. Verified Success View */}
      {submissionState === "success" && createdReport ? (
        <ReportSuccess
          report={createdReport}
          photoUrl={photoUrl}
          onReportAnother={handleReportAnother}
        />
      ) : viewState === "review" && validatedData ? (
        /* 2. Final Review View */
        <FinalReportReview
          values={validatedData}
          photo={{
            file: photoFile,
            imageId: uploadedImageId,
            status: uploadStatus,
          }}
          analysisId={analysisId}
          location={location}
          duplicateInfo={{
            status: duplicateStatus,
            confirmedSeparateCount: confirmedSeparateFromIds.length,
            supportedCandidate,
          }}
          onEditSection={handleEditSection}
          onSubmit={handleSubmitReport}
          isSubmitting={submissionState === "submitting"}
          submissionError={submissionError}
          onRetrySubmission={handleSubmitReport}
        />
      ) : (
        /* 3. Form Intake Edit View */
        <form onSubmit={handleSubmit(onValidSubmit)} noValidate className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 sm:p-7 space-y-8">
              {/* Section 1: Basic Fields (Title & Description) */}
              <section aria-labelledby="section-basics-heading" className="space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h2 id="section-basics-heading" className="text-base font-semibold text-foreground">
                    1. Problem Summary
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Provide a clear title and description of the infrastructure issue
                  </p>
                </div>

                <ReportBasicsFields
                  register={register}
                  errors={errors}
                  titleValue={titleValue}
                  descriptionValue={descriptionValue}
                  disabled={isSubmitting}
                />
              </section>

              {/* Section 2: Category Selector */}
              <section aria-labelledby="section-category-heading" className="space-y-4 pt-4 border-t border-border/60">
                <div className="border-b border-border/60 pb-3">
                  <h2 id="section-category-heading" className="text-base font-semibold text-foreground">
                    2. Issue Categorization
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Categorizing helps route your report to the responsible city department
                  </p>
                </div>

                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <CategorySelector
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        resetDuplicateState();
                      }}
                      error={errors.category?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </section>

              {/* Section 3: Visibility Selector */}
              <section aria-labelledby="section-visibility-heading" className="space-y-4 pt-4 border-t border-border/60">
                <div className="border-b border-border/60 pb-3">
                  <h2 id="section-visibility-heading" className="text-base font-semibold text-foreground">
                    3. Visibility & Privacy
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose whether community members can see and support this complaint
                  </p>
                </div>

                <Controller
                  name="visibility"
                  control={control}
                  render={({ field }) => (
                    <ReportVisibilitySelector
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        resetDuplicateState();
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </section>

              {/* Section 4: Photo Evidence (Phase 8 Active) */}
              <section aria-labelledby="section-photo-heading" className="space-y-4 pt-4 border-t border-border/60">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <div>
                    <h2 id="section-photo-heading" className="text-base font-semibold text-foreground">
                      4. Photograph of Problem
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Attach a clear photo to help authorities diagnose and repair the issue
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    Phases 8 & 9 Active
                  </Badge>
                </div>

                <ImageUpload
                  file={photoFile}
                  uploadedImageId={uploadedImageId}
                  status={uploadStatus}
                  onFileChange={(newFile) => {
                    setPhotoFile(newFile);
                    if (!newFile) {
                      setUploadedImageId(null);
                      setUploadStatus("idle");
                      setAnalysisId(null);
                    }
                  }}
                  onUploadSuccess={(res) => {
                    setUploadedImageId(res.imageId);
                  }}
                  onStatusChange={(status) => {
                    setUploadStatus(status);
                  }}
                  disabled={isSubmitting}
                />

                {/* Phase 9: AI Image Analysis & Classification */}
                <AIAnalysisPanel
                  uploadedImageId={uploadedImageId}
                  photoFile={photoFile}
                  currentDescription={descriptionValue}
                  onApplyCategory={(category) => {
                    setValue("category", category, { shouldValidate: true, shouldDirty: true });
                    resetDuplicateState();
                  }}
                  onApplyDescription={(desc) => {
                    setValue("description", desc, { shouldValidate: true, shouldDirty: true });
                  }}
                  onAnalysisIdChange={setAnalysisId}
                  disabled={isSubmitting}
                />
              </section>

              {/* Section 5: Issue Location & GPS Confirmation */}
              <section aria-labelledby="section-location-heading" className="space-y-4 pt-4 border-t border-border/60">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <div>
                    <h2 id="section-location-heading" className="text-base font-semibold text-foreground">
                      5. Issue Location
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Confirm the exact physical location of the problem for municipal repair crews
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    GPS / Map Pin
                  </Badge>
                </div>

                <LocationPicker
                  location={location}
                  onLocationChange={handleLocationChange}
                  disabled={isSubmitting}
                />
              </section>

              {/* Section 6: Nearby Duplicate Check */}
              <section aria-labelledby="section-duplicate-heading" className="space-y-4 pt-4 border-t border-border/60">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <div>
                    <h2 id="section-duplicate-heading" className="text-base font-semibold text-foreground">
                      6. Nearby Reports &amp; Duplicate Check
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check if neighbors have already reported this problem within 100 meters
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    Spatial Check
                  </Badge>
                </div>

                <DuplicateCheckPanel
                  category={categoryValue}
                  location={location}
                  visibility={visibilityValue}
                  status={duplicateStatus}
                  candidates={duplicateCandidates}
                  confirmedSeparateFromIds={confirmedSeparateFromIds}
                  supportedCandidate={supportedCandidate}
                  onStatusChange={setDuplicateStatus}
                  onCandidatesChange={setDuplicateCandidates}
                  onConfirmedSeparateChange={setConfirmedSeparateFromIds}
                  onSupportedCandidateChange={setSupportedCandidate}
                  onResetForm={handleResetSilently}
                  disabled={isSubmitting}
                />
              </section>

              {/* Section 7: Submission Readiness */}
              <section aria-label="Dispatch readiness section" className="space-y-3 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Final Step: Review &amp; Submit
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    Ready to Submit
                  </Badge>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Send className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">Municipal Dispatch</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Review your issue details, attached evidence photo, and confirmed location before submitting to the responsible municipal department.
                    </p>
                  </div>
                </div>
              </section>

              {/* Action Bar */}
              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-3.5" />
                      <span>Unsaved details</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {hasUnsavedChanges && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Reset</span>
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="default"
                    size="default"
                    loading={isSubmitting}
                    className="w-full sm:w-auto gap-2 font-medium shadow-sm"
                  >
                    <span>Review Details</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
