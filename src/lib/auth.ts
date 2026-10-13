import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken, AdminTokenPayload, StudentTokenPayload } from "@/lib/jwt";
import { Role } from "@prisma/client";

export const ADMIN_COOKIE_NAME = "ace_admin_token";
export const STUDENT_COOKIE_NAME = "ace_student_token";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Retrieve verified Admin user from current request cookie.
 */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
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
    },
  });

  if (!admin || !admin.isActive) return null;

  return { admin, payload };
}

/**
 * Enforce that the requester is an active Admin, optionally checking specific roles.
 */
export async function requireAdmin(allowedRoles?: Role[]) {
  const session = await getAdminSession();
  if (!session) {
    throw new AuthError("Unauthorized: Admin credentials required", 401);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.admin.role)) {
    throw new AuthError("Forbidden: Insufficient privileges", 403);
  }

  return session.admin;
}

/**
 * Retrieve verified Student user from current request cookie.
 */
export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken<StudentTokenPayload>(token);
  if (!payload || payload.userType !== "STUDENT") return null;

  const student = await prisma.student.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      batchId: true,
      currentModuleId: true,
      status: true,
      mustChangePassword: true,
      batch: true,
      currentModule: true,
      createdAt: true,
    },
  });

  if (!student || student.status !== "ACTIVE") return null;

  return { student, payload };
}

/**
 * Enforce that the requester is an active Student.
 */
export async function requireStudent() {
  const session = await getStudentSession();
  if (!session) {
    throw new AuthError("Unauthorized: Student credentials required", 401);
  }

  return session.student;
}
