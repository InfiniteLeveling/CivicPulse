import type { HealthData } from "@/types/api";
import { successResponse } from "@/utils/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return successResponse<HealthData>({ status: "ok", service: "civicpulse-backend" });
}
