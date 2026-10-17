import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AuthError } from "./auth.js";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId =
    req?.id ||
    (req?.headers && (req.headers["x-request-id"] as string)) ||
    "unknown";
  const method = req?.method || "UNKNOWN";
  const path = req?.originalUrl || req?.url || "UNKNOWN";

  if (err instanceof AuthError) {
    logger.warn(`Auth failure: ${err.message}`, {
      requestId,
      method,
      path,
      statusCode: err.statusCode,
      context: "AUTH",
    });
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    const errorMsg = err.issues[0]?.message || "Validation failed";
    logger.warn(`Validation error on ${method} ${path}: ${errorMsg}`, {
      requestId,
      method,
      path,
      issues: err.issues,
      context: "VALIDATION",
    });
    res.status(400).json({
      success: false,
      error: errorMsg,
      details: err.issues,
      requestId,
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error(`Unhandled API Error on ${method} ${path}: ${message}`, {
    requestId,
    method,
    path,
    error: message,
    stack,
    context: "API_ERROR",
  });

  res.status(500).json({
    success: false,
    error: message,
    requestId,
  });
}

export default errorHandler;
