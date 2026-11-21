import type { NextRequest } from "next/server";
import { requireUser } from "@/services/auth.service";
import { createAuthorizedImageUrl } from "@/services/storage.service";
import type { SignedUrlResponseData } from "@/types/storage";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { signedUrlRequestSchema } from "@/validators/upload.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      throw new AppError("VALIDATION_ERROR", "Invalid JSON request body", { cause: parseError });
    }

    const parsed = signedUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join("; ");
      throw new AppError("VALIDATION_ERROR", message);
    }

    const { storage_path, expires_in_seconds } = parsed.data;

    const result = await createAuthorizedImageUrl(
      user.id,
      storage_path,
      expires_in_seconds,
      user.role === "admin"
    );

    return successResponse<SignedUrlResponseData>(result, {
      message: "Authorized URL generated successfully",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
