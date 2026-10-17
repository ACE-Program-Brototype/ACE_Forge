import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAuthToken, AdminTokenPayload, StudentTokenPayload } from "../lib/jwt.js";
import { Role, Admin, Student } from "@prisma/client";

export const ADMIN_COOKIE_NAME = "ace_admin_token";
export const STUDENT_COOKIE_NAME = "ace_student_token";

export interface AuthenticatedAdminRequest extends Request {
  admin?: Admin;
  adminPayload?: AdminTokenPayload;
}

export interface AuthenticatedStudentRequest extends Request {
  student?: Student;
  studentPayload?: StudentTokenPayload;
}

export interface AuthenticatedRequest extends Request {
  admin?: Admin;
  adminPayload?: AdminTokenPayload;
  student?: Student;
  studentPayload?: StudentTokenPayload;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

function extractToken(req: Request, cookieName: string): string | null {
  // 1. Check cookies
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  // 2. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function getAdminSession(req: Request) {
  const token = extractToken(req, ADMIN_COOKIE_NAME);
  if (!token) return null;

  const payload = await verifyAuthToken<AdminTokenPayload>(token);
  if (!payload || payload.userType !== "ADMIN") return null;

  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      passwordHash: false,
    },
  });

  if (!admin || !admin.isActive) return null;

  return { admin: admin as unknown as Admin, payload };
}

export async function getStudentSession(req: Request) {
  const token = extractToken(req, STUDENT_COOKIE_NAME);
  if (!token) return null;

  const payload = await verifyAuthToken<StudentTokenPayload>(token);
  if (!payload || payload.userType !== "STUDENT") return null;

  const student = await prisma.student.findUnique({
    where: { id: payload.sub },
    include: {
      batch: true,
      currentModule: true,
    },
  });

  if (!student || student.status !== "ACTIVE") return null;

  return { student, payload };
}

/**
 * Express middleware requiring an active Admin, optionally checking specific roles (e.g. SUPER_ADMIN).
 */
export function requireAdmin(allowedRoles?: Role[]) {
  return async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const session = await getAdminSession(req);
      if (!session) {
        res.status(401).json({ success: false, error: "Unauthorized: Admin credentials required" });
        return;
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.admin.role)) {
        res.status(403).json({ success: false, error: "Forbidden: Insufficient privileges" });
        return;
      }

      req.admin = session.admin;
      req.adminPayload = session.payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Express middleware requiring an active Student.
 */
export function requireStudent() {
  return async (req: AuthenticatedStudentRequest, res: Response, next: NextFunction) => {
    try {
      const session = await getStudentSession(req);
      if (!session) {
        res.status(401).json({ success: false, error: "Unauthorized: Student credentials required" });
        return;
      }

      req.student = session.student;
      req.studentPayload = session.payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}
