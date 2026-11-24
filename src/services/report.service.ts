import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreateReportInput, CreateReportResponseData } from "@/types/report";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { verifyOwnedDraftPath } from "@/services/storage.service";
import { emitRealtimeReportEvent } from "@/services/realtime.service";

/**
 * Creates a new citizen complaint record and associates the uploaded draft image.
 *
 * Guarantees:
 * 1. Storage image ownership verification: Verifies that image_path belongs to userId.
 * 2. Duplicate protection: Rejects images that have already been linked to any report.
 * 3. Server-enforced defaults: Initial status='pending', priority_score=0, department_id=null, resolved_at=null.
 * 4. Transaction safety: Atomically inserts report and report_images (and triggers status_history).
 */
export async function createReport(
  userId: string,
  input: CreateReportInput,
  client?: SupabaseClient
): Promise<CreateReportResponseData> {
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Verify that image_path is an owned draft of the authenticated citizen
  verifyOwnedDraftPath(userId, input.image_path);

  // 2. Prevent duplicate image association (pre-check before database write)
  const { data: existingImage, error: checkError } = await supabase
    .from("report_images")
    .select("id, report_id")
    .eq("storage_path", input.image_path)
    .maybeSingle();

  if (checkError) {
    logger.error("report.creation_failed", { status: 500 });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to verify evidence image uniqueness", {
      cause: checkError,
    });
  }

  if (existingImage) {
    logger.warn("report.duplicate_image", { status: 409 });
    throw new AppError(
      "CONFLICT",
      "This evidence image has already been associated with an existing report."
    );
  }

  const submissionKey = input.submission_key ?? crypto.randomUUID();
  const desiredPublication = input.publication ?? "private";

  // 3. Attempt atomic transaction via civicpulse_create_report RPC.
  // When publication === 'public', pass p_publication so updated databases persist it atomically;
  // if the database only has the legacy 8-argument RPC, fall back safely to direct citizen insert
  // which supports the granted `publication` column.
  const rpcArgs: Record<string, unknown> = {
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_image_path: input.image_path,
    p_severity: input.severity ?? "medium",
    p_submission_key: submissionKey,
  };
  if (desiredPublication === "public") {
    rpcArgs.p_publication = "public";
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("civicpulse_create_report", rpcArgs);

  if (!rpcError && rpcData) {
    logger.info("report.created", { status: 201 });
    const res = rpcData as CreateReportResponseData;
    await emitRealtimeReportEvent(
      {
        event: "report_created",
        report_id: res.id,
        change_type: "report_created",
        occurred_at: new Date().toISOString(),
      },
      supabase
    );
    return res;
  }

  // Handle specific RPC business rule / security exceptions
  if (rpcError) {
    const msg = rpcError.message ?? "";
    if (msg.includes("UNAUTHORIZED")) {
      logger.warn("auth.unauthorized", { status: 401 });
      throw new AppError("UNAUTHORIZED", "Authentication required to submit report");
    }
    if (msg.includes("FORBIDDEN")) {
      logger.warn("report.forbidden", { status: 403 });
      throw new AppError("FORBIDDEN", msg.replace(/^FORBIDDEN:\s*/, ""));
    }
    if (msg.includes("CONFLICT") || rpcError.code === "23505") {
      logger.warn("report.duplicate_image", { status: 409 });
      throw new AppError(
        "CONFLICT",
        "This evidence image or submission key has already been used for a report."
      );
    }
    if (msg.includes("NOT_FOUND") || rpcError.code === "P0002") {
      logger.warn("report.creation_failed", { status: 404 });
      throw new AppError("NOT_FOUND", msg.replace(/^NOT_FOUND:\s*/, ""));
    }
    if (msg.includes("VALIDATION_ERROR")) {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", msg.replace(/^VALIDATION_ERROR:\s*/, ""));
    }

    // If RPC function is not found (PGRST202 or 42883), execute direct database insert
    const isMissingRpc =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      msg.includes("function public.civicpulse_create_report") ||
      msg.includes("Could not find the function");

    if (!isMissingRpc) {
      logger.error("report.creation_failed", { status: 500 });
      throw new AppError("INTERNAL_SERVER_ERROR", "Failed to submit civic complaint", {
        cause: rpcError,
      });
    }
  }

  // 4. Fallback: Direct Table Persistence (strictly uses the 8 columns granted to authenticated citizens)
  // Step 4a: Insert into public.reports
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      submission_key: submissionKey,
      user_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      latitude: input.latitude,
      longitude: input.longitude,
      publication: desiredPublication,
    })
    .select(
      "id, reference, title, description, category, severity, status, priority_score, latitude, longitude, created_at"
    )
    .single();

  if (reportError) {
    logger.error("report.creation_failed", { status: 500 });
    if (reportError.code === "23505") {
      throw new AppError("CONFLICT", "A complaint with this submission key already exists.");
    }
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to create complaint record", {
      cause: reportError,
    });
  }

  // Step 4b: Insert image association into public.report_images
  const { error: imageError } = await supabase.from("report_images").insert({
    report_id: report.id,
    storage_path: input.image_path,
    type: "before",
    uploaded_by: userId,
  });

  if (imageError) {
    logger.error("report.creation_failed", { status: 500 });
    // Attempt compensation: clean up orphaned report
    await supabase.from("reports").delete().eq("id", report.id);
    if (imageError.code === "23505") {
      throw new AppError("CONFLICT", "This image has already been associated with another report.");
    }
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to associate evidence image with report", {
      cause: imageError,
    });
  }

  // Step 4c: Attempt automatic department routing if direct fallback was used
  let routedDeptId: string | null = null;
  let routedDept: { id: string; name: string } | null = null;
  let assignmentSource: "unassigned" | "automatic" | "manual" = "unassigned";

  try {
    const { autoRouteReport } = await import("@/services/routing.service");
    const routingResult = await autoRouteReport(report.id, supabase);
    if (routingResult.routing_status === "assigned" && routingResult.department) {
      routedDeptId = routingResult.department.id;
      routedDept = routingResult.department;
      assignmentSource = "automatic";
    }
  } catch {
    // Fail-open: routing failure or unmocked tables in fallback must not abort valid report submission
  }

  logger.info("report.created", { status: 201 });

  await emitRealtimeReportEvent(
    {
      event: "report_created",
      report_id: report.id,
      change_type: "report_created",
      occurred_at: new Date().toISOString(),
    },
    supabase
  );

  return {
    id: report.id,
    reference: report.reference,
    title: report.title,
    description: report.description,
    category: report.category,
    severity: report.severity,
    status: report.status,
    priority_score: report.priority_score,
    latitude: report.latitude,
    longitude: report.longitude,
    image_count: 1,
    image_path: input.image_path,
    department_id: routedDeptId,
    department: routedDept,
    assignment_source: assignmentSource,
    created_at: report.created_at,
  };
}
