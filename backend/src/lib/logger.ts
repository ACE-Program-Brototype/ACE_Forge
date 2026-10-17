import winston from "winston";
import { env } from "../config/env.js";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "geminiapikey",
  "githubtoken",
  "jwt_secret",
  "cron_secret",
]);

/**
 * Recursively deep-redacts sensitive fields in objects and arrays.
 */
export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Redact Bearer tokens in headers
    if (obj.toLowerCase().startsWith("bearer ")) {
      return "Bearer [REDACTED]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return redacted;
  }

  return obj;
}

const redactFormat = winston.format((info) => {
  return redactSensitiveData(info) as winston.Logform.TransformableInfo;
});

const isProduction = env.NODE_ENV === "production" || env.LOG_FORMAT === "json";
const isTest = env.NODE_ENV === "test";

const LEVEL_COLORS: Record<string, string> = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[32m",
  http: "\x1b[35m",
  debug: "\x1b[36m",
  reset: "\x1b[0m",
};

const logFormat = isProduction
  ? winston.format.combine(
      redactFormat(),
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      redactFormat(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
        const color = LEVEL_COLORS[String(level).toLowerCase()] || "";
        const reset = LEVEL_COLORS.reset;
        const ctx = context ? `[${context}] ` : "";
        const metaStr =
          Object.keys(meta).length > 0
            ? ` ${JSON.stringify(meta)}`
            : "";
        const stackStr = stack ? `\n${stack}` : "";
        return `${timestamp} ${color}[${String(level).toUpperCase()}]${reset}: ${ctx}${message}${metaStr}${stackStr}`;
      })
    );

export const logger = winston.createLogger({
  level: isTest ? (process.env.LOG_LEVEL || "error") : env.LOG_LEVEL,
  defaultMeta: { service: "ace-forge-backend" },
  format: logFormat,
  transports: [
    new winston.transports.Console({
      silent: isTest && !process.env.TEST_LOGS,
    }),
  ],
});

export default logger;
