import { describe, it, expect, beforeEach } from "vitest";
import { signAuthToken, verifyAuthToken, AdminTokenPayload, StudentTokenPayload } from "../src/lib/jwt";
import { checkRateLimit, resetRateLimit } from "../src/middleware/rate-limiter";
import { loginSchema, changePasswordSchema } from "../src/validators/auth";
import bcrypt from "bcryptjs";

describe("Authentication & Security Layer", () => {
  describe("Password Hashing & Matching", () => {
    it("should hash a raw password and verify correctly", async () => {
      const password = "+919876543210";
      const hash = await bcrypt.hash(password, 10);
      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    const testKey = "test:user:123";

    beforeEach(() => {
      resetRateLimit(testKey);
    });

    it("should allow attempts within limit and block when exceeded", () => {
      const maxAttempts = 3;
      const windowMs = 5000;

      const r1 = checkRateLimit(testKey, maxAttempts, windowMs);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(testKey, maxAttempts, windowMs);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(testKey, maxAttempts, windowMs);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);

      // Exceeded
      const r4 = checkRateLimit(testKey, maxAttempts, windowMs);
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });

    it("should reset attempts after resetRateLimit", () => {
      checkRateLimit(testKey, 1, 5000);
      const blocked = checkRateLimit(testKey, 1, 5000);
      expect(blocked.success).toBe(false);

      resetRateLimit(testKey);
      const allowed = checkRateLimit(testKey, 1, 5000);
      expect(allowed.success).toBe(true);
    });
  });

  describe("JWT Session Tokens", () => {
    it("should sign and verify AdminTokenPayload", async () => {
      const adminPayload: AdminTokenPayload = {
        sub: "admin-123",
        email: "director@aceprogram.org",
        name: "ACE Director",
        role: "SUPER_ADMIN",
        userType: "ADMIN",
      };

      const token = await signAuthToken(adminPayload);
      expect(typeof token).toBe("string");

      const decoded = await verifyAuthToken<AdminTokenPayload>(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe("admin-123");
      expect(decoded?.role).toBe("SUPER_ADMIN");
      expect(decoded?.userType).toBe("ADMIN");
    });

    it("should sign and verify StudentTokenPayload with mustChangePassword flag", async () => {
      const studentPayload: StudentTokenPayload = {
        sub: "student-456",
        email: "aarav@student.aceprogram.org",
        name: "Aarav Shah",
        mustChangePassword: true,
        userType: "STUDENT",
      };

      const token = await signAuthToken(studentPayload);
      const decoded = await verifyAuthToken<StudentTokenPayload>(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe("student-456");
      expect(decoded?.mustChangePassword).toBe(true);
      expect(decoded?.userType).toBe("STUDENT");
    });
  });

  describe("Zod Validation Schemas", () => {
    it("should validate valid login credentials", () => {
      const valid = loginSchema.safeParse({
        email: "student@aceprogram.org",
        password: "SecretPassword123!",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject invalid email in login", () => {
      const invalid = loginSchema.safeParse({
        email: "not-an-email",
        password: "SecretPassword123!",
      });
      expect(invalid.success).toBe(false);
    });

    it("should reject password change when new and confirm do not match", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewStrongPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password change when new equals current password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "SamePassword123!",
        newPassword: "SamePassword123!",
        confirmPassword: "SamePassword123!",
      });
      expect(result.success).toBe(false);
    });
  });
});
