import { NextResponse } from "next/server";
import { ZodError, ZodIssue } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

export function apiPaginated<T>(
  items: T[],
  total: number,
  page = 1,
  limit = 50,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json(
    {
      success: true,
      data: items,
      ...(message ? { message } : {}),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}

export function apiError(
  error: string,
  message?: string,
  code = "BAD_REQUEST",
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error,
      message: message || error,
      code,
      ...(details ? { details } : {}),
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function apiValidationError(
  issues: ZodIssue[] | ZodError
): NextResponse<ApiResponse<null>> {
  const issueList = issues instanceof ZodError ? issues.issues : issues;
  const formattedErrors = issueList.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: "Validation Error",
      message: "The submitted payload failed schema validation.",
      code: "VALIDATION_FAILED",
      details: formattedErrors,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: 422 }
  );
}

export function apiUnauthorized(
  message = "Authentication required. Please log in with a valid session."
): NextResponse<ApiResponse<null>> {
  return apiError("Unauthorized", message, "AUTH_REQUIRED", 401);
}

export function apiForbidden(
  message = "Access denied. Insufficient permissions.",
  code = "FORBIDDEN"
): NextResponse<ApiResponse<null>> {
  return apiError("Forbidden", message, code, 403);
}

export function apiIdorBlocked(
  reason = "IDOR Violation: Access to cross-tenant resources is strictly forbidden."
): NextResponse<ApiResponse<null>> {
  return apiError("Forbidden", reason, "IDOR_PREVENTED", 403);
}

export function apiNotFound(resource = "Resource"): NextResponse<ApiResponse<null>> {
  return apiError("Not Found", `${resource} was not found.`, "NOT_FOUND", 404);
}

export function apiInternalError(
  message = "An unexpected internal server error occurred."
): NextResponse<ApiResponse<null>> {
  return apiError("Internal Server Error", message, "INTERNAL_SERVER_ERROR", 500);
}
