import { type NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { updateReportStatus } from "@/services/status.service";
import { getReportById } from "@/services/report-query.service";
import { successResponse, errorResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR", "Malformed JSON body");
    }

    const { status, remark, resolutionImageId, version } = body;

    const afterImagePath = resolutionImageId?.startsWith("resolution-drafts/")
      ? resolutionImageId
      : resolutionImageId
      ? `resolution-drafts/${admin.id}/${id}/${resolutionImageId}`
      : undefined;

    await updateReportStatus(
      id,
      {
        status,
        notes: remark,
        after_image_path: afterImagePath,
      },
      admin
    );

    const updated = await getReportById(id, admin);
    const newVersion = (typeof version === "number" ? version : 1) + 1;

    return successResponse({
      report: updated,
      version: newVersion,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
