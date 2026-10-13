import { describe, it, expect } from "vitest";
import { createAdminSchema, updateAdminSchema } from "../src/validators/team";
import { Role } from "@prisma/client";

describe("Team Management & Role Enforcement", () => {
  describe("Zod Validation Schemas", () => {
    it("should accept valid admin creation payload", () => {
      const valid = createAdminSchema.safeParse({
        name: "Navaneeth Sankar",
        email: "navaneeth@aceprogram.org",
        role: "ADMIN",
        password: "TemporaryPassword123!",
      });
      expect(valid.success).toBe(true);
    });

    it("should accept admin creation without explicit password (auto-generation allowed)", () => {
      const valid = createAdminSchema.safeParse({
        name: "Rizwan Ali",
        email: "rizwan@aceprogram.org",
        role: "SUPER_ADMIN",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalid = createAdminSchema.safeParse({
        name: "Test User",
        email: "invalid-email-address",
        role: "ADMIN",
      });
      expect(invalid.success).toBe(false);
    });

    it("should reject password shorter than 8 characters", () => {
      const invalid = createAdminSchema.safeParse({
        name: "Test User",
        email: "test@aceprogram.org",
        role: "ADMIN",
        password: "short",
      });
      expect(invalid.success).toBe(false);
    });

    it("should validate admin status updates", () => {
      const valid = updateAdminSchema.safeParse({
        isActive: false,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Role Hierarchy & Guard Logic", () => {
    function verifyRoleAccess(userRole: Role, allowedRoles?: Role[]): boolean {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      return allowedRoles.includes(userRole);
    }

    it("should allow SUPER_ADMIN for SUPER_ADMIN-only operations", () => {
      const allowed = verifyRoleAccess(Role.SUPER_ADMIN, [Role.SUPER_ADMIN]);
      expect(allowed).toBe(true);
    });

    it("should block ADMIN (employee) for SUPER_ADMIN-only operations", () => {
      const allowed = verifyRoleAccess(Role.ADMIN, [Role.SUPER_ADMIN]);
      expect(allowed).toBe(false);
    });

    it("should allow both ADMIN and SUPER_ADMIN for general admin operations", () => {
      expect(verifyRoleAccess(Role.SUPER_ADMIN, [Role.SUPER_ADMIN, Role.ADMIN])).toBe(true);
      expect(verifyRoleAccess(Role.ADMIN, [Role.SUPER_ADMIN, Role.ADMIN])).toBe(true);
    });
  });
});
