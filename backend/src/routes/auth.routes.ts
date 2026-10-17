import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { signAuthToken } from "../lib/jwt.js";
import { checkRateLimit, resetRateLimit } from "../middleware/rate-limiter.js";
import {
  ADMIN_COOKIE_NAME,
  STUDENT_COOKIE_NAME,
  getAdminSession,
  getStudentSession,
  requireStudent,
  AuthenticatedStudentRequest,
} from "../middleware/auth.js";
import { loginSchema, changePasswordSchema } from "../validators/auth.js";

export const authRouter = Router();

function getCookieOptions() {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
}

// 1. Admin Login
authRouter.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
        details: parsed.error.issues,
        requestId: req.id,
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const rateLimitKey = `rate:admin:login:${ip}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateCheck.success) {
      logger.warn(`Admin login rate limited for ${email} from ${ip}`, { email, ip, context: "AUTH" });
      res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
      });
      return;
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      logger.warn(`Admin login failed: inactive or unknown account for ${email}`, { email, ip, context: "AUTH" });
      res.status(401).json({ success: false, error: "Invalid admin credentials" });
      return;
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!isValidPassword) {
      logger.warn(`Admin login failed: invalid password for ${email}`, { email, ip, context: "AUTH" });
      res.status(401).json({ success: false, error: "Invalid admin credentials" });
      return;
    }

    resetRateLimit(rateLimitKey);
    logger.info(`Admin login successful: ${email} (${admin.role})`, {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      context: "AUTH",
    });

    const token = await signAuthToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      userType: "ADMIN",
    });

    res.cookie(ADMIN_COOKIE_NAME, token, getCookieOptions());

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred during admin authentication",
    });
  }
});

// 2. Admin Logout
authRouter.post("/admin/logout", (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ success: true, message: "Logged out successfully" });
});

// 3. Student Login
authRouter.post("/student/login", async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || "Validation failed",
        details: parsed.error.issues,
        requestId: req.id,
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const rateLimitKey = `rate:student:login:${ip}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateCheck.success) {
      logger.warn(`Student login rate limited for ${email} from ${ip}`, { email, ip, context: "AUTH" });
      res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
      });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { email },
    });

    if (!student || student.status !== "ACTIVE") {
      logger.warn(`Student login failed: inactive or unknown account for ${email}`, { email, ip, context: "AUTH" });
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, student.passwordHash);
    if (!isValidPassword) {
      logger.warn(`Student login failed: invalid password for ${email}`, { email, ip, context: "AUTH" });
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    resetRateLimit(rateLimitKey);
    logger.info(`Student login successful: ${email}`, {
      studentId: student.id,
      email: student.email,
      mustChangePassword: student.mustChangePassword,
      context: "AUTH",
    });

    const token = await signAuthToken({
      sub: student.id,
      email: student.email,
      name: student.name,
      mustChangePassword: student.mustChangePassword,
      userType: "STUDENT",
    });

    res.cookie(STUDENT_COOKIE_NAME, token, getCookieOptions());

    res.json({
      success: true,
      token,
      mustChangePassword: student.mustChangePassword,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred during login",
    });
  }
});

// 4. Student Logout
authRouter.post("/student/logout", (_req: Request, res: Response) => {
  res.clearCookie(STUDENT_COOKIE_NAME, { path: "/" });
  res.json({ success: true, message: "Logged out successfully" });
});

// 5. Student Change Password
authRouter.post(
  "/student/change-password",
  requireStudent(),
  async (req: AuthenticatedStudentRequest, res: Response) => {
    try {
      const student = req.student!;
      const parsed = changePasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || "Validation failed",
        });
        return;
      }

      const isCurrentValid = await bcrypt.compare(parsed.data.currentPassword, student.passwordHash);
      if (!isCurrentValid) {
        res.status(400).json({
          success: false,
          error: "The current password you provided is incorrect",
        });
        return;
      }

      if (parsed.data.newPassword === student.phone) {
        res.status(400).json({
          success: false,
          error: "New password cannot be your phone number",
        });
        return;
      }

      const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);

      const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
      });

      const token = await signAuthToken({
        sub: updatedStudent.id,
        email: updatedStudent.email,
        name: updatedStudent.name,
        mustChangePassword: false,
        userType: "STUDENT",
      });

      res.cookie(STUDENT_COOKIE_NAME, token, getCookieOptions());

      logger.info(`Student password changed successfully for ${student.email}`, {
        studentId: student.id,
        email: student.email,
        context: "AUTH",
      });

      res.json({
        success: true,
        token,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: "An unexpected error occurred while updating your password",
      });
    }
  }
);

// 6. Current User Session Check (/api/auth/me)
authRouter.get("/me", async (req: Request, res: Response) => {
  const adminSession = await getAdminSession(req);
  if (adminSession) {
    res.json({
      authenticated: true,
      userType: "ADMIN",
      user: adminSession.admin,
    });
    return;
  }

  const studentSession = await getStudentSession(req);
  if (studentSession) {
    res.json({
      authenticated: true,
      userType: "STUDENT",
      user: studentSession.student,
    });
    return;
  }

  res.json({
    authenticated: false,
    userType: null,
    user: null,
  });
});
