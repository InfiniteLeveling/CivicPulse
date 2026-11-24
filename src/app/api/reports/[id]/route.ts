import { NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getReportDetailsServerData } from "@/lib/reports/server-queries";
import { getReportById } from "@/services/report-query.service";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { reportIdParamSchema } from "@/validators/report-query.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/:id
 *
 * Complaint detail retrieval endpoint.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const validationResult = reportIdParamSchema.safeParse(resolvedParams);
    if (!validationResult.success) {
      const message = validationResult.error.issues[0]?.message || "Invalid complaint ID";
      logger.warn("report.validation_failed", { status: 422 });
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { id } = validationResult.data;

    const caller = await getCurrentUser();
    const [reportDetail, mappedDetails] = await Promise.all([
      getReportById(id, caller),
      getReportDetailsServerData(id),
    ]);

    return successResponse(
      {
        ...reportDetail,
        ...mappedDetails,
      },
      {
        status: 200,
        message: "Report details retrieved successfully",
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
