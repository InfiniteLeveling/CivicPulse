import type { AuthMeData } from "@/types/auth";
import { requireUser } from "@/services/auth.service";
import { errorResponse, successResponse } from "@/utils/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return successResponse<AuthMeData>(
      {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      },
      { message: "Authenticated" }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
