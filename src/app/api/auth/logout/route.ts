import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthLogoutData } from "@/types/auth";
import { errorResponse, successResponse } from "@/utils/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const responseHeaders = new Headers();
    const supabase = await createSupabaseServerClient(responseHeaders);

    const { error } = await supabase.auth.signOut();
    if (error) {
      return errorResponse(error);
    }

    const res = successResponse<AuthLogoutData>(
      { loggedOut: true },
      { message: "Logged out successfully" }
    );

    // Forward updated cookie clearing headers
    responseHeaders.forEach((value, key) => {
      res.headers.append(key, value);
    });

    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
