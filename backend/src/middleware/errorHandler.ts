import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AuthError } from "./auth.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: err.issues[0]?.message || "Validation failed",
      details: err.issues,
    });
    return;
  }

  console.error("Unhandled API Error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ success: false, error: message });
}
