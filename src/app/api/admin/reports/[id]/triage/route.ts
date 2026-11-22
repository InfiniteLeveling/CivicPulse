import { type NextRequest } from "next/server";
import { requireAdmin } from "@/services/auth.service";
import { assignDepartment } from "@/services/department.service";
import { getReportById } from "@/services/report-query.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

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

    const { departmentId, category, severity, visibility, remark, version } = body;

    const supabase = await createSupabaseServerClient();

    // 1. Assign department if provided
    if (departmentId) {
      try {
        await assignDepartment(
          {
            report_id: id,
            department_id: departmentId,
            reason: remark ?? "Administrative triage update",
          },
          admin,
          supabase
        );
      } catch (err: any) {
        logger.warn("request.failed", { status: 500 });
      }
    }

    // 2. Update category, severity, visibility if specified
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (category) updates.category = category;
    if (severity) updates.severity = severity;
    if (visibility) updates.visibility = visibility;

    const { error: updateError } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.warn("request.failed", { status: 500 });
    }

    // 3. Fetch latest report detail
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
