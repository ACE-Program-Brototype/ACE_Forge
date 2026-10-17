import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger.js";

// Extend Express Request interface to include request ID and timing
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: bigint;
    }
  }
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Assign or propagate correlation Request ID
  const incomingId = req.headers["x-request-id"];
  const requestId =
    typeof incomingId === "string" && incomingId.trim()
      ? incomingId.trim()
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const start = process.hrtime.bigint();
  req.startTime = start;

  // 2. Capture response completion
  res.on("finish", () => {
    // Avoid spamming log aggregators with frequent /health checks unless debugging
    if (req.path === "/health" && res.statusCode === 200) {
      return;
    }

    const end = process.hrtime.bigint();
    const durationMs = Math.round(Number(end - start) / 10_000) / 100; // 2 decimal precision

    const meta: Record<string, unknown> = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
      userAgent: req.get("user-agent") || "unknown",
      context: "HTTP",
    };

    // Attach user information if authenticated
    const anyReq = req as any;
    if (anyReq.admin) {
      meta.userId = anyReq.admin.id;
      meta.userRole = anyReq.admin.role;
      meta.userType = "ADMIN";
    } else if (anyReq.student) {
      meta.userId = anyReq.student.id;
      meta.userType = "STUDENT";
    }

    const logMessage = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${durationMs}ms`;

    if (res.statusCode >= 500) {
      logger.error(logMessage, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage, meta);
    } else {
      logger.info(logMessage, meta);
    }
  });

  next();
}

export default requestLogger;
