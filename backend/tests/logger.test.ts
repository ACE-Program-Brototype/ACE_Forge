import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";
import { logger, redactSensitiveData } from "../src/lib/logger.js";
import { requestLogger } from "../src/middleware/request-logger.js";
import type { Request, Response } from "express";

describe("Backend Logging Setup (logger.test.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Sensitive Data Redaction (redactSensitiveData)", () => {
    it("should redact password, token, and secret fields", () => {
      const payload = {
        email: "student@ace.org",
        name: "Aarav Sharma",
        password: "MySecretPassword123!",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        token: "jwt.sample.token.value",
        apiKey: "AIzaSySecretApiKey",
      };

      const redacted = redactSensitiveData(payload) as Record<string, unknown>;

      expect(redacted.email).toBe("student@ace.org");
      expect(redacted.name).toBe("Aarav Sharma");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.passwordHash).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.apiKey).toBe("[REDACTED]");
    });

    it("should redact Bearer authorization header values", () => {
      const headers = {
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "content-type": "application/json",
      };

      const redacted = redactSensitiveData(headers) as Record<string, unknown>;

      expect(redacted.authorization).toBe("[REDACTED]");
      expect(redacted["content-type"]).toBe("application/json");
    });

    it("should recursively redact nested objects and arrays", () => {
      const nested = {
        user: {
          id: "usr_123",
          profile: {
            currentPassword: "OldPassword123!",
            newPassword: "NewPassword456!",
          },
        },
        tokens: ["token_1", "token_2"],
        items: [{ id: "item_1", secret: "super_secret" }],
      };

      const redacted = redactSensitiveData(nested) as any;

      expect(redacted.user.id).toBe("usr_123");
      expect(redacted.user.profile.currentPassword).toBe("[REDACTED]");
      expect(redacted.user.profile.newPassword).toBe("[REDACTED]");
      expect(redacted.items[0].secret).toBe("[REDACTED]");
      expect(redacted.items[0].id).toBe("item_1");
    });

    it("should handle null and primitives safely", () => {
      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();
      expect(redactSensitiveData(42)).toBe(42);
      expect(redactSensitiveData("normal-string")).toBe("normal-string");
    });
  });

  describe("Logger Core Methods", () => {
    it("should log info, warn, error without throwing", () => {
      expect(() => {
        logger.info("Test info message", { context: "TEST", code: 200 });
        logger.warn("Test warning message", { context: "TEST", code: 400 });
        logger.error("Test error message", { context: "TEST", error: new Error("Test failure") });
        logger.debug("Test debug message", { context: "TEST" });
      }).not.toThrow();
    });
  });

  describe("Request Logger Middleware (requestLogger)", () => {
    it("should generate a UUID for req.id and set X-Request-Id response header", () => {
      const req = {
        headers: {},
        method: "GET",
        url: "/api/test",
      } as unknown as Request;

      const setHeaderMock = vi.fn();
      const res = {
        setHeader: setHeaderMock,
        on: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      requestLogger(req, res, next);

      expect(req.id).toBeDefined();
      expect(typeof req.id).toBe("string");
      expect(req.id?.length).toBeGreaterThan(10);
      expect(setHeaderMock).toHaveBeenCalledWith("X-Request-Id", req.id);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should preserve existing incoming X-Request-Id header", () => {
      const existingId = "client-custom-req-id-789";
      const req = {
        headers: { "x-request-id": existingId },
        method: "POST",
        url: "/api/test",
      } as unknown as Request;

      const setHeaderMock = vi.fn();
      const res = {
        setHeader: setHeaderMock,
        on: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      requestLogger(req, res, next);

      expect(req.id).toBe(existingId);
      expect(setHeaderMock).toHaveBeenCalledWith("X-Request-Id", existingId);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("HTTP Integration with Request Tracing", () => {
    it("should return X-Request-Id header on all HTTP responses", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-request-id"]).toBeDefined();
      expect(typeof res.headers["x-request-id"]).toBe("string");
    });

    it("should include requestId in error response JSON when an error occurs", async () => {
      const customId = "trace-error-id-12345";
      const res = await request(app)
        .post("/api/auth/admin/login")
        .set("X-Request-Id", customId)
        .send({}); // triggers validation error

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.requestId).toBe(customId);
      expect(res.headers["x-request-id"]).toBe(customId);
    });
  });
});
