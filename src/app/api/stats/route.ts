import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { getOverviewAnalytics } from "@/services/analytics.service";
import { successResponse, errorResponse } from "@/utils/api-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope");
    const user = await getCurrentUser();

    if (scope === "admin") {
      if (user && user.role === "admin") {
        try {
          const overview = await getOverviewAnalytics({}, user);
          return successResponse({
            total: overview.all_time_total_reports,
            pending: overview.current_pending,
            inProgress: overview.current_in_progress,
            resolved: overview.current_resolved,
            resolutionRate: overview.creation_cohort_resolution_rate_percent,
          });
        } catch {
          // Fall back to direct query if RPC unpopulated
        }
      }

      // Direct count fallback for admin
      const supabase = await createSupabaseServerClient();
      const { data: reports } = await supabase.from("reports").select("status");
      const total = reports?.length ?? 0;
      const pending = reports?.filter((r) => r.status === "pending").length ?? 0;
      const inProgress = reports?.filter((r) => r.status === "in_progress").length ?? 0;
      const resolved = reports?.filter((r) => r.status === "resolved").length ?? 0;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : null;

      return successResponse({
        total,
        pending,
        inProgress,
        resolved,
        resolutionRate,
      });
    }

    // Citizen "mine" scope
    const supabase = await createSupabaseServerClient();
    const userId = user?.id;

    if (!userId) {
      return successResponse({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        resolutionRate: null,
      });
    }

    const { data: reports } = await supabase
      .from("reports")
      .select("status")
      .eq("user_id", userId);

    const total = reports?.length ?? 0;
    const pending = reports?.filter((r) => r.status === "pending").length ?? 0;
    const inProgress = reports?.filter((r) => r.status === "in_progress").length ?? 0;
    const resolved = reports?.filter((r) => r.status === "resolved").length ?? 0;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : null;

    return successResponse({
      total,
      pending,
      inProgress,
      resolved,
      resolutionRate,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
