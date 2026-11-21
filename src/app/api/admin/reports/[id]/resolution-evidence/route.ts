import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/services/auth.service";
import { uploadAdminResolutionDraftImage } from "@/services/storage.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdParamSchema } from "@/validators/evidence.schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reports/:id/resolution-evidence
 *
 * Dedicated administrator endpoint for uploading resolution (after-repair) evidence.
 *
 * Requirements:
 * - Requires authenticated administrator (requireAdmin).
 * - Validates report ID (UUID v4).
 * - Confirms report exists and is currently in 'in_progress' status.
 * - Enforces strict file validation (magic bytes, JPEG/PNG/WebP, <= 3MB, no executables/SVGs).
 * - Stages draft in private storage path: resolution-drafts/<admin_id>/<report_id>/<image_uuid>.<ext>.
 * - Does NOT mark report as resolved automatically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const idValidation = reportIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      const message = idValidation.error.issues[0]?.message || "Invalid report ID format";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { data: reportId } = idValidation;

    // 1. Privileged operation: requires verified administrator
    const adminUser = await requireAdmin();

    // 2. Verify target report exists and is manageable (status = 'in_progress')
    const supabase = await createSupabaseServerClient();
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, status")
      .eq("id", reportId)
      .maybeSingle();

    if (reportError) {
      logger.error("request.failed", { status: 500 });
      throw new AppError("INTERNAL_SERVER_ERROR", "Failed to verify complaint status", {
        cause: reportError,
      });
    }

    if (!report) {
      logger.warn("report.not_found", { status: 404 });
      throw new AppError("NOT_FOUND", "Complaint not found");
    }

    if (report.status !== "in_progress") {
      logger.warn("evidence.upload_failed", { status: 409 });
      throw new AppError(
        "CONFLICT",
        `Resolution evidence can only be uploaded for complaints in 'in_progress' status. Current status is '${report.status}'.`
      );
    }

    // 3. Parse and validate multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", "Invalid multipart form data");
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", "Missing evidence file in 'file' form field");
    }

    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // 4. Upload to private resolution staging
    const uploadResult = await uploadAdminResolutionDraftImage(
      adminUser.id,
      reportId,
      fileBuffer,
      blob.type,
      supabase
    );

    logger.info("evidence.uploaded", { status: 201 });

    return successResponse(uploadResult, {
      status: 201,
      message: "Resolution evidence uploaded successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
