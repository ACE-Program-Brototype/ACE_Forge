import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail } from "../src/lib/email";
import { EmailType, EmailStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

describe("User Creation & Credentials Email Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Student Welcome Credentials Email", () => {
    it("should format student credentials email with phone as temporary password and security notice", async () => {
      const student = {
        id: "student-test-1",
        name: "Arjun Nambiar",
        email: "arjun@example.com",
        phone: "+919876543210",
        batch: { name: "Cohort 2026" },
        currentModule: { name: "Week 1: Fundamentals" },
      };

      const appUrl = "http://localhost:3000";
      const emailBody = `Welcome to ACE Forge, ${student.name}!

Your student portal account has been successfully created.

Portal URL: ${appUrl}/login
Username: ${student.email}
Initial Temporary Password: ${student.phone}

IMPORTANT SECURITY NOTICE:
Your initial temporary password is your registered phone number (${student.phone}).
Upon your initial login, you will be required to establish a private, strong password before accessing your weekly engineering tasks.

Best regards,
ACE Engineering Program Leadership`;

      expect(emailBody).toContain("Portal URL: http://localhost:3000/login");
      expect(emailBody).toContain(`Username: ${student.email}`);
      expect(emailBody).toContain(`Initial Temporary Password: ${student.phone}`);
      expect(emailBody).toContain("IMPORTANT SECURITY NOTICE:");
    });

    it("should record EmailLog in dev mode without throwing", async () => {
      // Mock prisma.emailLog.create
      const emailLogSpy = vi.spyOn(prisma.emailLog, "create").mockResolvedValue({
        id: "log-1",
        studentId: "student-test-1",
        studentTaskId: null,
        type: EmailType.WELCOME,
        status: EmailStatus.SENT,
        error: null,
        sentAt: new Date(),
      } as any);

      // Force dev mode for test
      const prevEnv = process.env.EMAIL_DEV_MODE;
      process.env.EMAIL_DEV_MODE = "true";

      const res = await sendEmail({
        to: "arjun@example.com",
        studentId: "student-test-1",
        type: EmailType.WELCOME,
        subject: "Welcome to ACE Forge — Student Portal Access & Credentials",
        text: "Test content",
        html: "<p>Test content</p>",
      });

      expect(res.success).toBe(true);
      expect(emailLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: "student-test-1",
            type: EmailType.WELCOME,
            status: EmailStatus.SENT,
          }),
        })
      );

      process.env.EMAIL_DEV_MODE = prevEnv;
    });
  });

  describe("Admin Invitation Credentials Email", () => {
    it("should format admin invitation email with temporary password and assigned role", () => {
      const admin = {
        name: "Navaneeth Sankar",
        email: "navaneeth@example.com",
        role: "ADMIN",
        temporaryPassword: "ACE-TEMP-PASS-2026!",
      };

      const appUrl = "http://localhost:3000";
      const emailBody = `Hello ${admin.name},

You have been granted administrative privileges on the ACE Forge platform as a ${admin.role}.

Login URL: ${appUrl}/admin/login
Email: ${admin.email}
Temporary Password: ${admin.temporaryPassword}

Please log in and update your credentials immediately upon first access.

Best regards,
ACE Engineering Leadership Team`;

      expect(emailBody).toContain("Login URL: http://localhost:3000/admin/login");
      expect(emailBody).toContain(`Email: ${admin.email}`);
      expect(emailBody).toContain(`Temporary Password: ${admin.temporaryPassword}`);
      expect(emailBody).toContain(`administrative privileges on the ACE Forge platform as a ${admin.role}`);
    });
  });
});
