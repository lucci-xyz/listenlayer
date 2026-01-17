import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

// Redact sensitive fields in production
const redactPaths = isProduction
  ? [
      "email",
      "*.email",
      "user.email",
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "apiKey",
      "*.apiKey",
      "secretKey",
      "*.secretKey",
    ]
  : [];

// Create the logger instance
export const logger = pino({
  level: logLevel,
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  // Use pretty printing in development, JSON in production
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
  // Base context
  base: {
    env: process.env.NODE_ENV,
    app: "listenlayer",
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child loggers for specific modules
export function createLogger(module: string) {
  return logger.child({ module });
}

// Pre-configured loggers for common modules
export const loggers = {
  api: createLogger("api"),
  auth: createLogger("auth"),
  billing: createLogger("billing"),
  episode: createLogger("episode"),
  inngest: createLogger("inngest"),
  stripe: createLogger("stripe"),
};

// Helper to create a request-scoped logger
export function createRequestLogger(
  request: Request,
  module = "api"
): pino.Logger {
  const requestId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-vercel-id") ||
    crypto.randomUUID();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return logger.child({
    module,
    requestId,
    // Only include IP in non-production or redact it
    ...(isProduction ? {} : { ip }),
    method: request.method,
    url: new URL(request.url).pathname,
  });
}

// Utility to safely log errors
export function logError(
  log: pino.Logger,
  error: unknown,
  message: string,
  context?: Record<string, unknown>
) {
  if (error instanceof Error) {
    log.error(
      {
        err: {
          message: error.message,
          name: error.name,
          // Only include stack in non-production
          ...(isProduction ? {} : { stack: error.stack }),
        },
        ...context,
      },
      message
    );
  } else {
    log.error({ err: String(error), ...context }, message);
  }
}

export default logger;
