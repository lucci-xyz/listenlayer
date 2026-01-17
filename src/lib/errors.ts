/**
 * Error handling utilities for API routes.
 * Provides consistent error responses and sanitization for production.
 */

import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Standard API error class with status code.
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Common API errors with predefined messages and status codes.
 */
export const Errors = {
  Unauthorized: () => new ApiError("Unauthorized", 401, "UNAUTHORIZED"),
  Forbidden: () => new ApiError("Forbidden", 403, "FORBIDDEN"),
  NotFound: (resource = "Resource") =>
    new ApiError(`${resource} not found`, 404, "NOT_FOUND"),
  BadRequest: (message = "Invalid request") =>
    new ApiError(message, 400, "BAD_REQUEST"),
  RateLimit: () => new ApiError("Too many requests", 429, "RATE_LIMITED"),
  InternalError: (message = "Internal server error") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),
  ServiceUnavailable: (service = "Service") =>
    new ApiError(`${service} unavailable`, 503, "SERVICE_UNAVAILABLE"),
  PaymentRequired: (message = "Payment required") =>
    new ApiError(message, 402, "PAYMENT_REQUIRED"),
};

/**
 * Sanitize an error message for production.
 * Removes stack traces and sensitive information.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    // In production, return generic messages for unknown errors
    if (isProduction) {
      // Allow specific safe error messages through
      const safePatterns = [
        /^Invalid/i,
        /^Missing/i,
        /^Not found/i,
        /^Unauthorized/i,
        /^Forbidden/i,
        /^Rate limit/i,
        /not configured/i,
        /not allowed/i,
      ];

      if (safePatterns.some((pattern) => pattern.test(error.message))) {
        return error.message;
      }

      return "An unexpected error occurred";
    }

    return error.message;
  }

  return isProduction ? "An unexpected error occurred" : String(error);
}

/**
 * Create a standardized error response.
 */
export function errorResponse(
  error: unknown,
  defaultStatus = 500
): NextResponse {
  const message = sanitizeErrorMessage(error);
  const status = error instanceof ApiError ? error.status : defaultStatus;
  const code = error instanceof ApiError ? error.code : undefined;

  return NextResponse.json(
    {
      error: message,
      ...(code && !isProduction ? { code } : {}),
    },
    { status }
  );
}

/**
 * Wrap an async API handler with consistent error handling.
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch((error) => {
    return errorResponse(error);
  });
}

/**
 * Type guard for checking if an error is an ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract safe error details for logging (not for client responses).
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  name: string;
  stack?: string;
  status?: number;
  code?: string;
} {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      name: error.name,
      stack: isProduction ? undefined : error.stack,
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: isProduction ? undefined : error.stack,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}
