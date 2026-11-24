import type { NextRequest } from "next/server";
import { requireUser } from "@/services/auth.service";
import { uploadCitizenDraftImage } from "@/services/storage.service";
import type { UploadPurpose } from "@/types/storage";
import { errorResponse, successResponse } from "@/utils/api-response";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { uploadPurposeSchema } from "@/validators/upload.schema";
import { enforceRateLimit } from "@/utils/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller identity via SSR session cookies
    const user = await requireUser();

    // 2. Abuse Prevention: Rate limit citizen draft uploads (max 30 per minute)
    enforceRateLimit(`upload:${user.id}`, 30, 60);

    // 3. Parse multipart form data safely
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      throw new AppError("VALIDATION_ERROR", "Malformed multipart/form-data request body", {
        cause: parseError,
      });
    }

    // 3. Validate form fields
    const files = formData.getAll("file");
    if (files.length === 0) {
      throw new AppError("VALIDATION_ERROR", "A file is required under field 'file'");
    }
    if (files.length > 1) {
      throw new AppError("VALIDATION_ERROR", "Only a single image file is permitted per upload");
    }

    const file = files[0];
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION_ERROR", "Uploaded file is empty or invalid");
    }

    // 4. Validate purpose and enforce RBAC
    const rawPurpose = formData.get("purpose")?.toString() ?? "complaint_before";
    const purposeResult = uploadPurposeSchema.safeParse(rawPurpose);
    if (!purposeResult.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid upload purpose specified");
    }
    const purpose: UploadPurpose = purposeResult.data;

    // Citizens must not submit administrative resolution evidence
    if (purpose === "resolution_after" && user.role !== "admin") {
      logger.warn("storage.access_denied", { status: 403 });
      throw new AppError("FORBIDDEN", "Citizens cannot upload resolution evidence");
    }

    // 5. Convert file to buffer and perform upload via storage service
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const uploadedImage = await uploadCitizenDraftImage(user.id, buffer, file.type);

    const imageId = uploadedImage.storage_path;

    return successResponse(
      {
        imageId,
        image: {
          ...uploadedImage,
          id: imageId,
        },
      },
      { status: 201, message: "Image uploaded successfully" }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
