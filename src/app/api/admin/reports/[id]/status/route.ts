import { type NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { updateReportStatus } from "@/services/status.service";
import { getReportById } from "@/services/report-query.service";
import { enrichReportItems } from "@/lib/reports/server-queries";
import type { RawMappableReport } from "@/lib/reports/mapper";
import { successResponse, errorResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";

export const dynamic = "force-dynamic";

interface StatusUpdateBody {
  status: "pending" | "in_progress" | "resolved";
  remark?: string;
  resolutionImageId?: string | null;
  version?: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    let body: StatusUpdateBody;
    try {
      body = (await request.json()) as StatusUpdateBody;
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
    const [mappedReport] = await enrichReportItems(
      [updated as unknown as RawMappableReport],
      admin.id
    );
    const newVersion = (typeof version === "number" ? version : 1) + 1;

    return successResponse({
      report: mappedReport,
      version: newVersion,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
