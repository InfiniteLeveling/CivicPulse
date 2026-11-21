const errorStatuses = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof errorStatuses;

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly publicMessage: string;

  // publicMessage is client-facing copy. Keep diagnostic detail in cause.
  constructor(code: ErrorCode, publicMessage: string, options?: ErrorOptions) {
    super(publicMessage, options);
    this.name = "AppError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = errorStatuses[code];
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("INTERNAL_SERVER_ERROR", "An unexpected error occurred.", { cause: error });
}
