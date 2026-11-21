import { NextResponse } from "next/server";
import type { ApiSuccess, ApiFailure } from "@/types/api";
import { toAppError } from "@/utils/app-error";

export function successResponse<T>(data: T, options: { status?: number; message?: string } = {}) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data, message: options.message },
    { status: options.status ?? 200, headers: { "Cache-Control": "no-store" } },
  );
}

export function errorResponse(error: unknown) {
  const { code, status, publicMessage } = toAppError(error);
  return NextResponse.json<ApiFailure>(
    { success: false, error: { code, message: publicMessage } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
