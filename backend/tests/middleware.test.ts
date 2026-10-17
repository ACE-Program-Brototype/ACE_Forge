import { describe, it, expect, vi } from "vitest";
import { ZodError, z } from "zod";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { AuthError } from "../src/middleware/auth.js";
import { checkRateLimit, resetRateLimit, ipRateLimiter } from "../src/middleware/rate-limiter.js";
import type { Request, Response } from "express";

describe("Middleware Unit Tests (middleware.test.ts)", () => {
  describe("Centralized Error Handler (errorHandler.ts)", () => {
    const mockReq = {} as Request;
    const mockNext = vi.fn();

    it("should format AuthError with custom status code", () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const authErr = new AuthError("Forbidden: Insufficient privileges", 403);
      errorHandler(authErr, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Forbidden: Insufficient privileges",
      });
    });

    it("should format ZodError with 400 and validation details", () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const schema = z.object({
        email: z.string().email("Invalid email format"),
        phone: z.string().min(10, "Phone too short"),
      });

      try {
        schema.parse({ email: "not-an-email", phone: "123" });
      } catch (err) {
        errorHandler(err, mockReq, mockRes, mockNext);
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          details: expect.any(Array),
        })
      );
    });

    it("should format unexpected errors with 500 status code", () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const unexpected = new Error("Database deadlock occurred");
      errorHandler(unexpected, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Database deadlock occurred",
      });
    });
  });

  describe("In-Memory Rate Limiter (rate-limiter.ts)", () => {
    const testKey = "test-rate-key-" + Date.now();

    it("should allow initial attempts within limit", () => {
      resetRateLimit(testKey);

      const r1 = checkRateLimit(testKey, 3, 60000);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(testKey, 3, 60000);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(testKey, 3, 60000);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it("should block request when limit is exceeded", () => {
      const r4 = checkRateLimit(testKey, 3, 60000);
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });

    it("should immediately unblock when resetRateLimit is called", () => {
      resetRateLimit(testKey);
      const afterReset = checkRateLimit(testKey, 3, 60000);
      expect(afterReset.success).toBe(true);
      expect(afterReset.remaining).toBe(2);
    });

    it("ipRateLimiter middleware should call next() when under quota", () => {
      const middleware = ipRateLimiter(10, 60000);
      const req = { ip: "192.168.1.100", socket: {} } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
