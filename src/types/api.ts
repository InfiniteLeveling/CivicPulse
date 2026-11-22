import type { ErrorCode } from "@/utils/app-error";

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiFailure = { success: false; error: { code: ErrorCode; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthData = { status: "ok"; service: "civicpulse-backend" };
