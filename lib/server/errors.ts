import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiError, apiValidationError, apiInternalError, ApiResponse } from "@/lib/server/api-response";
import { logger } from "@/lib/server/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input payload", details?: unknown) {
    super(message, 422, "VALIDATION_FAILED", details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTH_REQUIRED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied. Insufficient permissions", code = "FORBIDDEN") {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class IDORViolationError extends AppError {
  constructor(reason = "IDOR Violation: Access to cross-tenant entity is prohibited") {
    super(reason, 403, "IDOR_PREVENTED");
    this.name = "IDORViolationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Requested resource") {
    super(`${resource} was not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource state conflict or duplicate key") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

/**
 * Universal API Error Handler for Route Handlers
 */
export function handleApiError(err: unknown, context = "API Route"): NextResponse<ApiResponse<null>> {
  if (err instanceof ZodError) {
    logger.warn(`[${context}] Schema Validation Error`, { issues: err.issues });
    return apiValidationError(err);
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${context}] ${err.name}: ${err.message}`, err);
    } else {
      logger.warn(`[${context}] ${err.name}: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
      });
    }
    return apiError(err.name, err.message, err.code, err.statusCode, err.details);
  }

  const errorObj = err instanceof Error ? err : new Error(String(err));
  logger.error(`[${context}] Unhandled Exception: ${errorObj.message}`, errorObj);

  return apiInternalError(
    process.env.NODE_ENV === "development"
      ? errorObj.message
      : "An unexpected error occurred while processing your request."
  );
}
