import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/domain";

type ApiPath = `/api/${string}`;
type Endpoint = { method: "GET" | "POST" | "PATCH"; path: ApiPath };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isApiError(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = value.error;
  return !!error && typeof error === "object"
    && "code" in error && typeof error.code === "string"
    && "message" in error && typeof error.message === "string";
}

/** Browser transport. The backend contract wraps every successful payload in data. */
export async function apiRequest<TResponse, TBody = never>(
  endpoint: Endpoint,
  options: { body?: TBody; signal?: AbortSignal; query?: URLSearchParams } = {},
): Promise<TResponse> {
  if (!endpoint.path.startsWith("/api/")) throw new TypeError("Expected a relative API path.");
  const { body, query, signal } = options;
  if (endpoint.method === "GET" && body !== undefined) {
    throw new TypeError("GET requests cannot include a body.");
  }

  const headers = new Headers({ Accept: "application/json" });
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const separator = endpoint.path.includes("?") ? "&" : "?";
  const path = query?.size ? endpoint.path + separator + query.toString() : endpoint.path;
  let response: Response;
  let envelope: unknown;
  try {
    response = await fetch(path, {
      method: endpoint.method,
      mode: "same-origin",
      credentials: "same-origin",
      headers,
      body: payload,
      signal,
    });
    const text = await response.text();
    if (text) {
      try {
        envelope = JSON.parse(text);
      } catch {
        // Gateways can send HTML or plain text. Keep those out of user-facing errors.
      }
    }
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach CivicPulse. Try again.");
  }

  if (isApiError(envelope)) {
    const { code, message, details } = envelope.error;
    throw new ApiError(response.status, code, message, details);
  }
  if (!response.ok) {
    throw new ApiError(response.status, "HTTP_ERROR", `Request failed (HTTP ${response.status}).`);
  }
  if (!envelope || typeof envelope !== "object" || !("data" in envelope)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  }
  return (envelope as ApiSuccessResponse<TResponse>).data;
}
